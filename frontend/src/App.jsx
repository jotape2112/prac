import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import AdminPanel from "./pages/AdminPanel";
import ProtectedRoute from "./components/ProtectedRoute";
import Notifications from "./pages/Notifications";
import PracticeDetail from "./pages/PracticeDetail";
import SecretaryStartDocs from "./pages/SecretaryStartDocs";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/secretary/start-docs"
          element={
            <ProtectedRoute allowedRoles={["SECRETARIO_ACADEMICO", "ADMIN"]}>
              <SecretaryStartDocs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/practice"
          element={
            <ProtectedRoute allowedRoles={["ESTUDIANTE"]}>
              <Practice />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ADMIN",
                "DOCENTE",
                "SECRETARIO_ACADEMICO",
                "DIRECTOR_CARRERA",
              ]}
            >
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/practices/:practiceId"
          element={
            <ProtectedRoute allowedRoles={["ADMIN","DOCENTE","SECRETARIO_ACADEMICO","DIRECTOR_CARRERA"]}>
              <PracticeDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}