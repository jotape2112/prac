import React from "react";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Layout({ children }) {
  const { user } = useContext(AuthContext);

  return (
    <div style={{ padding: "20px" }}>
      <header style={{ marginBottom: "20px" }}>
        <h1>Sistema de Prácticas</h1>
        {user && <p>Usuario: {user.role}</p>}
      </header>
      <main>{children}</main>
    </div>
  );
}