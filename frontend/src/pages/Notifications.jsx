import React, { useEffect, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import { Card, Button } from "../components/ui";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await api.get("/notifications");
      setItems(res.data || []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <AppShell title="Notificaciones">
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Inbox</h2>
          <Button variant="secondary" onClick={load}>Recargar</Button>
        </div>

        {items.length === 0 ? (
          <Card>
            <p className="text-slate-600">Sin notificaciones</p>
          </Card>
        ) : (
          items.map((n) => (
            <Card key={n.id} title={n.title}>
              <p className="text-slate-700">{n.message}</p>
              <div className="mt-3 flex gap-2">
                {n.practiceId && (
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/practices/${n.practiceId}`)}
                  >
                    Ver práctica
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}