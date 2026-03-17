import React, { useEffect, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import { Card, Button, Input } from "../components/ui";
import StatusBadge from "../components/StatusBadge";

export default function Practice() {
  const [myPractice, setMyPractice] = useState(null);
  const [loadingPractice, setLoadingPractice] = useState(true);

  const [eligibility, setEligibility] = useState(null);
  const [loadingEligibility, setLoadingEligibility] = useState(true);

  const [nrcId, setNrcId] = useState("");
  const [file, setFile] = useState(null);

  const loadPractice = async () => {
    setLoadingPractice(true);
    try {
      const res = await api.get("/practices/me");
      setMyPractice(res.data);
    } catch {
      setMyPractice(null);
    } finally {
      setLoadingPractice(false);
    }
  };

  const loadEligibility = async () => {
    setLoadingEligibility(true);
    try {
      const res = await api.get("/students/me/eligibility");
      setEligibility(res.data);
    } catch {
      setEligibility({ eligible: false, reason: "No se pudo verificar habilitación" });
    } finally {
      setLoadingEligibility(false);
    }
  };

  useEffect(() => {
    loadEligibility();
    loadPractice();
  }, []);

  const handleUpload = async () => {
    if (!eligibility?.eligible) {
      return alert("No habilitado: faltan formativas del ramo");
    }
    if (!nrcId) return alert("Ingresa NRC ID");
    if (!file) return alert("Selecciona un PDF");

    const formData = new FormData();
    formData.append("nrcId", nrcId);
    formData.append("file", file);

    try {
      await api.post("/practices", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Inicio de práctica enviado");
      await loadPractice();
    } catch (e) {
      alert(e.response?.data?.error || e.response?.data?.message || "Error");
    }
  };

  return (
    <AppShell title="Mi práctica">
      <div className="grid gap-4">

        {/* ✅ Banner de habilitación */}
        {loadingEligibility ? (
          <div className="text-slate-600">Verificando habilitación...</div>
        ) : eligibility && !eligibility.eligible ? (
          <div className="rounded-2xl border bg-rose-50 p-4 text-rose-800">
            <div className="font-semibold">No habilitado</div>
            <div className="text-sm mt-1">{eligibility.reason}</div>
            {eligibility.period?.name && (
              <div className="text-xs mt-2 text-rose-700">
                Período activo: {eligibility.period.name}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border bg-emerald-50 p-4 text-emerald-800">
            <div className="font-semibold">Habilitado</div>
            <div className="text-sm mt-1">
              Puedes iniciar tu proceso de práctica.
            </div>
          </div>
        )}

        {/* ✅ Contenido principal */}
        {loadingPractice ? (
          <div className="text-slate-600">Cargando práctica...</div>
        ) : myPractice ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Estado actual">
              <div className="flex items-center justify-between">
                <div className="text-slate-600">Estado</div>
                <StatusBadge status={myPractice.status} />
              </div>

              <div className="mt-3 text-sm text-slate-600">
                Inicio de práctica:{" "}
                <span className="ml-2">
                  <StatusBadge status={myPractice.startDocStatus} />
                </span>
              </div>

              {myPractice.startDocNotes && (
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-900 text-sm">
                  <b>Observaciones Secretaría:</b>
                  <div className="mt-1">{myPractice.startDocNotes}</div>
                </div>
              )}
            </Card>

            <Card title="Historial de estados">
              <div className="space-y-2 text-sm">
                {(myPractice.statusHistory || []).length === 0 ? (
                  <div className="text-slate-600">Sin historial.</div>
                ) : (
                  (myPractice.statusHistory || []).map((h) => (
                    <div key={h.id} className="rounded-xl border bg-slate-50 p-3">
                      <div>
                        <b>{h.newStatus}</b>{" "}
                        <span className="text-slate-600">
                          (antes: {h.previousStatus ?? "—"})
                        </span>
                      </div>
                      {h.createdAt && (
                        <div className="text-slate-600">
                          {new Date(h.createdAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        ) : (
          <Card title="Enviar inicio de práctica (PDF)">
            {!eligibility?.eligible ? (
              <div className="text-slate-600">
                Cuando entregues las formativas, podrás subir tu inicio de práctica desde aquí.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-600">NRC ID</label>
                  <Input
                    value={nrcId}
                    onChange={(e) => setNrcId(e.target.value)}
                    placeholder="Ej: 17795"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600">PDF</label>
                  <input
                    className="block w-full text-sm"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>

                <Button onClick={handleUpload}>Enviar</Button>
                <p className="text-xs text-slate-500">
                  * El sistema validará que no tengas otra práctica activa.
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}