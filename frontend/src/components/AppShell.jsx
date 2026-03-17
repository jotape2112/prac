import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Button } from "./ui";

export default function AppShell({ title, children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold">
                P
            </div>
            <div>
                <h1 className="text-base font-semibold leading-tight">
                Sistema de Prácticas
                </h1>
                <div className="text-xs text-slate-500">
                Universidad Andrés Bello
                </div>
            </div>
            </div>

            <div className="flex items-center gap-4">
            {user && (
                <div className="text-sm text-slate-600 text-right">
                  <div className="font-semibold">{user?.name}</div>
                  <div className="text-slate-500">Rol: <b>{user?.role}</b></div>
                </div>
            )}
            </div>
        </div>
      </header>
      {/* ✅ SOLO UNA VEZ */}
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}