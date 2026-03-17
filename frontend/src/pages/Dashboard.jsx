import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import { Card, Button } from "../components/ui";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loadingNoti, setLoadingNoti] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoadingNoti(true);
      try {
        const res = await api.get("/notifications");
        setNotifications(res.data || []);
      } catch {
        setNotifications([]);
      } finally {
        setLoadingNoti(false);
      }
    };
    if (user) load();
  }, [user]);

  if (!user) return <div className="p-6">Cargando...</div>;

  const canManage = ["ADMIN", "DOCENTE", "SECRETARIO_ACADEMICO", "DIRECTOR_CARRERA"].includes(user.role);

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Acciones rápidas">
          <div className="flex flex-col gap-2">
            {user.role === "ESTUDIANTE" && (
              <Button variant="secondary" onClick={() => navigate("/practice")}>
                Ir a mi práctica
              </Button>
            )}

            {canManage && (
              <Button variant="secondary" onClick={() => navigate("/admin")}>
                Panel Gestión
              </Button>
            )}
            {["SECRETARIO_ACADEMICO", "ADMIN"].includes(user.role) && (
              <Button variant="secondary" onClick={() => navigate("/secretary/start-docs")}>
                Bandeja Secretaría (Inicios)
              </Button>
            )}
          </div>
        </Card>

        <Card title="Notificaciones">
          {loadingNoti ? (
            <p className="text-slate-600">Cargando...</p>
          ) : notifications.length === 0 ? (
            <p className="text-slate-600">Sin notificaciones</p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="rounded-xl border bg-slate-50 p-3">
                  <div className="font-semibold">{n.title}</div>
                  <div className="text-sm text-slate-700">{n.message}</div>
                  {n.practiceId && (
                    <button
                      className="mt-2 text-sm underline text-slate-700 hover:text-slate-900"
                      onClick={() => navigate(`/practices/${n.practiceId}`)}
                    >
                      Ver práctica #{n.practiceId}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}