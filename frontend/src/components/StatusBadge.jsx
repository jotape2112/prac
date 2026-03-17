import React from "react";

const styles = {
  BORRADOR: "bg-slate-200 text-slate-700",
  PROCESSING_DOCUMENT: "bg-amber-100 text-amber-700",
  BORRADOR_AUTO_COMPLETADO: "bg-blue-100 text-blue-700",
  PENDIENTE_SOLICITUD: "bg-indigo-100 text-indigo-700",
  RECHAZADA: "bg-rose-100 text-rose-700",
  APROBADA: "bg-emerald-100 text-emerald-700",
  EN_DESARROLLO: "bg-sky-100 text-sky-700",
  EXTENSION_SOLICITADA: "bg-orange-100 text-orange-700",
  FINALIZADA: "bg-green-200 text-green-800",
  CANCELADA: "bg-gray-200 text-gray-700",
  SUBIDO_POR_ESTUDIANTE: "bg-amber-100 text-amber-700",
  EN_REVISION_SECRETARIA: "bg-blue-100 text-blue-700",
  OBSERVADO_SECRETARIA: "bg-rose-100 text-rose-700",
  VALIDADO_SECRETARIA: "bg-emerald-100 text-emerald-700",
  EN_FIRMA_DIRECTOR: "bg-indigo-100 text-indigo-700",
  FIRMADO_DIRECTOR: "bg-purple-100 text-purple-700",
  PUBLICADO_POR_SECRETARIA: "bg-green-200 text-green-800",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}
