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
import CoordinationStartDocs from "./pages/CoordinationStartDocs";
import EvaluatorPanel from "./pages/EvaluatorPanel";

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
          path="/practice"
          element={
            <ProtectedRoute allowedRoles={["ESTUDIANTE"]}>
              <Practice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/evaluator"
          element={
            <ProtectedRoute allowedRoles={["DOCENTE"]}>
              <EvaluatorPanel />
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
                "DIRECTOR",
              ]}
            >
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/practices/:practiceId"
          element={
            <ProtectedRoute allowedRoles={["ADMIN","DOCENTE","SECRETARIO_ACADEMICO","DIRECTOR"]}>
              <PracticeDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/coordination"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <CoordinationStartDocs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/secretary"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <SecretaryStartDocs />
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