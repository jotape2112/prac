const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const HOURS = { I: 216, II: 351 };

function fmtDateCL(d = new Date()) {
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${String(d.getDate()).padStart(2, "0")} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function titleCaseWords(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

// ⚠️ usa tu misma lógica actual (con drawInlineWrapped si ya lo tienes)
async function buildCompanyLetterPdfBytes({ practice, directorName }) {
  const practiceType = practice.nrc?.practiceType;
  const horas = HOURS[practiceType] ?? 0;

  const alumnoName = String(practice.student?.name || "—").toUpperCase();
  const alumnoRut = String(practice.student?.rut || "—").toUpperCase();
  const carrera = "INGENIERIA EN COMPUTACION E INFORMATICA";
  const practicaTexto = `PRACTICA ${practiceType} (${horas} HORAS CRONOLOGICAS)`;

  const empresa = String(practice.empresaNombre || "—").toUpperCase();
  const ciudad = titleCaseWords(practice.empresaCiudad || "Santiago");
  const fecha = fmtDateCL(new Date());

  const supNombre = `${practice.supervisorNombre || ""} ${practice.supervisorApellido || ""}`.trim();
  const supCargo = String(practice.supervisorCargo || "").trim();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const left = 55;
  let y = 795;

  const draw = (txt, opts = {}) => {
    page.drawText(String(txt || ""), {
      x: opts.x ?? left,
      y,
      size: opts.size ?? 11,
      font: opts.bold ? fontB : font,
      color: opts.color ?? rgb(0,0,0),
    });
    y -= opts.gap ?? 16;
  };

  const drawInlineWrapped = (segments, opts = {}) => {
    const size = opts.size ?? 10.8;
    const gap = opts.gap ?? 14;
    const maxWidth = opts.maxWidth ?? (595.28 - left * 2);

    let line = [];
    let lineWidth = 0;

    const flush = () => {
      if (!line.length) return;
      let x = left;
      for (const seg of line) {
        const used = seg.bold ? fontB : font;
        page.drawText(seg.text, { x, y, size, font: used, color: rgb(0,0,0) });
        x += used.widthOfTextAtSize(seg.text, size);
      }
      y -= gap;
      line = [];
      lineWidth = 0;
    };

    const push = (token, bold) => {
      const used = bold ? fontB : font;
      const w = used.widthOfTextAtSize(token, size);
      if (lineWidth + w > maxWidth && lineWidth > 0) flush();
      line.push({ text: token, bold });
      lineWidth += w;
    };

    for (const seg of segments) {
      const parts = String(seg.text || "").split(/(\s+)/);
      for (const p of parts) if (p) push(p, !!seg.bold);
    }
    flush();
  };

  // Header estructura que pediste
  draw(`${ciudad}, ${fecha}`, { size: 11 });
  y -= 8;

  draw("Señor(a)");
  draw(supNombre);
  draw("Encargado(a)");
  draw(supCargo);
  draw(empresa, { bold: true, color: rgb(0,0,0) });
  draw("Presente");

  y -= 10;
  draw("De mi consideración:");
  y -= 6;

  // Párrafo alumno con resaltos
  drawInlineWrapped([
    { text: "Saludo con especial atención a Ud. y mediante el presente documento agradezco el recibir a nuestro alumno(a) " },
    { text: alumnoName, bold: true },
    { text: " RUT.: " },
    { text: alumnoRut, bold: true },
    { text: ", de la carrera de " },
    { text: carrera, bold: true },
    { text: " de la Universidad Andrés Bello, quien cumple con las exigencias académicas para efectuar su " },
    { text: practicaTexto, bold: true },
    { text: ", requisito para continuar su proceso académico." },
  ], { size: 10.8, gap: 16 });

  y -= 6;

  // Aquí pega TU bodyRest actual (no lo cambio)
  const bodyRest = `...`; // <- deja tu texto tal cual
  const lines = bodyRest.split("\n");
  for (const ln of lines) {
    if (!ln.trim()) { y -= 6; continue; }
    draw(ln, { size: 10.8, gap: 14 });
  }

  y -= 12;
  draw(String(directorName || "Director").toUpperCase(), { bold: true, size: 11 });
  draw("Director(a) de Carrera", { size: 10.5 });
  draw("Ingeniería en Computación e Informática", { size: 10.5 });
  draw("Facultad de Ingeniería", { size: 10.5 });
  draw("Universidad Andrés Bello", { size: 10.5 });

  return await pdfDoc.save();
}

module.exports = { buildCompanyLetterPdfBytes };