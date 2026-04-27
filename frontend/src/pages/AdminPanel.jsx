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

  const canReject = user && ["ADMIN", "DOCENTE"].includes(user.role);
  const canApprove = user && ["ADMIN", "DIRECTOR"].includes(user.role);

  // ===== Director helpers =====
  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "http://localhost:3000";

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [signedInicioFile, setSignedInicioFile] = useState(null);
  const [signedCartaFile, setSignedCartaFile] = useState(null);
  const [uploadingDirector, setUploadingDirector] = useState(false);

  const openUploadSigned = (practiceId) => {
    setUploadId(practiceId);
    setSignedInicioFile(null);
    setSignedCartaFile(null);
    setUploadOpen(true);
  };

  // ✅ convierte "Juan Jorquera Márquez" -> "Juan_Jorquera_Marquez"
  const safeFilePart = (text) => {
    return String(text || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  // ===== ADMIN: Asignar Evaluador (Modal) =====
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPractice, setAssignPractice] = useState(null);

  const [docentes, setDocentes] = useState([]);
  const [docenteQ, setDocenteQ] = useState("");
  const [selectedDocenteId, setSelectedDocenteId] = useState("");
  const [loadingDocentes, setLoadingDocentes] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const openAssign = (p) => {
    setAssignPractice(p);
    setDocenteQ("");
    setSelectedDocenteId("");
    setAssignOpen(true);
  };

  const closeAssign = () => {
    setAssignOpen(false);
    setAssignPractice(null);
  };

  useEffect(() => {
    if (!assignOpen) return;

    const loadDocentes = async () => {
      setLoadingDocentes(true);
      try {
        // ✅ requiere endpoint: GET /api/users?role=DOCENTE (protegido para ADMIN)
        const res = await api.get("/users", { params: { role: "DOCENTE" } });
        setDocentes(res.data || []);
      } catch (e) {
        console.error(e);
        setDocentes([]);
        alert(
          e.response?.data?.error ||
            "No se pudieron cargar docentes. Revisa que exista GET /api/users?role=DOCENTE"
        );
      } finally {
        setLoadingDocentes(false);
      }
    };

    loadDocentes();
  }, [assignOpen]);

  const filteredDocentes = useMemo(() => {
    const qq = docenteQ.trim().toLowerCase();
    if (!qq) return docentes;
    return (docentes || []).filter((d) => {
      const name = (d.name || "").toLowerCase();
      const email = (d.email || "").toLowerCase();
      return name.includes(qq) || email.includes(qq) || String(d.id || "").includes(qq);
    });
  }, [docentes, docenteQ]);

  const submitAssignEvaluador = async () => {
    if (!assignPractice?.id) return;
    if (!selectedDocenteId) return alert("Selecciona un docente evaluador.");

    setAssigning(true);
    try {
      await api.patch(`/practices/${assignPractice.id}/assign-evaluador`, {
        evaluadorId: Number(selectedDocenteId),
      });

      alert("Evaluador asignado ✅");
      closeAssign();
      await load();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || "Error al asignar evaluador");
    } finally {
      setAssigning(false);
    }
  };

  // Para abrir archivos del /uploads
  const toPublicUrl = (filePath) => {
    if (!filePath) return "";
    const p = String(filePath).replace(/\\/g, "/");
    if (p.startsWith("uploads/")) return `${API_ORIGIN}/${p}`;
    const idx = p.toLowerCase().indexOf("/uploads/");
    if (idx !== -1) return `${API_ORIGIN}/${p.slice(idx + 1)}`;
    return `${API_ORIGIN}/${p}`;
  };

  // ✅ DESCARGA CON TOKEN (BLOB) — evita "Token requerido"
  const downloadPdfBlob = async (url, filename) => {
    const res = await api.get(url, { responseType: "blob" });
    const blob = new Blob([res.data], { type: "application/pdf" });
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "archivo.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(blobUrl);
  };

  const openInicioPdf = async (practiceId) => {
    try {
      const res = await api.get(`/documents/${practiceId}`);
      const docs = res.data || [];
      const inicio = docs.find((d) => d.type === "INICIO_PDF");
      if (!inicio) return alert("No existe INICIO_PDF subido por el estudiante.");

      window.open(toPublicUrl(inicio.filePath), "_blank");
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo abrir el INICIO_PDF");
    }
  };

  // ✅ ahora recibe studentName para nombrar el archivo
  const downloadForDirectorSign = async (practiceId, studentName) => {
    try {
      const s = safeFilePart(studentName);
      const filename = s
        ? `inicio_practica_${s}_para_firma_director.pdf`
        : `inicio_practica_${practiceId}_para_firma_director.pdf`;

      await downloadPdfBlob(`/director/start-docs/${practiceId}/for-sign`, filename);
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo descargar el PDF para firma");
    }
  };

  // ✅ Carta a empresa (con token) — ahora recibe studentName
  const downloadCartaEmpresa = async (practiceId, studentName) => {
    try {
      const s = safeFilePart(studentName);
      const filename = s ? `carta_empresa_${s}.pdf` : `carta_empresa_practica_${practiceId}.pdf`;

      await downloadPdfBlob(`/practices/${practiceId}/carta-empresa`, filename);
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo descargar la carta a empresa");
    }
  };

  const submitUploadSigned = async () => {
    if (!uploadId) return;

    // ✅ Requerimos ambos
    if (!signedInicioFile)
      return alert("Selecciona el INICIO_FIRMADO_PDF (firmado por el Director)");
    if (!signedCartaFile) return alert("Selecciona la CARTA_EMPRESA_PDF (carta firmada)");

    setUploadingDirector(true);
    try {
      // 1) Subir INICIO_FIRMADO_PDF
      const fdInicio = new FormData();
      fdInicio.append("type", "INICIO_FIRMADO_PDF");
      fdInicio.append("file", signedInicioFile);

      await api.post(`/documents/${uploadId}`, fdInicio, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 2) Subir CARTA_EMPRESA_PDF
      const fdCarta = new FormData();
      fdCarta.append("type", "CARTA_EMPRESA_PDF");
      fdCarta.append("file", signedCartaFile);

      await api.post(`/documents/${uploadId}`, fdCarta, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Inicio firmado + Carta a empresa subidos correctamente");
      setUploadOpen(false);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || "Error al subir documentos del Director");
    } finally {
      setUploadingDirector(false);
    }
  };
  // ===== End Director helpers =====

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
  }, []);

  const statuses = useMemo(
    () => ["ALL", "BORRADOR", "RECHAZADA", "APROBADA", "EXTENSION_SOLICITADA", "FINALIZADA"],
    []
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (items || []).filter((p) => {
      const hideApprovedByDefault = statusFilter === "ALL";
      if (hideApprovedByDefault && ["APROBADA", "FINALIZADA"].includes(p.status)) return false;

      const matchStatus = statusFilter === "ALL" ? true : p.status === statusFilter;

      const matchQuery =
        query === ""
          ? true
          : String(p.id).includes(query) ||
            (p.student?.name || "").toLowerCase().includes(query) ||
            (p.student?.email || "").toLowerCase().includes(query) ||
            (p.nrc?.code || "").toLowerCase().includes(query) ||
            (p.empresaNombre || "").toLowerCase().includes(query) ||
            (p.startDocNotes || "").toLowerCase().includes(query);

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
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej: 8, UNAB, 17795..." />
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
                    {s === "ALL" ? "Todos" : s}
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
                  {filtered.map((p) => {
                    const isDirectorSigning =
                      user.role === "DIRECTOR" && p.startDocStatus === "EN_FIRMA_DIRECTOR";

                    const canAssignEvaluador =
                      user.role === "ADMIN" && p.startDocStatus === "FIRMADO_DIRECTOR";

                    return (
                      <tr key={p.id} className="border-t hover:bg-slate-50 transition">
                        <td className="p-3 font-medium">{p.id}</td>

                        <td className="p-3">
                          <StatusBadge status={p.status} />
                          {p.startDocStatus && (
                            <div className="mt-1 text-xs text-slate-500">
                              Inicio: <span className="font-medium">{p.startDocStatus}</span>
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="font-medium">{p.student?.name || `#${p.studentId}`}</div>
                          <div className="text-xs text-slate-500">{p.student?.email || ""}</div>
                        </td>

                        <td className="p-3">
                          <div className="font-medium">{p.nrc?.code || `#${p.nrcId}`}</div>
                          <div className="text-xs text-slate-500">
                            {p.nrc?.practiceType ? `Práctica ${p.nrc.practiceType}` : ""}
                          </div>
                        </td>

                        <td className="p-3">{p.empresaNombre || "-"}</td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => navigate(`/practices/${p.id}`)}>
                              Ver
                            </Button>

                            {/* ===== Director flow ===== */}
                            {isDirectorSigning && (
                              <>
                                <Button variant="secondary" onClick={() => openInicioPdf(p.id)}>
                                  Ver INICIO_PDF
                                </Button>

                                <Button
                                  variant="secondary"
                                  onClick={() => downloadForDirectorSign(p.id, p.student?.name)}
                                >
                                  Descargar para firma
                                </Button>

                                <Button
                                  variant="secondary"
                                  onClick={() => downloadCartaEmpresa(p.id, p.student?.name)}
                                >
                                  Descargar carta a empresa
                                </Button>

                                <Button variant="primary" onClick={() => openUploadSigned(p.id)}>
                                  Subir firmado
                                </Button>
                              </>
                            )}

                            {/* ===== ADMIN: asignar evaluador ===== */}
                            {canAssignEvaluador && (
                              <Button variant="primary" onClick={() => openAssign(p)}>
                                Asignar evaluador
                              </Button>
                            )}

                            {/* ===== Admin/Docente acciones ===== */}
                            {canReject && (
                              <Button variant="danger" onClick={() => updateStatus(p.id, "RECHAZADA")}>
                                Reprobar
                              </Button>
                            )}

                            {canApprove && (
                              <Button variant="success" onClick={() => updateStatus(p.id, "APROBADA")}>
                                Aprobar Inicio de práctica
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ===== Modal subir firmado director ===== */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow">
            <h3 className="text-lg font-semibold">Subir Inicio Firmado (Director)</h3>
            <p className="text-sm text-slate-600 mt-1">
              Sube el PDF firmado por el Director. Esto aprobará el inicio de práctica.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm font-semibold">1) INICIO_FIRMADO_PDF</div>
                <div className="text-xs text-slate-600 mb-2">PDF del inicio firmado por el Director.</div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSignedInicioFile(e.target.files?.[0] || null)}
                />
              </div>

              <div>
                <div className="text-sm font-semibold">2) CARTA_EMPRESA_PDF</div>
                <div className="text-xs text-slate-600 mb-2">
                  Carta a empresa firmada fuera de la app (PDF escaneado/foto exportada a PDF).
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSignedCartaFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setUploadOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={submitUploadSigned} disabled={uploadingDirector}>
                {uploadingDirector ? "Subiendo..." : "Subir"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Asignar Evaluador (ADMIN) ===== */}
      {assignOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Asignar docente evaluador</h3>
              <button onClick={closeAssign} className="text-slate-500 hover:text-slate-800">
                ✕
              </button>
            </div>

            <div className="mt-2 text-sm text-slate-600">
              Práctica #{assignPractice?.id} — {assignPractice?.student?.name || "Alumno"} / NRC{" "}
              {assignPractice?.nrc?.code || "-"}
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-sm text-slate-600">Buscar docente</label>
                <Input value={docenteQ} onChange={(e) => setDocenteQ(e.target.value)} placeholder="Nombre / email / id" />
              </div>

              <div className="rounded-2xl border bg-white p-3">
                {loadingDocentes ? (
                  <div className="text-slate-600 text-sm">Cargando docentes...</div>
                ) : filteredDocentes.length === 0 ? (
                  <div className="text-slate-600 text-sm">Sin resultados</div>
                ) : (
                  <div className="grid gap-2 max-h-56 overflow-auto">
                    {filteredDocentes.map((d) => (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 rounded-xl border p-3 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="evaluador"
                          value={d.id}
                          checked={String(selectedDocenteId) === String(d.id)}
                          onChange={(e) => setSelectedDocenteId(e.target.value)}
                        />
                        <div>
                          <div className="font-medium">{d.name}</div>
                          <div className="text-xs text-slate-500">{d.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500">
                * Esto define qué prácticas verá el docente en su módulo de evaluación.
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeAssign} disabled={assigning}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={submitAssignEvaluador} disabled={assigning || !selectedDocenteId}>
                {assigning ? "Asignando..." : "Asignar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}