import React from "react";

export function Card({ title, children }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
      {children}
    </div>
  );
}

export function Button({ children, variant = "primary", ...props }) {
  const base =
    "rounded-lg px-3 py-2 text-sm font-medium transition border";
  const styles = {
    primary: "bg-slate-900 text-white border-slate-900 hover:bg-slate-800",
    secondary: "bg-white text-slate-900 border-slate-200 hover:bg-slate-50",
    danger: "bg-rose-600 text-white border-rose-600 hover:bg-rose-700",
    success: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700",
  };

  return (
    <button className={`${base} ${styles[variant]}`} {...props}>
      {children}
    </button>
  );
}

export function Input(props) {
  return (
    <input
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
      {...props}
    />
  );
}