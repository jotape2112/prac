import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import { Card, Button, Input } from "../components/ui";

export default function SecretaryStartDocs() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("EN_REVISION_SECRETARIA");
  const [loading, setLoading] = useState(true);

  const statuses = [
    { value: "ALL", label: "Todos" },
    { value: "EN_REVISION_SECRETARIA", label: "En revisión Secretaría" },
    { value: "OBSERVADO_SECRETARIA", label: "Observado Secretaría" },
    { value: "EN_REVISION_COORDINACION", label: "En revisión Coordinación" },
    { value: "OBSERVADO_COORDINACION", label: "Observado Coordinación" },
    { value: "EN_FIRMA_DIRECTOR", label: "En firma Director" },
    { value: "FIRMADO_DIRECTOR", label: "Firmado Director" },
    { value: "PUBLICADO_POR_SECRETARIA", label: "Publicado" },
  ];

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/secretary/start-docs");
      setItems(res.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const check = async (practiceId) => {
    try {
      await api.patch(`/secretary/start-docs/${practiceId}/check-signature`);
      await load();
      alert("Enviado a Coordinación ✅");
    } catch (e) {
      alert(e.response?.data?.error || "Error al validar firma/timbre");
    }
  };

  const openInicioPdf = async (practiceId) => {
    try {
      const res = await api.get(`/practices/${practiceId}/inicio-pdf`, {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" })
      );

      window.open(blobUrl, "_blank");
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo abrir el INICIO_PDF");
    }
  };

  const observe = async (practiceId) => {
    const notes = prompt("Observaciones firma/timbre:");
    if (!notes) return;
    try {
      await api.patch(`/secretary/start-docs/${practiceId}/observe-signature`, {
        notes,
      });
      await load();
      alert("Observación enviada ✅");
    } catch (e) {
      alert(e.response?.data?.error || "Error al observar firma/timbre");
    }
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return (items || []).filter((p) => {
      const matchStatus =
        statusFilter === "ALL" ? true : p.startDocStatus === statusFilter;

      const matchQuery =
        !qq ||
        String(p.id).includes(qq) ||
        (p.student?.name || "").toLowerCase().includes(qq) ||
        (p.student?.email || "").toLowerCase().includes(qq) ||
        (p.nrc?.code || "").toLowerCase().includes(qq) ||
        (p.startDocNotes || "").toLowerCase().includes(qq);

      return matchStatus && matchQuery;
    });
  }, [items, q, statusFilter]);

  return (
    <AppShell title="Secretaría - Revisión Firma/Timbre">
      <div className="grid gap-4">
        <Card title="Bandeja Secretaría">
          <div className="grid gap-2 md:grid-cols-3 items-end">
            <div>
              <label className="text-sm text-slate-600">Buscar</label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ID, alumno, NRC..."
              />
            </div>

            <div>
              <label className="text-sm text-slate-600">Estado</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-sm text-slate-600 md:text-right">
              {filtered.length} pendiente(s)
            </div>
          </div>
        </Card>

        <Card title="Pendientes">
          {loading ? (
            <div className="text-slate-600">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-slate-600">No hay pendientes.</div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((p) => (
                <div key={p.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        Práctica #{p.id} — {p.student?.name}
                      </div>
                      <div className="text-sm text-slate-600">
                        NRC: <b>{p.nrc?.code}</b> | Estado:{" "}
                        <b>{p.startDocStatus}</b>
                      </div>

                      {p.startDocNotes && (
                        <div className="mt-2 text-xs text-red-700">
                          Observación: {p.startDocNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => observe(p.id)}>
                        Observar
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => openInicioPdf(p.id)}
                      >
                        Ver INICIO_PDF
                      </Button>
                      <Button variant="primary" onClick={() => check(p.id)}>
                        Check firma/timbre
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}