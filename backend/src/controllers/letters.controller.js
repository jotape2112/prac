const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const prisma = require("../config/prisma");

const HOURS = { I: 216, II: 351 };

function fmtDateCL(d = new Date()) {
  const months = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","septiembre","octubre","noviembre","diciembre"
  ];
  return `${String(d.getDate()).padStart(2, "0")} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function wrapText(text, maxChars = 95) {
  const out = [];
  const paragraphs = String(text || "").split("\n");
  for (const p of paragraphs) {
    if (!p.trim()) {
      out.push("");
      continue;
    }
    const words = p.split(/\s+/);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (next.length > maxChars) {
        out.push(line);
        line = w;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
    out.push("");
  }
  return out;
}

const downloadCompanyLetter = async (req, res) => {
  try {
    const { practiceId } = req.params;

    const practice = await prisma.practice.findUnique({
      where: { id: Number(practiceId) },
      select: {
        id: true,
        empresaNombre: true,
        empresaCiudad: true,

        supervisorNombre: true,
        supervisorApellido: true,
        supervisorCargo: true,

        student: { select: { name: true, rut: true } },
        nrc: { select: { practiceType: true } },
      },
    });

    if (!practice) return res.status(404).json({ error: "Práctica no encontrada" });

    const practiceType = practice.nrc?.practiceType; // I / II
    const horas = HOURS[practiceType] ?? 0;

    const alumnoName = String(practice.student?.name || "—").toUpperCase();
    const alumnoRut = String(practice.student?.rut || "—").toUpperCase();
    const carrera = "INGENIERIA EN COMPUTACION E INFORMATICA"; // en mayúsculas
    const practicaTexto = `PRACTICA ${practiceType} (${horas} HORAS CRONOLOGICAS)`; // en mayúsculas

    const supervisorNombreCompleto = `${practice.supervisorNombre || ""} ${practice.supervisorApellido || ""}`.trim();
    const supervisorCargo = String(practice.supervisorCargo || "").trim();

    const empresa = String(practice.empresaNombre || "—").toUpperCase(); // ✅ empresa en mayúsculas
    const ciudad = titleCaseWords(practice.empresaCiudad || "Santiago"); 
    const fecha = fmtDateCL(new Date());

    const directorName = req.user?.name || "Director";

    // PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4

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
        color: opts.color ?? rgb(0, 0, 0),
      });
      y -= opts.gap ?? 16;
    };

    // ✅ escribir segmentos en una misma línea (para “resaltar”)
    // ✅ escribir segmentos con WRAP por ancho (mantiene negrita por segmento)
const drawInlineWrapped = (segments, opts = {}) => {
  const size = opts.size ?? 10.8;
  const gap = opts.gap ?? 14;
  const maxWidth = opts.maxWidth ?? (595.28 - left * 2); // A4 width - márgenes

  let line = [];
  let lineWidth = 0;

  const flushLine = () => {
    if (line.length === 0) return;
    let x = opts.x ?? left;

    for (const seg of line) {
      const txt = String(seg.text ?? "");
      const usedFont = seg.bold ? fontB : font;
      page.drawText(txt, { x, y, size, font: usedFont, color: rgb(0, 0, 0) });
      x += usedFont.widthOfTextAtSize(txt, size);
        }
        y -= gap;
        line = [];
        lineWidth = 0;
    };

    const pushToken = (token, bold) => {
        const usedFont = bold ? fontB : font;
        const w = usedFont.widthOfTextAtSize(token, size);

        // si no cabe, “cerramos” línea y seguimos
        if (lineWidth + w > maxWidth && lineWidth > 0) {
        flushLine();
        }

        line.push({ text: token, bold });
        lineWidth += w;
    };

    // tokenizamos por espacios para poder envolver bien
    for (const seg of segments) {
        const txt = String(seg.text ?? "");
        const bold = !!seg.bold;

        const parts = txt.split(/(\s+)/); // mantiene espacios como tokens
        for (const part of parts) {
        if (!part) continue;
        pushToken(part, bold);
        }
    }

    flushLine();
    };
    // ===== Encabezado  =====
    function titleCaseWords(s) {
        return String(s || "")
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ""))
            .join(" ");
        }
    draw(`${ciudad}, ${fmtDateCL(new Date())}`, { size: 11 });
    y -= 8;

    
    draw("Señor(a)", { size: 11 });
    draw(supervisorNombreCompleto ? supervisorNombreCompleto : "", { size: 11 });

    
    draw(supervisorCargo ? supervisorCargo : "", { size: 11 });

    // Empresa y Presente
    draw(empresa, { bold: true, size: 11, color: rgb(0, 0, 0) }); 
    draw("Presente", { size: 11 });

    y -= 10;

    draw("De mi consideración:", { size: 11 });
    y -= 6;


    drawInlineWrapped(
    [
        { text: "Saludo con especial atención a Ud. y mediante el presente documento agradezco el recibir a nuestro alumno (a) " },
        { text: alumnoName, bold: true },
        { text: " RUT.: ", bold: true},
        { text: alumnoRut, bold: true },
        { text: ", de la carrera de " },
        { text: carrera, bold: true },
        { text: " de la Universidad Andrés Bello, quien cumple con las exigencias académicas para efectuar su " },
        { text: practicaTexto, bold: true },
        { text: ", requisito para continuar su proceso académico." },
    ],
    { size: 10.8, gap: 14, maxWidth: 595.28 - left * 2 } // wrap real por ancho
    );

    y -= 6;

    
    const bodyRest = `Además de las labores que realice el practicante, durante su práctica laboral deberá elaborar un Informe de Práctica que especificará los trabajos realizados, para ser presentado a esta Dirección de Carrera. Por este motivo, solicito tener a bien dar las facilidades para la actividad indicada. Este informe, debe ser presentado junto a un formulario de evaluación de práctica, documento que será entregado en su empresa por el alumno para la evaluación por parte de su supervisor.

Durante la práctica permanecerá vigente el seguro escolar de accidentes de acuerdo a la ley N° 16744, Art. 3°, el cual dispone que están protegidos todos los estudiantes por los accidentes que sufran con ocasión de sus estudios o en la realización de su Práctica Educacional, este seguro no tiene cobertura en caso de enfermedad no profesional. Cabe destacar que el alumno debe cumplir con todas las indicaciones sanitarias vigentes emitidas por empresa, en este periodo.

Esperando una buena acogida y agradeciendo de antemano su gestión, se solicita que su confirmación sea protocolizada por escrito estipulando la fecha de inicio y término de la práctica.

Sin otro particular, saluda atentamente a usted.`;

    const lines = wrapText(bodyRest, 95);
    for (const ln of lines) {
      if (y < 140) break;
      if (!ln) {
        y -= 6;
        continue;
      }
      draw(ln, { size: 10.8, gap: 14, color: rgb(0, 0, 0) });
    }

    y -= 12;

    // ===== Firma  =====
    draw(String(directorName || "Director").toUpperCase(), { bold: true, size: 11 });
    draw("Director(a) de Carrera", { size: 10.5 });
    draw("Ingeniería en Computación e Informática", { size: 10.5 });
    draw("Facultad de Ingeniería", { size: 10.5 });
    draw("Universidad Andrés Bello", { size: 10.5 });

    const bytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="carta_empresa_practica_${practiceId}.pdf"`);
    return res.send(Buffer.from(bytes));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error generando carta a empresa" });
  }
};

module.exports = { downloadCompanyLetter };