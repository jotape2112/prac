const ExcelJS = require("exceljs");
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

const normalizeEmail = (v) => String(v || "").trim().toLowerCase();
const normalizeNrc = (v) => String(v || "").trim();

// ✅ Normaliza headers: quita tildes, espacios duplicados, etc.
const normHeader = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/\s+/g, " "); // colapsa espacios

let defaultPasswordHash = null; // ✅ para que upsertStudent/upsertDocente lo puedan usar

/**
 * Detecta una fila de encabezados dentro de las primeras N filas.
 * Retorna { headerRow, colMap } donde colMap es { HEADER_NORMALIZADO: colNumber }
 *
 * - Hace matching por normalización (tildes, espacios)
 * - Requiere al menos 2 headers (o 1 si expectedHeaders = 1)
 */
function findHeaderRowAndMap(worksheet, expectedHeaders, scanRows = 25) {
  const expectedNorm = expectedHeaders.map(normHeader);

  for (let r = 1; r <= scanRows; r++) {
    const row = worksheet.getRow(r);
    const map = {};

    row.eachCell((cell, colNumber) => {
      const key = normHeader(cell.text || cell.value || "");
      if (key) map[key] = colNumber;
    });

    const hits = expectedNorm.filter((h) => map[h]).length;
    const minHits = Math.min(2, expectedNorm.length); // si expected=1 -> minHits=1
    if (hits >= minHits) return { headerRow: r, colMap: map };
  }
  return null;
}

function sheetToPracticeType(sheetName) {
  if (sheetName === "TODOS PI" || sheetName === "TODOS PI-FORMATIVAS") return "I";
  if (sheetName === "TODOS PII" || sheetName === "TODOS PII-FORMATIVAS") return "II";
  return sheetName.includes("PII") ? "II" : "I";
}

// ✅ ahora recibe rut y lo guarda en User.rut
async function upsertStudent(email, name, rut) {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: name || undefined,
      rut: rut || undefined, // ✅ si viene, actualiza
      role: "ESTUDIANTE",
      active: true,
    },
    create: {
      name: name || email,
      email,
      rut: rut || null, // ✅
      password: defaultPasswordHash,
      role: "ESTUDIANTE",
      active: true,
    },
    select: { id: true },
  });

  return { user, existed: Boolean(existing) };
}

async function upsertDocente(email, name) {
  if (!email) return { user: null, existed: false };

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: name || undefined,
      role: "DOCENTE",
      active: true,
    },
    create: {
      name: name || email,
      email,
      password: defaultPasswordHash,
      role: "DOCENTE",
      active: true,
    },
    select: { id: true, email: true },
  });

  return { user, existed: Boolean(existing) };
}

