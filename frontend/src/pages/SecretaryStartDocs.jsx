import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import { Card, Button, Input } from "../components/ui";
import StatusBadge from "../components/StatusBadge";

export default function SecretaryStartDocs() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // modal observar
  const [observeOpen, setObserveOpen] = useState(false);
  const [observeId, setObserveId] = useState(null);
  const [observeNotes, setObserveNotes] = useState("");

  // modal subir firmado
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [signedFile, setSignedFile] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/start-docs/secretary/pending");
      setItems(res.data || []);
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo cargar bandeja de secretaría");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((p) => {
      const matchStatus = statusFilter === "ALL" ? true : p.startDocStatus === statusFilter;

      const matchQuery =
        query === ""
          ? true
          : String(p.id).includes(query) ||
            String(p.studentId).includes(query) ||
            String(p.nrcId).includes(query) ||
            (p.startDocNotes || "").toLowerCase().includes(query);

      return matchStatus && matchQuery;
    });
  }, [items, q, statusFilter]);

  const statuses = useMemo(
    () => [
      "ALL",
      "SUBIDO_POR_ESTUDIANTE",
      "EN_REVISION_SECRETARIA",
      "OBSERVADO_SECRETARIA",
      "VALIDADO_SECRETARIA",
      "EN_FIRMA_DIRECTOR",
      "FIRMADO_DIRECTOR",
      "PUBLICADO_POR_SECRETARIA",
    ],
    []
  );

  const patch = async (url, body) => {
    try {
      await api.patch(url, body);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || "Error realizando acción");
    }
  };

  const onCheck = (practiceId) => patch(`/start-docs/${practiceId}/check`);
  const onSendToDirector = (practiceId) => patch(`/start-docs/${practiceId}/send-to-director`);
  const onPublish = (practiceId) => patch(`/start-docs/${practiceId}/publish`);

  const openObserve = (practiceId) => {
    setObserveId(practiceId);
    setObserveNotes("");
    setObserveOpen(true);
  };

  const submitObserve = async () => {
    if (!observeId) return;
    await patch(`/start-docs/${observeId}/observe`, { notes: observeNotes });
    setObserveOpen(false);
  };

  const openUploadSigned = (practiceId) => {
    setUploadId(practiceId);
    setSignedFile(null);
    setUploadOpen(true);
  };

  const submitUploadSigned = async () => {
    if (!uploadId) return;
    if (!signedFile) return alert("Selecciona el PDF firmado");

    const fd = new FormData();
    fd.append("file", signedFile);
    fd.append("type", "INICIO_FIRMADO_PDF");

    try {
      await api.post(`/documents/${uploadId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Firmado subido");
      setUploadOpen(false);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || "Error al subir firmado");
    }
  };

  return (
    <AppShell title="Secretaría · Inicio de Práctica">
      <div className="grid gap-4">
        <Card title="Bandeja">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm text-slate-600">Buscar (ID, estudiante, NRC, notas)</label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej: 12, 8, NRC..." />
            </div>

            <div>
              <label className="text-sm text-slate-600">Estado inicio</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end justify-between gap-2">
              <Button variant="secondary" onClick={load}>Recargar</Button>
              <div className="text-sm text-slate-600">{filtered.length} item(s)</div>
            </div>
          </div>
        </Card>

        <Card title="Solicitudes de inicio">
          {loading ? (
            <div className="text-slate-600">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-slate-600">No hay solicitudes pendientes.</div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left p-3">Práctica</th>
                    <th className="text-left p-3">Estudiante</th>
                    <th className="text-left p-3">NRC</th>
                    <th className="text-left p-3">Estado inicio</th>
                    <th className="text-left p-3">Notas</th>
                    <th className="text-left p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-slate-50 transition">
                      <td className="p-3 font-medium">#{p.id}</td>
                      <td className="p-3">{p.studentId}</td>
                      <td className="p-3">{p.nrcId}</td>
                      <td className="p-3">
                        <StatusBadge status={p.startDocStatus} />
                      </td>
                      <td className="p-3">{p.startDocNotes || "-"}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {/* si documentoInicio es solo path local, no es clickable desde el navegador sin servir static */}
                          {p.documentoInicio && (
                            <Button
                              variant="secondary"
                              onClick={() => window.open(`http://localhost:3000/${p.documentoInicio}`, "_blank")}
                            >
                              Ver PDF
                            </Button>
                          )}

                          <Button variant="secondary" onClick={() => onCheck(p.id)}>
                            Check
                          </Button>

                          <Button variant="danger" onClick={() => openObserve(p.id)}>
                            Observar
                          </Button>

                          <Button variant="primary" onClick={() => onSendToDirector(p.id)}>
                            Enviar a Director
                          </Button>

                          <Button variant="secondary" onClick={() => openUploadSigned(p.id)}>
                            Subir Firmado
                          </Button>

                          <Button variant="success" onClick={() => onPublish(p.id)}>
                            Inicio de práctica aprobado
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* MODAL OBSERVAR */}
      {observeOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow">
            <h3 className="text-lg font-semibold">Observaciones (Secretaría)</h3>
            <p className="text-sm text-slate-600 mt-1">
              Esto vuelve el inicio a OBSERVADO_SECRETARIA y notifica al estudiante.
            </p>

            <div className="mt-3">
              <label className="text-sm text-slate-600">Detalle</label>
              <textarea
                className="w-full mt-1 rounded-lg border border-slate-200 p-3 text-sm"
                rows={4}
                value={observeNotes}
                onChange={(e) => setObserveNotes(e.target.value)}
                placeholder="Ej: Falta firma empresa, fecha no coincide, etc."
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setObserveOpen(false)}>Cancelar</Button>
              <Button variant="danger" onClick={submitObserve}>Guardar observación</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUBIR FIRMADO */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow">
            <h3 className="text-lg font-semibold">Subir Inicio Firmado (PDF)</h3>
            <p className="text-sm text-slate-600 mt-1">
              Sube el PDF firmado por Director. Luego podrás “Publicar”.
            </p>

            <div className="mt-4">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setSignedFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={submitUploadSigned}>Subir</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}