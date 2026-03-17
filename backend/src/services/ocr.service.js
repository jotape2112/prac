const pdfParse = require("pdf-parse");
const fs = require("fs");
const Tesseract = require("tesseract.js");

const extractText = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);

  if (data.text && data.text.trim().length > 50) {
    return data.text;
  }

  // Fallback OCR
  const { data: { text } } = await Tesseract.recognize(filePath, 'spa');
  return text;
};

const parseFields = (text) => {
  const getMatch = (regex) => {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  return {
    empresaNombre: getMatch(/Nombre:\s*(.*)/i),
    empresaDireccion: getMatch(/Dirección Empresa:\s*(.*)/i),
    supervisorNombre: getMatch(/Nombre de la persona a cargo o supervisor:\s*(.*)/i),
    fechaInicio: getMatch(/Fecha Inicio Práctica:\s*(.*)/i),
    fechaFin: getMatch(/Fecha Término Práctica:\s*(.*)/i),
  };
};

module.exports = { extractText, parseFields };