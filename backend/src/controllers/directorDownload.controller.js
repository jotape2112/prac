const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const prisma = require("../config/prisma");

function safeFilePart(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveUploadPath(filePath) {
  if (!filePath) return null;

  // Prisma normalmente guarda "uploads/xxxx.pdf"
  const p = String(filePath).replace(/\\/g, "/");

  // Si por alguna razón guardaste path absoluto Windows
  if (p.match(/^[A-Za-z]:\//)) return p.replace(/\//g, path.sep);

  // Normal: "uploads/..."
  return path.join(process.cwd(), p);
}

const downloadInicioPdfForDirectorSign = async (req, res) => {
  try {
    const { practiceId } = req.params;

    // ✅ 1) Traer práctica + alumno (RUT) + celular
    const practice = await prisma.practice.findUnique({
      where: { id: Number(practiceId) },
      select: {
        id: true,
        celular: true,
        student: { select: { name: true, rut: true } },
      },
    });

    if (!practice) return res.status(404).json({ error: "Práctica no encontrada" });

    // ✅ 2) Tomar el último INICIO_PDF subido por el alumno (firmado/timbrado)
    const inicio = await prisma.practiceDocument.findFirst({
      where: { practiceId: Number(practiceId), type: "INICIO_PDF" },
      orderBy: { createdAt: "desc" },
      select: { filePath: true },
    });

    if (!inicio) return res.status(400).json({ error: "No existe INICIO_PDF subido por el estudiante" });

    const absPath = resolveUploadPath(inicio.filePath);
    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(404).json({ error: "Archivo no encontrado" });
    }

    // ✅ 3) Cargar PDF original
    const inputBytes = fs.readFileSync(absPath);
    const pdfDoc = await PDFDocument.load(inputBytes);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Usamos tamaño de la última página como referencia
    const pages = pdfDoc.getPages();
    const last = pages[pages.length - 1];
    const { width, height } = last.getSize();

    // ✅ 4) Agregar página extra con Datos Alumno + Caja Firma Director
    const page = pdfDoc.addPage([width, height]);

    const margin = 45;

    // --- Datos Alumno ---
    let y = height - margin - 10;

    page.drawText("DATOS DEL ALUMNO", {
      x: margin,
      y,
      size: 12,
      font: fontB,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 18;

    const alumnoName = practice.student?.name || "";
    const alumnoRut = practice.student?.rut || "";
    const alumnoCel = practice.celular || "";

    page.drawText(`Nombre: ${alumnoName}`, {
      x: margin,
      y,
      size: 10.5,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 14;

    page.drawText(`RUT: ${alumnoRut}`, {
      x: margin,
      y,
      size: 10.5,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 14;

    page.drawText(`Celular: ${alumnoCel}`, {
      x: margin,
      y,
      size: 10.5,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });

    // --- Caja firma director (abajo) ---
    const boxW = width - margin * 2;
    const boxH = 120;
    const boxY = margin;

    page.drawRectangle({
      x: margin,
      y: boxY,
      width: boxW,
      height: boxH,
      borderWidth: 1,
      borderColor: rgb(0.82, 0.82, 0.82),
    });

    page.drawText("Firma Director / Director de Carrera", {
      x: margin + 10,
      y: boxY + boxH - 18,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText("Fecha: ____ / ____ / ______", {
      x: margin + 10,
      y: boxY + 10,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    const outBytes = await pdfDoc.save();

    // ✅ 5) Nombre del archivo con nombre del alumno
    const alumnoFile = safeFilePart(alumnoName);
    const filename = alumnoFile
      ? `inicio_para_firma_director_${alumnoFile}.pdf`
      : `inicio_para_firma_director_${practiceId}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(Buffer.from(outBytes));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error generando PDF para firma del Director" });
  }
};

module.exports = { downloadInicioPdfForDirectorSign };