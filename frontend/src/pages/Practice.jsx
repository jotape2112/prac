import React, { useEffect, useMemo, useState, useContext } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import { Card, Button, Input } from "../components/ui";
import { AuthContext } from "../context/AuthContext";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "http://localhost:3000";

// "Juan Pérez" -> "Juan_Perez"
const safeFilePart = (text) => {
  return String(text || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

// ✅ Lista amplia de países
const COUNTRIES = [
  "Afganistán","Albania","Alemania","Andorra","Angola","Antigua y Barbuda","Arabia Saudita","Argelia","Argentina","Armenia",
  "Australia","Austria","Azerbaiyán","Bahamas","Bangladés","Barbados","Baréin","Bélgica","Belice","Benín","Bielorrusia",
  "Birmania","Bolivia","Bosnia y Herzegovina","Botsuana","Brasil","Brunéi","Bulgaria","Burkina Faso","Burundi","Bután",
  "Cabo Verde","Camboya","Camerún","Canadá","Catar","Chad","Chile","China","Chipre","Colombia","Comoras","Congo",
  "Corea del Norte","Corea del Sur","Costa de Marfil","Costa Rica","Croacia","Cuba","Dinamarca","Dominica","Ecuador",
  "Egipto","El Salvador","Emiratos Árabes Unidos","Eritrea","Eslovaquia","Eslovenia","España","Estados Unidos","Estonia",
  "Esuatini","Etiopía","Filipinas","Finlandia","Fiyi","Francia","Gabón","Gambia","Georgia","Ghana","Granada","Grecia",
  "Guatemala","Guinea","Guinea-Bisáu","Guinea Ecuatorial","Guyana","Haití","Honduras","Hungría","India","Indonesia",
  "Irak","Irán","Irlanda","Islandia","Islas Marshall","Islas Salomón","Israel","Italia","Jamaica","Japón","Jordania",
  "Kazajistán","Kenia","Kirguistán","Kiribati","Kuwait","Laos","Lesoto","Letonia","Líbano","Liberia","Libia","Liechtenstein",
  "Lituania","Luxemburgo","Macedonia del Norte","Madagascar","Malasia","Malaui","Maldivas","Malí","Malta","Marruecos",
  "Mauricio","Mauritania","México","Micronesia","Moldavia","Mónaco","Mongolia","Montenegro","Mozambique","Namibia","Nauru",
  "Nepal","Nicaragua","Níger","Nigeria","Noruega","Nueva Zelanda","Omán","Países Bajos","Pakistán","Palaos","Panamá",
  "Papúa Nueva Guinea","Paraguay","Perú","Polonia","Portugal","Reino Unido","República Centroafricana","República Checa",
  "República Dominicana","Ruanda","Rumania","Rusia","Samoa","San Cristóbal y Nieves","San Marino","San Vicente y las Granadinas",
  "Santa Lucía","Santo Tomé y Príncipe","Senegal","Serbia","Seychelles","Sierra Leona","Singapur","Siria","Somalia","Sri Lanka",
  "Sudáfrica","Sudán","Sudán del Sur","Suecia","Suiza","Tailandia","Tanzania","Tayikistán","Timor Oriental","Togo","Tonga",
  "Trinidad y Tobago","Túnez","Turkmenistán","Turquía","Tuvalu","Ucrania","Uganda","Uruguay","Uzbekistán","Vanuatu",
  "Venezuela","Vietnam","Yemen","Yibuti","Zambia","Zimbabue"
];

const CHILE_REGIONS = [
  "Región de Arica y Parinacota",
  "Región de Tarapacá",
  "Región de Antofagasta",
  "Región de Atacama",
  "Región de Coquimbo",
  "Región de Valparaíso",
  "Región Metropolitana de Santiago",
  "Región del Libertador General Bernardo O'Higgins",
  "Región del Maule",
  "Región de Ñuble",
  "Región del Biobío",
  "Región de La Araucanía",
  "Región de Los Ríos",
  "Región de Los Lagos",
  "Región de Aysén del General Carlos Ibáñez del Campo",
  "Región de Magallanes y de la Antártica Chilena",
];

const CITIES_BY_REGION_CHILE = {
  "Región Metropolitana de Santiago": ["Santiago", "Puente Alto", "Maipú", "Las Condes", "La Florida", "San Bernardo", "Ñuñoa", "Providencia", "Peñalolén"],
  "Región de Valparaíso": ["Valparaíso", "Viña del Mar", "Quilpué", "Villa Alemana"],
  "Región del Biobío": ["Concepción", "Talcahuano", "San Pedro de la Paz", "Chiguayante", "Los Ángeles"],
  "Región de La Araucanía": ["Temuco", "Padre Las Casas"],
  "Región de Los Lagos": ["Puerto Montt", "Osorno"],
  "Región de Los Ríos": ["Valdivia"],
  "Región de Antofagasta": ["Antofagasta", "Calama"],
  "Región de Tarapacá": ["Iquique"],
  "Región de Arica y Parinacota": ["Arica"],
  "Región de Coquimbo": ["La Serena", "Coquimbo"],
  "Región del Maule": ["Talca"],
  "Región de Ñuble": ["Chillán"],
  "Región del Libertador General Bernardo O'Higgins": ["Rancagua"],
  "Región de Magallanes y de la Antártica Chilena": ["Punta Arenas"],
  "Región de Atacama": ["Copiapó"],
  "Región de Aysén del General Carlos Ibáñez del Campo": ["Coyhaique"],
};

export default function Practice() {
  const { user } = useContext(AuthContext);

  const [myPractice, setMyPractice] = useState(null);
  const [loadingPractice, setLoadingPractice] = useState(true);

  const [notis, setNotis] = useState([]);
  const [loadingNotis, setLoadingNotis] = useState(false);

  const [eligibility, setEligibility] = useState(null);
  const [loadingEligibility, setLoadingEligibility] = useState(true);

  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [tab, setTab] = useState("RESUMEN"); // RESUMEN | DOCUMENTOS | EXTENSION

  const [form, setForm] = useState({
    celular: "",

    empresaNombre: "",
    empresaRut: "",
    empresaGiro: "",
    empresaDireccion: "",
    empresaNumero: "",
    empresaPais: "Chile",
    empresaRegion: "",
    empresaCiudad: "",
    empresaTelefono: "",
    empresaEmail: "",

    supervisorNombre: "",
    supervisorApellido: "",
    supervisorCargo: "",
    supervisorEmail: "",
    supervisorFono: "",

    funciones: "",
    fechaInicio: "",
    fechaFin: "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [signedPdf, setSignedPdf] = useState(null);
  const [uploadingSigned, setUploadingSigned] = useState(false);

  const [file100h, setFile100h] = useState(null);
  const [fileFinal, setFileFinal] = useState(null);
  const [fileExtension, setFileExtension] = useState(null);
  const [uploadingTask, setUploadingTask] = useState(false);

  const rutAlumno = user?.rut || myPractice?.student?.rut || "—";

  const toPublicUrl = (filePath) => {
    if (!filePath) return "";
    const p = String(filePath).replace(/\\/g, "/");
    if (p.startsWith("uploads/")) return `${API_ORIGIN}/${p}`;
    const idx = p.toLowerCase().indexOf("/uploads/");
    if (idx !== -1) return `${API_ORIGIN}/${p.slice(idx + 1)}`;
    return `${API_ORIGIN}/${p}`;
  };

  const isoToDateInput = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayForInput = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const minDate = todayForInput();

  const HOURS_PER_DAY = 8;
  const hoursByType = { I: 216, II: 351 };

  const addBusinessDaysISO = (startISO, businessDays) => {
    if (!startISO) return "";
    const d = new Date(`${startISO}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    let added = 0;
    while (added < businessDays) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay();
      if (day !== 0 && day !== 6) added++;
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const practiceType = myPractice?.nrc?.practiceType || null;
  const requiredBusinessDays = practiceType
    ? Math.ceil((hoursByType[practiceType] || 0) / HOURS_PER_DAY)
    : null;

  const minEndByHours = requiredBusinessDays
    ? addBusinessDaysISO(form.fechaInicio, requiredBusinessDays)
    : "";

  const finalMinEnd = (() => {
    if (!minEndByHours) return minDate;
    return minEndByHours > minDate ? minEndByHours : minDate;
  })();

  const formatDMY = (iso) => {
    if (!iso) return "";
    const [yyyy, mm, dd] = String(iso).split("-");
    if (!yyyy || !mm || !dd) return iso;
    return `${dd}-${mm}-${yyyy}`;
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const normalizePhone = (phone) => {
    let p = String(phone || "").replace(/\s+/g, "").replace(/-/g, "");
    if (/^9\d{8}$/.test(p)) p = `+56${p}`;
    if (/^569\d{8}$/.test(p)) p = `+${p}`;
    return p;
  };

  const isValidStudentCell = (phone) => /^\+569\d{8}$/.test(normalizePhone(phone));

  const isValidPhone = (phone) => {
    const cleaned = String(phone || "").replace(/[^\d]/g, "");
    return cleaned.length >= 8;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.celular.trim()) {
      newErrors.celular = "El celular del alumno es obligatorio";
    } else if (!isValidStudentCell(form.celular)) {
      newErrors.celular = "Debe ser +569XXXXXXXX (ej: +56912345678)";
    }

    if (!form.empresaEmail.trim()) newErrors.empresaEmail = "Email empresa obligatorio";
    else if (!isValidEmail(form.empresaEmail)) newErrors.empresaEmail = "Email inválido";

    if (!form.supervisorEmail.trim()) newErrors.supervisorEmail = "Email supervisor obligatorio";
    else if (!isValidEmail(form.supervisorEmail)) newErrors.supervisorEmail = "Email inválido";

    if (!form.empresaTelefono.trim()) newErrors.empresaTelefono = "Teléfono empresa obligatorio";
    else if (!isValidPhone(form.empresaTelefono)) newErrors.empresaTelefono = "Teléfono inválido";

    if (!form.supervisorFono.trim()) newErrors.supervisorFono = "Teléfono supervisor obligatorio";
    else if (!isValidPhone(form.supervisorFono)) newErrors.supervisorFono = "Teléfono inválido";

    if (!form.funciones.trim()) newErrors.funciones = "Funciones obligatorias";

    if (!form.fechaInicio) newErrors.fechaInicio = "Fecha inicio obligatoria";
    if (!form.fechaFin) newErrors.fechaFin = "Fecha término obligatoria";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (form.fechaInicio) {
      const inicio = new Date(`${form.fechaInicio}T00:00:00`);
      if (inicio < today) newErrors.fechaInicio = "Inicio no puede ser anterior a hoy";
    }

    if (form.fechaFin) {
      const fin = new Date(`${form.fechaFin}T00:00:00`);
      if (fin < today) newErrors.fechaFin = "Término no puede ser anterior a hoy";
    }

    if (form.fechaInicio && form.fechaFin) {
      if (form.fechaFin <= form.fechaInicio) {
        newErrors.fechaFin = "Término debe ser posterior a inicio";
      }
    }

    if (practiceType && form.fechaInicio && form.fechaFin && requiredBusinessDays) {
      const minEnd = addBusinessDaysISO(form.fechaInicio, requiredBusinessDays);
      if (minEnd && form.fechaFin < minEnd) {
        newErrors.fechaFin = `No cumple horas mínimas. Fecha mínima: ${formatDMY(minEnd)}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const loadPractice = async () => {
    setLoadingPractice(true);
    try {
      const res = await api.get("/practices/me");
      setMyPractice(res.data);
    } catch {
      setMyPractice(null);
    } finally {
      setLoadingPractice(false);
    }
  };

  const loadEligibility = async () => {
    setLoadingEligibility(true);
    try {
      const res = await api.get("/students/me/eligibility");
      setEligibility(res.data);
    } catch {
      setEligibility({ eligible: false, reason: "No se pudo verificar habilitación" });
    } finally {
      setLoadingEligibility(false);
    }
  };

  const loadDocs = async (practiceId) => {
    setLoadingDocs(true);
    try {
      const res = await api.get(`/documents/${practiceId}`);
      setDocs(res.data || []);
    } catch {
      setDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadNotis = async () => {
    setLoadingNotis(true);
    try {
      const res = await api.get("/notifications"); // ya lo tienes funcionando en Dashboard
      setNotis(res.data || []);
    } catch {
      setNotis([]);
    } finally {
      setLoadingNotis(false);
    }
  };

  useEffect(() => {
    loadEligibility();
    loadPractice();
  }, []);

  useEffect(() => {
    if (myPractice?.id) {
      loadDocs(myPractice.id);
      loadNotis();
    }
  }, [myPractice?.id]);

  useEffect(() => {
    if (!myPractice) return;
    setForm((prev) => ({
      ...prev,
      celular: myPractice.celular || "",

      empresaNombre: myPractice.empresaNombre || "",
      empresaRut: myPractice.empresaRut || "",
      empresaGiro: myPractice.empresaGiro || "",
      empresaDireccion: myPractice.empresaDireccion || "",
      empresaNumero: myPractice.empresaNumero || "",
      empresaPais: myPractice.empresaPais || "Chile",
      empresaRegion: myPractice.empresaRegion || "",
      empresaCiudad: myPractice.empresaCiudad || "",
      empresaTelefono: myPractice.empresaTelefono || "",
      empresaEmail: myPractice.empresaEmail || "",

      supervisorNombre: myPractice.supervisorNombre || "",
      supervisorApellido: myPractice.supervisorApellido || "",
      supervisorCargo: myPractice.supervisorCargo || "",
      supervisorEmail: myPractice.supervisorEmail || "",
      supervisorFono: myPractice.supervisorFono || "",

      funciones: myPractice.funciones || "",
      fechaInicio: isoToDateInput(myPractice.fechaInicio),
      fechaFin: isoToDateInput(myPractice.fechaFin),
    }));
  }, [myPractice]);

  const createOrContinueDraft = async () => {
    if (!eligibility?.eligible) return alert("No habilitado: faltan formativas del ramo");
    try {
      const res = await api.post("/practices/start");
      setMyPractice(res.data);
      await loadDocs(res.data.id);
    } catch (e) {
      alert(e.response?.data?.error || e.response?.data?.message || "Error creando borrador");
    }
  };

  const saveForm = async () => {
    if (!myPractice?.id) return;
    if (!validateForm()) return;

    setSaving(true);
    try {
      await api.patch(`/practices/${myPractice.id}/start-form`, {
        ...form,
        celular: normalizePhone(form.celular),
        fechaInicio: form.fechaInicio || null,
        fechaFin: form.fechaFin || null,
      });
      alert("Formulario guardado");
      await loadPractice();
    } catch (e) {
      alert(e.response?.data?.error || "Error al guardar formulario");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdfForSignature = async () => {
    if (!myPractice?.id) return;
    try {
      const res = await api.get(`/practices/${myPractice.id}/start-form/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      const nombre = safeFilePart(user?.name);
      a.download = nombre ? `inicio_practica_${nombre}.pdf` : `inicio_practica_${myPractice.id}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.response?.data?.error || e.response?.data?.message || "Error al descargar PDF");
    }
  };

  const uploadDoc = async (practiceId, type, fileObj) => {
    const fd = new FormData();
    fd.append("type", type);
    fd.append("file", fileObj);

    await api.post(`/documents/${practiceId}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const inicioFirmadoAlumnoEmpresa = useMemo(
    () => (docs || []).find((d) => d.type === "INICIO_PDF"),
    [docs]
  );

  const inicioFirmadoDirector = useMemo(
    () => (docs || []).find((d) => d.type === "INICIO_FIRMADO_PDF"),
    [docs]
  );

  const doc100h = useMemo(() => (docs || []).find((d) => d.type === "INFORME_100H_WORD"), [docs]);
  const docFinal = useMemo(() => (docs || []).find((d) => d.type === "INFORME_FINAL_WORD"), [docs]);

  const notisForThisPractice = useMemo(() => {
    if (!myPractice?.id) return [];
    const list = (notis || []).filter(n => Number(n.practiceId) === Number(myPractice.id));
    // muestra primero las más recientes
    return list.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notis, myPractice?.id]);

  const evaluadorNotis = useMemo(() => {
    // tipos que suelen venir desde el evaluador (puedes ajustar si tus types varían)
    const allowedTypes = new Set([
      "DOC_SUBMITTED_HORAS_100",
      "DOC_SUBMITTED_FINAL",
      "EVAL_OBSERVED_HORAS_100",
      "EVAL_OBSERVED_FINAL",
      "EVAL_GRADED_HORAS_100",
      "EVAL_GRADED_FINAL",
    ]);
    return notisForThisPractice.filter(n => allowedTypes.has(n.type));
  }, [notisForThisPractice]);

  const canResubmitSigned =
    myPractice &&
    ["SUBIDO_POR_ESTUDIANTE", "OBSERVADO_SECRETARIA", "OBSERVADO_COORDINACION"].includes(myPractice.startDocStatus);

  const uploadSignedStartPdf = async () => {
    if (!myPractice?.id) return;
    if (!signedPdf) return alert("Selecciona el PDF firmado y timbrado");

    if (!canResubmitSigned) {
      return alert("Tu inicio ya está en revisión. Solo puedes reenviar si fue observado.");
    }

    setUploadingSigned(true);
    try {
      await uploadDoc(myPractice.id, "INICIO_PDF", signedPdf);
      alert("PDF firmado/timbrado subido. Queda en revisión de Secretaría.");
      setSignedPdf(null);
      await loadDocs(myPractice.id);
      await loadPractice();
    } catch (e) {
      alert(e.response?.data?.error || "Error al subir INICIO_PDF");
    } finally {
      setUploadingSigned(false);
    }
  };

  const isStudentFlowLocked =
    myPractice &&
    (myPractice.status === "APROBADA" ||
      myPractice.status === "EN_DESARROLLO" ||
      myPractice.status === "EXTENSION_SOLICITADA" ||
      myPractice.startDocStatus === "PUBLICADO_POR_SECRETARIA");

  const hasStartedPractice =
    myPractice &&
    (
      myPractice.startDocStatus === "PUBLICADO_POR_SECRETARIA" ||
      myPractice.startDocStatus === "EN_FIRMA_DIRECTOR" ||
      myPractice.startDocStatus === "FIRMADO_DIRECTOR" ||
      ["APROBADA", "EN_DESARROLLO", "EXTENSION_SOLICITADA", "FINALIZADA"].includes(myPractice.status)
    );

  const canEditForm =
    myPractice &&
    !isStudentFlowLocked &&
    !["EN_FIRMA_DIRECTOR", "FIRMADO_DIRECTOR", "PUBLICADO_POR_SECRETARIA"].includes(myPractice.startDocStatus);

  const uploadTaskDoc = async (type, fileObj) => {
    if (!myPractice?.id) return;
    if (!fileObj) return alert("Selecciona un archivo primero.");
    setUploadingTask(true);
    try {
      await uploadDoc(myPractice.id, type, fileObj);
      alert("Archivo subido ✅");
      await loadDocs(myPractice.id);
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo subir el archivo");
    } finally {
      setUploadingTask(false);
    }
  };

  const showObservedBox =
    myPractice &&
    ["OBSERVADO_SECRETARIA", "OBSERVADO_COORDINACION"].includes(myPractice.startDocStatus);

  const observedTitle =
    myPractice?.startDocStatus === "OBSERVADO_SECRETARIA"
      ? "Tu inicio fue observado por Secretaría"
      : "Tu inicio fue observado por Coordinación";

  const observedFileName =
    inicioFirmadoAlumnoEmpresa?.fileName ||
    inicioFirmadoAlumnoEmpresa?.filePath?.split("/").pop() ||
    "INICIO_PDF";

  if (!user) return <div className="p-6">Cargando...</div>;

  return (
    <AppShell title="Mi práctica">
      <div className="grid gap-4">
        {loadingEligibility ? (
          <div className="text-slate-600">Verificando habilitación...</div>
        ) : eligibility && !eligibility.eligible ? (
          <div className="rounded-2xl border bg-rose-50 p-4 text-rose-800">
            <div className="font-semibold">No habilitado</div>
            <div className="text-sm mt-1">{eligibility.reason}</div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-emerald-50 p-4 text-emerald-800">
            <div className="font-semibold">Habilitado</div>
            <div className="text-sm mt-1">Puedes iniciar tu proceso de práctica.</div>
          </div>
        )}

        {loadingPractice ? (
          <div className="text-slate-600">Cargando práctica...</div>
        ) : !myPractice ? (
          <Card title="Inicio de práctica">
            {!eligibility?.eligible ? (
              <div className="text-slate-600">
                Cuando entregues las formativas, podrás iniciar el proceso de práctica desde aquí.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-600">
                  Crea un borrador para completar el formulario, descargar el PDF y subirlo firmado/timbrado.
                </p>
                <Button onClick={createOrContinueDraft}>Crear / Continuar inicio de práctica</Button>
              </div>
            )}
          </Card>
        ) : (
          <>
            <Card title="Estado actual">
              <div className="text-sm text-slate-700">
                <div>Estado: <b>{myPractice.status}</b></div>
                <div>Inicio de práctica: <b>{myPractice.startDocStatus}</b></div>

                {myPractice.evaluador && (
                  <div className="mt-2">
                    Docente evaluador: <b>{myPractice.evaluador.name}</b> ({myPractice.evaluador.email})
                  </div>
                )}
              </div>
            </Card>

            {/* ✅ NUEVO: caja clara para observaciones + archivo observado */}
            {showObservedBox && (
              <div className="rounded-2xl border bg-rose-50 p-4 text-rose-900">
                <div className="font-semibold">{observedTitle}</div>
                <div className="text-sm mt-1">
                  Archivo observado: <b>{observedFileName}</b>
                </div>
                {myPractice.startDocNotes && (
                  <div className="text-sm mt-2">
                    Observación: <span className="font-semibold">{myPractice.startDocNotes}</span>
                  </div>
                )}
                <div className="text-sm mt-2">
                  Corrige y vuelve a subir el PDF firmado/timbrado para que se reenvíe a revisión.
                </div>
              </div>
            )}

            {hasStartedPractice && (
              <Card title="Acceso rápido">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={tab === "RESUMEN" ? "primary" : "secondary"}
                    onClick={() => setTab("RESUMEN")}
                  >
                    Resumen
                  </Button>
                  <Button
                    variant={tab === "DOCUMENTOS" ? "primary" : "secondary"}
                    onClick={() => setTab("DOCUMENTOS")}
                  >
                    Mis documentos
                  </Button>
                  <Button
                    variant={tab === "EXTENSION" ? "primary" : "secondary"}
                    onClick={() => setTab("EXTENSION")}
                  >
                    Extensión de práctica
                  </Button>
                </div>
              </Card>
            )}
            {/* ✅ RESUMEN  */}
            {hasStartedPractice && tab === "RESUMEN" && (
              <Card title="Resumen">
                <div className="grid gap-4">
                  {/* Info base */}
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">NRC</div>
                      <div className="mt-1 text-lg font-semibold">{myPractice.nrc?.code || "-"}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Tipo:{" "}
                        <b>
                          {myPractice.nrc?.practiceType === "I"
                            ? "Práctica I (216h)"
                            : "Práctica II (351h)"}
                        </b>
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Inicio</div>
                      <div className="mt-1 text-lg font-semibold">
                        {myPractice.fechaInicio
                          ? new Date(myPractice.fechaInicio).toLocaleDateString("es-CL")
                          : "-"}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">Fecha de comienzo</div>
                    </div>

                    <div className="rounded-2xl border bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Término</div>
                      <div className="mt-1 text-lg font-semibold">
                        {myPractice.fechaFin
                          ? new Date(myPractice.fechaFin).toLocaleDateString("es-CL")
                          : "-"}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">Fecha estimada / final</div>
                    </div>
                  </div>

                  {/* Entregables */}
                  <div className="rounded-2xl border bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Entregables del ramo</div>
                      <div className="text-xs text-slate-500">Estado de envío</div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3 border">
                        <div className="text-sm font-semibold">Informe 100 horas</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Estado:{" "}
                          <span className={doc100h ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                            {doc100h ? "SUBIDO" : "PENDIENTE"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 border">
                        <div className="text-sm font-semibold">Informe final</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Estado:{" "}
                          <span className={docFinal ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                            {docFinal ? "SUBIDO" : "PENDIENTE"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      Tip: puedes gestionar estos archivos en la pestaña <b>“Mis documentos”</b>.
                    </div>
                  </div>

                  {/* Actividad del evaluador (notificaciones) */}
                  <div className="rounded-2xl border bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Actividad del evaluador</div>
                      {loadingNotis && <span className="text-xs text-slate-500">Actualizando…</span>}
                    </div>

                    {evaluadorNotis.length === 0 ? (
                      <div className="text-sm text-slate-600 mt-2">
                        Aún no hay notificaciones del evaluador para esta práctica.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {evaluadorNotis.slice(0, 6).map((n) => (
                          <div key={n.id} className="rounded-xl bg-slate-50 p-3 text-sm border">
                            <div className="font-semibold">{n.title}</div>
                            <div className="text-slate-700">{n.message}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(n.createdAt).toLocaleString("es-CL")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {hasStartedPractice && tab === "DOCUMENTOS" && (
              <Card title="Mis documentos">
                <div className="grid gap-4">
                  {/* 100H */}
                  <div className="rounded-2xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">Informe 100 horas (Word)</div>
                        <div className="text-sm text-slate-600 mt-1">
                          Estado:{" "}
                          {doc100h ? (
                            <a
                              className="underline font-semibold"
                              href={toPublicUrl(doc100h.filePath)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ver / Descargar
                            </a>
                          ) : (
                            <span className="font-semibold text-amber-700">No subido</span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                        {doc100h ? "SUBIDO" : "PENDIENTE"}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col md:flex-row md:items-center gap-2">
                      <input
                        className="block w-full text-sm"
                        type="file"
                        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => setFile100h(e.target.files?.[0] || null)}
                      />
                      <Button
                        disabled={uploadingTask || !file100h}
                        onClick={() => uploadTaskDoc("INFORME_100H_WORD", file100h)}
                      >
                        Subir 100h
                      </Button>
                    </div>

                    {!file100h && (
                      <div className="mt-2 text-xs text-slate-500">
                        Selecciona un archivo Word para habilitar el botón de subida.
                      </div>
                    )}
                  </div>

                  {/* FINAL */}
                  <div className="rounded-2xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">Informe final (Word)</div>
                        <div className="text-sm text-slate-600 mt-1">
                          Estado:{" "}
                          {docFinal ? (
                            <a
                              className="underline font-semibold"
                              href={toPublicUrl(docFinal.filePath)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ver / Descargar
                            </a>
                          ) : (
                            <span className="font-semibold text-amber-700">No subido</span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                        {docFinal ? "SUBIDO" : "PENDIENTE"}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col md:flex-row md:items-center gap-2">
                      <input
                        className="block w-full text-sm"
                        type="file"
                        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => setFileFinal(e.target.files?.[0] || null)}
                      />
                      <Button
                        disabled={uploadingTask || !fileFinal}
                        onClick={() => uploadTaskDoc("INFORME_FINAL_WORD", fileFinal)}
                      >
                        Subir final
                      </Button>
                    </div>

                    {!fileFinal && (
                      <div className="mt-2 text-xs text-slate-500">
                        Selecciona un archivo Word para habilitar el botón de subida.
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* ===================== FORMULARIO (solo cuando NO ha empezado) ===================== */}
            {!hasStartedPractice && (
              <>
                <Card title="Formulario · Inicio de práctica">
                  <div className="grid gap-4">
                    <div className="rounded-xl border p-4">
                      <div className="font-semibold">Datos del alumno</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-sm text-slate-600">RUT</label>
                          <Input value={rutAlumno} disabled />
                        </div>
                        <div>
                          <label className="text-sm text-slate-600">Celular (formato +569XXXXXXXX)</label>
                          <Input
                            value={form.celular}
                            disabled={!canEditForm}
                            onChange={(e) => setForm((p) => ({ ...p, celular: e.target.value }))}
                            placeholder="+56912345678"
                          />
                          {errors.celular && <div className="text-xs text-rose-600 mt-1">{errors.celular}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="font-semibold">Datos de la empresa</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {[
                          ["empresaNombre", "Nombre"],
                          ["empresaRut", "RUT"],
                          ["empresaGiro", "Giro"],
                          ["empresaDireccion", "Dirección"],
                          ["empresaNumero", "Número"],
                        ].map(([k, label]) => (
                          <div key={k}>
                            <label className="text-sm text-slate-600">{label}</label>
                            <Input
                              value={form[k]}
                              disabled={!canEditForm}
                              onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                            />
                          </div>
                        ))}

                        <div>
                          <label className="text-sm text-slate-600">País</label>
                          <select
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={form.empresaPais || "Chile"}
                            disabled={!canEditForm}
                            onChange={(e) => {
                              const newCountry = e.target.value;
                              setForm((p) => ({
                                ...p,
                                empresaPais: newCountry,
                                empresaRegion: newCountry === "Chile" ? p.empresaRegion : "",
                                empresaCiudad: newCountry === "Chile" ? "" : p.empresaCiudad,
                              }));
                            }}
                          >
                            {COUNTRIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        {(!form.empresaPais || form.empresaPais === "Chile") && (
                          <div>
                            <label className="text-sm text-slate-600">Región</label>
                            <select
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              value={form.empresaRegion || ""}
                              disabled={!canEditForm}
                              onChange={(e) => {
                                const region = e.target.value;
                                setForm((p) => ({ ...p, empresaRegion: region, empresaCiudad: "" }));
                              }}
                            >
                              <option value="">Selecciona una región</option>
                              {CHILE_REGIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="text-sm text-slate-600">
                            Ciudad {form.empresaPais && form.empresaPais !== "Chile" ? "(escríbela)" : ""}
                          </label>

                          {(!form.empresaPais || form.empresaPais === "Chile") ? (
                            <select
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              value={form.empresaCiudad || ""}
                              disabled={!canEditForm || !form.empresaRegion}
                              onChange={(e) => setForm((p) => ({ ...p, empresaCiudad: e.target.value }))}
                            >
                              <option value="">
                                {form.empresaRegion ? "Selecciona una ciudad" : "Selecciona región primero"}
                              </option>
                              {(CITIES_BY_REGION_CHILE[form.empresaRegion] || []).map((city) => (
                                <option key={city} value={city}>{city}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={form.empresaCiudad}
                              disabled={!canEditForm}
                              onChange={(e) => setForm((p) => ({ ...p, empresaCiudad: e.target.value }))}
                              placeholder="Ej: Ciudad de México"
                            />
                          )}
                        </div>

                        {[
                          ["empresaTelefono", "Teléfono"],
                          ["empresaEmail", "Email"],
                        ].map(([k, label]) => (
                          <div key={k}>
                            <label className="text-sm text-slate-600">{label}</label>
                            <Input
                              value={form[k]}
                              disabled={!canEditForm}
                              onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                            />
                            {errors[k] && <div className="text-xs text-rose-600 mt-1">{errors[k]}</div>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="font-semibold">Supervisor</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {[
                          ["supervisorNombre", "Nombre"],
                          ["supervisorApellido", "Apellido"],
                          ["supervisorCargo", "Cargo"],
                          ["supervisorEmail", "Email"],
                          ["supervisorFono", "Teléfono"],
                        ].map(([k, label]) => (
                          <div key={k}>
                            <label className="text-sm text-slate-600">{label}</label>
                            <Input
                              value={form[k]}
                              disabled={!canEditForm}
                              onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                            />
                            {errors[k] && <div className="text-xs text-rose-600 mt-1">{errors[k]}</div>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="font-semibold">Funciones</div>
                      <div className="mt-3">
                        <textarea
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                          rows={4}
                          value={form.funciones}
                          disabled={!canEditForm}
                          onChange={(e) => setForm((p) => ({ ...p, funciones: e.target.value }))}
                          placeholder="Describe las funciones principales del alumno..."
                        />
                        {errors.funciones && <div className="text-xs text-rose-600 mt-1">{errors.funciones}</div>}
                      </div>
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="font-semibold">Fechas</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-sm text-slate-600">Inicio</label>
                          <Input
                            type="date"
                            value={form.fechaInicio}
                            disabled={!canEditForm}
                            min={minDate}
                            onChange={(e) => setForm((p) => ({ ...p, fechaInicio: e.target.value }))}
                          />
                          {errors.fechaInicio && <div className="text-xs text-rose-600 mt-1">{errors.fechaInicio}</div>}
                        </div>

                        <div>
                          <label className="text-sm text-slate-600">Término</label>
                          <Input
                            type="date"
                            value={form.fechaFin}
                            disabled={!canEditForm}
                            min={finalMinEnd}
                            onChange={(e) => setForm((p) => ({ ...p, fechaFin: e.target.value }))}
                          />
                          <div className="text-xs text-slate-500 mt-1">
                            Mínimo por horas ({practiceType === "I" ? "216h" : practiceType === "II" ? "351h" : "—"}):{" "}
                            <b>{finalMinEnd ? formatDMY(finalMinEnd) : "—"}</b>
                          </div>
                          {errors.fechaFin && <div className="text-xs text-rose-600 mt-1">{errors.fechaFin}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button variant="secondary" disabled={!canEditForm || saving} onClick={saveForm}>
                        {saving ? "Guardando..." : "Guardar"}
                      </Button>
                      <Button disabled={!myPractice?.id} onClick={downloadPdfForSignature}>
                        Descargar PDF para firma
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card title="Subir inicio firmado (PDF)">
                  <div className="text-sm text-slate-700 space-y-2">
                    <div>
                      Estado actual: <b>{myPractice.startDocStatus}</b>
                    </div>

                    {inicioFirmadoAlumnoEmpresa && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        Ya subiste:{" "}
                        <a className="underline" href={toPublicUrl(inicioFirmadoAlumnoEmpresa.filePath)} target="_blank" rel="noreferrer">
                          {inicioFirmadoAlumnoEmpresa.fileName || "INICIO_PDF"}
                        </a>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setSignedPdf(e.target.files?.[0] || null)}
                      />
                      <Button disabled={uploadingSigned} onClick={uploadSignedStartPdf}>
                        {uploadingSigned ? "Subiendo..." : "Subir firmado y timbrado"}
                      </Button>
                    </div>

                    {!canResubmitSigned && (
                      <div className="text-xs text-slate-500">
                        Bloqueado: ya está en revisión. Solo puedes reenviar si fue observado.
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}