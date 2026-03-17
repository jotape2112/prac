import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import { Card, Button, Input } from "../components/ui";
import { AuthContext } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";

export default function AdminPanel() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const canReject = user && ["ADMIN", "DOCENTE", "SECRETARIO_ACADEMICO"].includes(user.role);
  const canApprove = user && ["ADMIN", "DIRECTOR_CARRERA"].includes(user.role);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/practices");
      setItems(res.data || []);
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo cargar prácticas");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (practiceId, status) => {
    try {
      await api.patch(`/practices/${practiceId}/status`, { status });
      await load();
    } catch (e) {
      alert(e.response?.data?.error || "Error al actualizar estado");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statuses = useMemo(
    () => [
      "ALL",
      "BORRADOR",
      "PROCESSING_DOCUMENT",
      "BORRADOR_AUTO_COMPLETADO",
      "PENDIENTE_SOLICITUD",
      "RECHAZADA",
      "APROBADA",
      "EN_DESARROLLO",
      "EXTENSION_SOLICITADA",
      "FINALIZADA",
      "CANCELADA",
    ],
    []
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (items || []).filter((p) => {
      const matchStatus = statusFilter === "ALL" ? true : p.status === statusFilter;

      const matchQuery =
        query === ""
          ? true
          : String(p.id).includes(query) ||
            String(p.studentId).includes(query) ||
            String(p.nrcId).includes(query) ||
            (p.empresaNombre || "").toLowerCase().includes(query);

      return matchStatus && matchQuery;
    });
  }, [items, q, statusFilter]);

  if (!user) return <div className="p-6">Cargando...</div>;

  return (
    <AppShell title="Panel Gestión">
      <div className="grid gap-4">
        <Card title="Filtros">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm text-slate-600">Buscar (ID, empresa, estudiante, NRC)</label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej: 8, UNAB, 2..." />
            </div>

            <div>
              <label className="text-sm text-slate-600">Estado</label>
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
              <Button variant="secondary" onClick={load}>
                Recargar
              </Button>
              <div className="text-sm text-slate-600">{filtered.length} resultado(s)</div>
            </div>
          </div>
        </Card>

        <Card title="Prácticas">
          {loading ? (
            <div className="text-slate-600">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-slate-600">No hay prácticas con esos filtros.</div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Estado</th>
                    <th className="text-left p-3">Estudiante</th>
                    <th className="text-left p-3">NRC</th>
                    <th className="text-left p-3">Empresa</th>
                    <th className="text-left p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-slate-50 transition">
                      <td className="p-3 font-medium">{p.id}</td>
                      <td className="p-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="p-3">{p.studentId}</td>
                      <td className="p-3">{p.nrcId}</td>
                      <td className="p-3">{p.empresaNombre || "-"}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => navigate(`/practices/${p.id}`)}>
                            Ver
                          </Button>

                          {canReject && (
                            <Button variant="danger" onClick={() => updateStatus(p.id, "RECHAZADA")}>
                              Reprobar
                            </Button>
                          )}

                          {canApprove && (
                            <Button variant="success" onClick={() => updateStatus(p.id, "APROBADA")}>
                              Aprobar
                            </Button>
                          )}

                          {user.role === "ADMIN" && (
                            <Button variant="primary" onClick={() => updateStatus(p.id, "FINALIZADA")}>
                              Finalizar
                            </Button>
                          )}
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
    </AppShell>
  );
}