import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import { Card, Button, Input } from "../components/ui";
import StatusBadge from "../components/StatusBadge";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "http://localhost:3000";

const toPublicUrl = (filePath) => {
  if (!filePath) return "";
  const p = String(filePath).replace(/\\/g, "/");
  if (p.startsWith("uploads/")) return `${API_ORIGIN}/${p}`;
  const idx = p.toLowerCase().indexOf("/uploads/");
  if (idx !== -1) return `${API_ORIGIN}/${p.slice(idx + 1)}`;
  return `${API_ORIGIN}/${p}`;
};

export default function EvaluatorPanel() {
  const [tab, setTab] = useState("PENDIENTES"); // PENDIENTES | HISTORIAL
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [p1, p2] = await Promise.all([
        api.get("/evaluator/pending"),
        api.get("/evaluator/history"),
      ]);
      setPending(p1.data || []);
      setHistory(p2.data || []);
    } catch {
      setPending([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredPending = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return pending;
    return pending.filter((p) => {
      return (
        String(p.id).includes(qq) ||
        (p.student?.name || "").toLowerCase().includes(qq) ||
        (p.student?.email || "").toLowerCase().includes(qq) ||
        (p.nrc?.code || "").toLowerCase().includes(qq)
      );
    });
  }, [pending, q]);

  const filteredHistory = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return history;
    return history.filter((p) => {
      return (
        String(p.id).includes(qq) ||
        (p.student?.name || "").toLowerCase().includes(qq) ||
        (p.student?.email || "").toLowerCase().includes(qq) ||
        (p.nrc?.code || "").toLowerCase().includes(qq)
      );
    });
  }, [history, q]);

  const openDoc = async (practiceId, docType) => {
    try {
      const res = await api.get(`/documents/${practiceId}`);
      const docs = res.data || [];
      const d = docs.find((x) => x.type === docType);
      if (!d) return alert(`No existe ${docType} aún.`);
      window.open(toPublicUrl(d.filePath), "_blank");
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo abrir el documento");
    }
  };

  const setEvaluation = async (practiceId, type, newStatus) => {
    let observations = "";
    let grade = null;

    if (newStatus === "OBSERVADO") {
      observations = prompt("Observaciones (obligatorio):") || "";
      if (!observations.trim()) return;
    }

    if (newStatus === "EVALUADO") {
      const g = prompt("Nota (1.0 a 7.0):");
      if (g === null) return;
      grade = Number(g);
      if (Number.isNaN(grade) || grade < 1 || grade > 7) {
        return alert("Nota inválida. Debe ser 1.0 a 7.0");
      }
      observations = prompt("Observaciones (opcional):") || "";
    }

    try {
      await api.patch(`/evaluator/practices/${practiceId}/evaluations/${type}`, {
        status: newStatus,
        grade,
        observations,
      });
      await load();
      alert("Guardado ✅");
    } catch (e) {
      alert(e.response?.data?.error || "Error al guardar evaluación");
    }
  };

  return (
    <AppShell title="Profesor Evaluador">
      <div className="grid gap-4">
        <Card title="Acceso">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={tab === "PENDIENTES" ? "primary" : "secondary"}
              onClick={() => setTab("PENDIENTES")}
            >
              Pendientes
            </Button>
            <Button
              variant={tab === "HISTORIAL" ? "primary" : "secondary"}
              onClick={() => setTab("HISTORIAL")}
            >
              Historial
            </Button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 items-end">
            <div>
              <label className="text-sm text-slate-600">Buscar</label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID, alumno, NRC..." />
            </div>
            <div className="text-sm text-slate-600 md:text-right">
              {tab === "PENDIENTES" ? filteredPending.length : filteredHistory.length} item(s)
            </div>
          </div>
        </Card>

        <Card title={tab === "PENDIENTES" ? "Pendientes por evaluar" : "Historial del semestre"}>
          {loading ? (
            <div className="text-slate-600">Cargando...</div>
          ) : tab === "PENDIENTES" ? (
            filteredPending.length === 0 ? (
              <div className="text-slate-600">No tienes pendientes.</div>
            ) : (
              <div className="grid gap-3">
                {filteredPending.map((p) => (
                  <div key={p.id} className="rounded-2xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          Práctica #{p.id} — {p.student?.name}
                        </div>
                        <div className="text-sm text-slate-600">
                          NRC: <b>{p.nrc?.code}</b> | Tipo: <b>{p.nrc?.practiceType}</b>
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          Estado: <StatusBadge status={p.status} />{" "}
                          <span className="ml-2">
                            Inicio: <StatusBadge status={p.startDocStatus} />
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end">
                        {/* 100H */}
                        {p.pending100 && (
                          <>
                            <Button variant="secondary" onClick={() => openDoc(p.id, "INFORME_100H_WORD")}>
                              Ver 100H
                            </Button>
                            <Button variant="secondary" onClick={() => setEvaluation(p.id, "HORAS_100", "OBSERVADO")}>
                              Observar 100H
                            </Button>
                            <Button variant="primary" onClick={() => setEvaluation(p.id, "HORAS_100", "EVALUADO")}>
                              Evaluar 100H
                            </Button>
                          </>
                        )}

                        {/* FINAL */}
                        {p.pendingFinal && (
                          <>
                            <Button variant="secondary" onClick={() => openDoc(p.id, "INFORME_FINAL_WORD")}>
                              Ver Final
                            </Button>
                            <Button variant="secondary" onClick={() => setEvaluation(p.id, "FINAL", "OBSERVADO")}>
                              Observar Final
                            </Button>
                            <Button variant="primary" onClick={() => setEvaluation(p.id, "FINAL", "EVALUADO")}>
                              Evaluar Final
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-600">
                      100H:{" "}
                      <b>{p.has100 ? (p.ev100?.status || "PENDIENTE") : "No subido"}</b> | Final:{" "}
                      <b>{p.hasFinal ? (p.evFinal?.status || "PENDIENTE") : "No subido"}</b>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredHistory.length === 0 ? (
              <div className="text-slate-600">Aún no tienes historial.</div>
            ) : (
              <div className="grid gap-3">
                {filteredHistory.map((p) => (
                  <div key={p.id} className="rounded-2xl border bg-white p-4">
                    <div className="font-semibold">
                      Práctica #{p.id} — {p.student?.name}
                    </div>
                    <div className="text-sm text-slate-600">
                      NRC: <b>{p.nrc?.code}</b> | Tipo: <b>{p.nrc?.practiceType}</b>
                    </div>

                    <div className="mt-2 text-sm">
                      {(p.evaluations || [])
                        .filter((e) => e.status === "EVALUADO")
                        .map((e) => (
                          <div key={e.id} className="rounded-xl bg-slate-50 border p-3 mt-2">
                            <div>
                              <b>{e.type}</b> — Nota: <b>{e.grade ?? "—"}</b>
                            </div>
                            {e.observations && (
                              <div className="text-slate-700 mt-1">{e.observations}</div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </Card>
      </div>
    </AppShell>
  );
}