import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import { Card, Button, Input } from "../components/ui";

export default function CoordinationStartDocs() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("EN_REVISION_COORDINACION");
  const [loading, setLoading] = useState(true);

  // ===== Modal Asignar Evaluador =====
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPractice, setAssignPractice] = useState(null);

  const [docentes, setDocentes] = useState([]);
  const [docQ, setDocQ] = useState("");
  const [selectedDocenteId, setSelectedDocenteId] = useState("");
  const [loadingDocentes, setLoadingDocentes] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const statuses = [
    { value: "ALL", label: "Todos" },
    { value: "EN_REVISION_COORDINACION", label: "En revisión Coordinación" },
    { value: "OBSERVADO_COORDINACION", label: "Observado Coordinación" },
    { value: "EN_REVISION_SECRETARIA", label: "En revisión Secretaría" },
    { value: "OBSERVADO_SECRETARIA", label: "Observado Secretaría" },
    { value: "EN_FIRMA_DIRECTOR", label: "En firma Director" },
    { value: "FIRMADO_DIRECTOR", label: "Firmado Director" },
    { value: "PUBLICADO_POR_SECRETARIA", label: "Publicado" },
  ];

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/coordination/start-docs");
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

  const approve = async (practiceId) => {
    try {
      await api.patch(`/coordination/start-docs/${practiceId}/approve-functions`);
      await load();
      alert("Enviado al Director ✅");
    } catch (e) {
      alert(e.response?.data?.error || "Error al aprobar funciones");
    }
  };

  const observe = async (practiceId) => {
    const notes = prompt("Observaciones sobre funciones:");
    if (!notes) return;
    try {
      await api.patch(`/coordination/start-docs/${practiceId}/observe-functions`, { notes });
      await load();
      alert("Observación enviada ✅");
    } catch (e) {
      alert(e.response?.data?.error || "Error al observar funciones");
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

  // ===== Abrir modal + cargar docentes =====
  const openAssign = async (practice) => {
    setAssignPractice(practice);
    setAssignOpen(true);
    setDocQ("");
    setSelectedDocenteId("");
    setLoadingDocentes(true);

    try {
      const res = await api.get("/coordination/evaluators");
      setDocentes(res.data || []);
    } catch (e) {
      alert(e.response?.data?.error || "No se pudieron cargar docentes evaluadores");
      setDocentes([]);
    } finally {
      setLoadingDocentes(false);
    }
  };

  const closeAssign = () => {
    setAssignOpen(false);
    setAssignPractice(null);
  };

  const submitAssign = async () => {
    if (!assignPractice?.id) return;
    if (!selectedDocenteId) return alert("Selecciona un docente evaluador.");

    setAssigning(true);
    try {
      await api.patch(
        `/coordination/start-docs/${assignPractice.id}/assign-evaluator`,
        { evaluadorId: Number(selectedDocenteId) }
      );
      alert("Evaluador asignado ✅");
      closeAssign();
      await load();
    } catch (e) {
      alert(e.response?.data?.error || "Error al asignar evaluador");
    } finally {
      setAssigning(false);
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
        (p.funciones || "").toLowerCase().includes(qq) ||
        (p.evaluador?.name || "").toLowerCase().includes(qq);

      return matchStatus && matchQuery;
    });
  }, [items, q, statusFilter]);

  const filteredDocentes = useMemo(() => {
    const qq = docQ.trim().toLowerCase();
    if (!qq) return docentes;
    return (docentes || []).filter((d) => {
      const name = (d.name || "").toLowerCase();
      const email = (d.email || "").toLowerCase();
      return (
        name.includes(qq) ||
        email.includes(qq) ||
        String(d.id || "").includes(qq)
      );
    });
  }, [docentes, docQ]);

  return (
    <AppShell title="Coordinación - Revisión de Funciones">
      <div className="grid gap-4">
        <Card title="Bandeja Coordinación">
          <div className="grid gap-2 md:grid-cols-3 items-end">
            <div>
              <label className="text-sm text-slate-600">Buscar</label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ID, alumno, NRC, funciones, evaluador..."
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
              {filtered.map((p) => {
                const hasEvaluator = !!p.evaluadorId;

                return (
                  <div key={p.id} className="rounded-2xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          Práctica #{p.id} — {p.student?.name}
                        </div>
                        <div className="text-sm text-slate-600">
                          NRC: <b>{p.nrc?.code}</b> | Estado: <b>{p.startDocStatus}</b>
                        </div>

                        <div className="mt-2 text-sm">
                          <span className="text-slate-500">Evaluador: </span>
                          {hasEvaluator ? (
                            <b>{p.evaluador?.name}</b>
                          ) : (
                            <span className="text-red-600 font-semibold">No asignado</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => observe(p.id)}>
                          Observar
                        </Button>

                        <Button variant="secondary" onClick={() => openInicioPdf(p.id)}>
                          Ver INICIO_PDF
                        </Button>

                        <Button variant="secondary" onClick={() => openAssign(p)}>
                          Asignar evaluador
                        </Button>

                        <Button
                          variant="primary"
                          disabled={!hasEvaluator}
                          onClick={() => approve(p.id)}
                          title={!hasEvaluator ? "Debes asignar un evaluador antes de enviar al Director" : ""}
                        >
                          Aprobar y enviar a Director
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                      <div className="text-slate-500">Funciones del alumno</div>
                      <div className="mt-1">
                        {p.funciones || (
                          <span className="text-slate-400">Sin funciones registradas</span>
                        )}
                      </div>
                      {p.funcionesNotes && (
                        <div className="mt-2 text-xs text-red-700">
                          Observación anterior: {p.funcionesNotes}
                        </div>
                      )}
                      {!hasEvaluator && (
                        <div className="mt-2 text-xs text-red-700">
                          * Debes asignar evaluador antes de enviar al Director.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ===== Modal Asignar Evaluador ===== */}
      {assignOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Asignar docente evaluador</h3>
              <button onClick={closeAssign} className="text-slate-500 hover:text-slate-800">
                ✕
              </button>
            </div>

            <div className="mt-2 text-sm text-slate-600">
              Práctica #{assignPractice?.id} — {assignPractice?.student?.name} / NRC {assignPractice?.nrc?.code}
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-sm text-slate-600">Buscar docente</label>
                <Input
                  value={docQ}
                  onChange={(e) => setDocQ(e.target.value)}
                  placeholder="Nombre / email / id"
                />
              </div>

              <div className="rounded-2xl border bg-white p-3">
                {loadingDocentes ? (
                  <div className="text-slate-600 text-sm">Cargando docentes...</div>
                ) : filteredDocentes.length === 0 ? (
                  <div className="text-slate-600 text-sm">Sin resultados</div>
                ) : (
                  <div className="grid gap-2 max-h-56 overflow-auto">
                    {filteredDocentes.map((d) => (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 rounded-xl border p-3 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="evaluador"
                          value={d.id}
                          checked={String(selectedDocenteId) === String(d.id)}
                          onChange={(e) => setSelectedDocenteId(e.target.value)}
                        />
                        <div>
                          <div className="font-medium">{d.name}</div>
                          <div className="text-xs text-slate-500">{d.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeAssign} disabled={assigning}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={submitAssign}
                disabled={assigning || !selectedDocenteId}
              >
                {assigning ? "Asignando..." : "Asignar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}