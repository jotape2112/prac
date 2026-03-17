import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { Card, Button, Input } from "../components/ui";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token);
      navigate("/dashboard");
    } catch {
      alert("Credenciales inválidas o error en el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card title="Iniciar sesión">
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-600">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@unab.cl" />
            </div>

            <div>
              <label className="text-sm text-slate-600">Contraseña</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            <Button onClick={handleLogin} disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>

            <p className="text-xs text-slate-500">
              * Demo institucional: acceso por roles (Estudiante / Docente / Secretario / Director / Admin).
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}