const importPeriodExcel = async (req, res) => {
  const periodId = Number(req.params.periodId);
  defaultPasswordHash = await bcrypt.hash("123456", 10);

  if (!periodId) return res.status(400).json({ error: "periodId inválido" });
  if (!req.file) return res.status(400).json({ error: "Archivo .xlsx requerido (field: file)" });

  const report = {
    createdUsers: 0,
    updatedUsers: 0,
    createdNrcs: 0,
    updatedNrcs: 0,
    createdEnrollments: 0,
    updatedFormativeFlags: 0,
    nonOfficialNrcs: [],
    docenteConflicts: [],
    errors: [],
  };

  try {
    const period = await prisma.period.findUnique({
      where: { id: periodId },
      select: { id: true, name: true },
    });
    if (!period) return res.status(404).json({ error: "Periodo no encontrado" });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);

    // 2) Hoja 202520: NRC oficiales
    const wsOfficial = workbook.getWorksheet("202520");
    if (!wsOfficial) {
      return res.status(400).json({ error: 'No se encontró la hoja "202520"' });
    }

    // ✅ aumentamos scanRows por si el header está más abajo
    const officialHeader = findHeaderRowAndMap(wsOfficial, ["NRC"], 120);
    if (!officialHeader || !officialHeader.colMap[normHeader("NRC")]) {
      return res.status(400).json({ error: 'No se encontró columna "NRC" en hoja 202520' });
    }

    const officialNrcCol = officialHeader.colMap[normHeader("NRC")];
    const officialNrcSet = new Set();

    for (let r = officialHeader.headerRow + 1; r <= wsOfficial.rowCount; r++) {
      const row = wsOfficial.getRow(r);
      const nrc = normalizeNrc(row.getCell(officialNrcCol).text || row.getCell(officialNrcCol).value);
      if (nrc) officialNrcSet.add(nrc);
    }

    // 3) Procesar TODOS PI / TODOS PII
    const sheetsTodos = ["TODOS PI", "TODOS PII"];

    // ✅ agregamos RUT y normalizamos CORREO ELECTRONICO con o sin tilde
    const expectedTodos = ["NRC", "CORREO ELECTRONICO", "NOMBRE", "RUT", "CORREO DOCENTE", "DOCENTE"];

    const seenDocenteByNrc = new Map();

    for (const sheetName of sheetsTodos) {
      const ws = workbook.getWorksheet(sheetName);
      if (!ws) {
        report.errors.push({ sheet: sheetName, row: null, reason: "Hoja no encontrada" });
        continue;
      }

      // ✅ escaneamos más filas por el encabezado institucional arriba
      const header = findHeaderRowAndMap(ws, expectedTodos, 120);
      if (!header) {
        report.errors.push({ sheet: sheetName, row: null, reason: "No se detectaron encabezados esperados" });
        continue;
      }

      const col = header.colMap;
      const practiceType = sheetToPracticeType(sheetName);

      const NRC = col[normHeader("NRC")];
      const EMAIL = col[normHeader("CORREO ELECTRONICO")] || col[normHeader("CORREO ELECTRÓNICO")];
      const NOMBRE = col[normHeader("NOMBRE")];
      const RUT = col[normHeader("RUT")];
      const CORREO_DOCENTE = col[normHeader("CORREO DOCENTE")];
      const DOCENTE = col[normHeader("DOCENTE")];

      for (let r = header.headerRow + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);

        const nrcCode = normalizeNrc(row.getCell(NRC).text || row.getCell(NRC).value);
        const studentEmail = normalizeEmail(row.getCell(EMAIL).text || row.getCell(EMAIL).value);
        const studentName = String(row.getCell(NOMBRE).text || row.getCell(NOMBRE).value || "").trim();
        const studentRut = RUT ? String(row.getCell(RUT).text || row.getCell(RUT).value || "").trim() : "";

        const docenteEmail = CORREO_DOCENTE
          ? normalizeEmail(row.getCell(CORREO_DOCENTE).text || row.getCell(CORREO_DOCENTE).value)
          : "";
        const docenteName = DOCENTE
          ? String(row.getCell(DOCENTE).text || row.getCell(DOCENTE).value || "").trim()
          : "";

        // fin de tabla
        if (!nrcCode && !studentEmail && !studentName && !studentRut) continue;

        // filas basura arriba/abajo
        if (!nrcCode || !studentEmail || !studentEmail.includes("@")) continue;

        if (!officialNrcSet.has(nrcCode) && !report.nonOfficialNrcs.includes(nrcCode)) {
          report.nonOfficialNrcs.push(nrcCode);
        }

        // ✅ upsert estudiante con RUT
        const { user: student, existed: studentExisted } = await upsertStudent(
          studentEmail,
          studentName,
          studentRut
        );
        if (studentExisted) report.updatedUsers++;
        else report.createdUsers++;

        // docente cátedra (si viene)
        const { user: docente, existed: docenteExisted } = await upsertDocente(docenteEmail, docenteName);
        if (docente) {
          if (docenteExisted) report.updatedUsers++;
          else report.createdUsers++;
        }

        if (!docente) {
          report.errors.push({
            sheet: sheetName,
            row: r,
            reason: "Fila sin CORREO DOCENTE (docente cátedra). En tu schema Nrc.docenteId es obligatorio.",
          });
          continue;
        }

        const existingNrc = await prisma.nrc.findFirst({
          where: { periodId, code: nrcCode, practiceType },
          select: { id: true, docenteId: true },
        });

        let nrcId;
        if (existingNrc) {
          nrcId = existingNrc.id;
          report.updatedNrcs++;

          const key = `${practiceType}:${nrcCode}`;
          const prevEmail = seenDocenteByNrc.get(key);
          if (prevEmail && prevEmail !== docenteEmail) {
            report.docenteConflicts.push({
              nrc: nrcCode,
              practiceType,
              prevDocente: prevEmail,
              newDocente: docenteEmail,
              sheet: sheetName,
              row: r,
            });
          } else if (!prevEmail) {
            seenDocenteByNrc.set(key, docenteEmail);
          }

          if (docente && existingNrc.docenteId !== docente.id) {
            await prisma.nrc.update({
              where: { id: existingNrc.id },
              data: { docenteId: docente.id },
            });
          }
        } else {
          const created = await prisma.nrc.create({
            data: {
              periodId,
              code: nrcCode,
              practiceType,
              docenteId: docente.id,
              active: true,
            },
            select: { id: true },
          });
          nrcId = created.id;
          report.createdNrcs++;

          const key = `${practiceType}:${nrcCode}`;
          if (docenteEmail) seenDocenteByNrc.set(key, docenteEmail);
        }

        const enrollExists = await prisma.enrollment.findFirst({
          where: { periodId, nrcId, studentId: student.id },
          select: { id: true },
        });

        if (!enrollExists) {
          await prisma.enrollment.create({
            data: {
              periodId,
              nrcId,
              studentId: student.id,
              formativesDelivered: false,
            },
          });
          report.createdEnrollments++;
        }
      }
    }

    // 4) Procesar FORMATIVAS
    const sheetsForm = ["TODOS PI-FORMATIVAS", "TODOS PII-FORMATIVAS"];
    const expectedForm = ["NRC", "CORREO ELECTRONICO", "ENTREGO FORMATIVAS"];

    for (const sheetName of sheetsForm) {
      const ws = workbook.getWorksheet(sheetName);
      if (!ws) {
        report.errors.push({ sheet: sheetName, row: null, reason: "Hoja no encontrada" });
        continue;
      }

      const header = findHeaderRowAndMap(ws, expectedForm, 120);
      if (!header) {
        report.errors.push({ sheet: sheetName, row: null, reason: "No se detectaron encabezados esperados" });
        continue;
      }

      const col = header.colMap;
      const practiceType = sheetToPracticeType(sheetName);

      const NRC = col[normHeader("NRC")];
      const EMAIL = col[normHeader("CORREO ELECTRONICO")] || col[normHeader("CORREO ELECTRÓNICO")];
      const ENT = col[normHeader("ENTREGO FORMATIVAS")] || col[normHeader("ENTREGÓ FORMATIVAS")];

      for (let r = header.headerRow + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);

        const nrcCode = normalizeNrc(row.getCell(NRC).text || row.getCell(NRC).value);
        const studentEmail = normalizeEmail(row.getCell(EMAIL).text || row.getCell(EMAIL).value);
        const entrego = String(row.getCell(ENT).text || row.getCell(ENT).value || "").trim();

        if (!nrcCode || !studentEmail) continue;

        const student = await prisma.user.findUnique({
          where: { email: studentEmail },
          select: { id: true },
        });
        if (!student) continue;

        const nrc = await prisma.nrc.findFirst({
          where: { periodId, code: nrcCode, practiceType },
          select: { id: true },
        });
        if (!nrc) continue;

        const delivered =
          entrego === "√" ||
          entrego === "1" ||
          entrego.toLowerCase() === "si" ||
          entrego.toLowerCase() === "sí";

        const updated = await prisma.enrollment.updateMany({
          where: { periodId, nrcId: nrc.id, studentId: student.id },
          data: { formativesDelivered: delivered },
        });

        if (updated.count > 0) report.updatedFormativeFlags += updated.count;
      }
    }

    report.nonOfficialNrcs.sort();

    res.json(report);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al importar Excel", detail: e.message });
  }
};

module.exports = { importPeriodExcel };