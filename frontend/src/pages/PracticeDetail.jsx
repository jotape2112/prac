import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import { Card, Button } from "../components/ui";
import { AuthContext } from "../context/AuthContext";

export default function PracticeDetail() {
  const { practiceId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/practices/${practiceId}`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      await api.patch(`/practices/${practiceId}/status`, { status });
      await load();
      alert("Estado actualizado");
    } catch (e) {
      alert(e.response?.data?.error || "Error al actualizar estado");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceId]);

  if (!user) return <div className="p-6">Cargando...</div>;

  const canReject = ["ADMIN", "DOCENTE", "SECRETARIO_ACADEMICO"].includes(user.role);
  const canApprove = ["ADMIN", "DIRECTOR"].includes(user.role);

  return (
    <AppShell title={`Detalle #${practiceId}`}>
      <div className="flex items-center justify-between mb-4">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ← Volver
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load}>
            Recargar
          </Button>
          {canReject && <Button variant="danger" onClick={() => updateStatus("RECHAZADA")}>Reprobar</Button>}
          {canApprove && <Button variant="success" onClick={() => updateStatus("APROBADA")}>Aprobar</Button>}
          {user.role === "ADMIN" && <Button variant="primary" onClick={() => updateStatus("FINALIZADA")}>Finalizar</Button>}
        </div>
      </div>

      {loading || !data ? (
        <div className="text-slate-600">Cargando...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Información">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-600">Estado</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                {data.status}
              </span>
            </div>

            <div className="grid gap-3 text-sm">
              <div>
                <div className="text-slate-500">Empresa</div>
                <div>{data.empresaNombre || "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">Email empresa</div>
                <div>{data.empresaEmail || "-"}</div>
              </div>
              <div>
                <span className="text-slate-500">Supervisor</span>
                <div>
                  {(data.supervisorNombre || "-")}{data.supervisorApellido ? ` ${data.supervisorApellido}` : ""}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Supervisor email</div>
                <div>{data.supervisorEmail || "-"}</div>
              </div>
            </div>
          </Card>

          <Card title="Historial de estados">
            <div className="space-y-2 text-sm">
              {(data.statusHistory || []).map((h) => (
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
              ))}

              {(data.statusHistory || []).length === 0 && (
                <div className="text-slate-500">Sin historial.</div>
              )}
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}