/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · macrostructure: Narrative Workflow · theme: Klynn modern-minimal · layout: fluid-shell · enrichment: none · contrast: pass · mobile: pass */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Plus,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Banknote,
  Gift,
  Building2,
  Clock,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Layers,
  FileText,
  Lock,
  Calculator,
  SlidersHorizontal,
  Receipt,
  Wallet,
  Sparkles,
  Tag,
  Search,
  ChevronLeft,
  ListChecks,
  History,
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/klynn/PriceInput";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  formatRD,
  uid,
  savePeriodoNomina,
  deletePeriodoNomina,
  saveDetallesNomina,
  saveAnticipoNomina,
  deleteAnticipoNomina,
  saveMovimiento,
  saveGasto,
  calcularTSS,
  calcularISRDGII,
  calcularRegaliaPascual,
  calcularTarifaHoraExtra,
  isModuleEnabled,
  type PeriodoNomina,
  type DetalleNomina,
  type AnticipoNomina,
  type Empleado,
  type FrecuenciaNomina,
} from "@/lib/storage";
import { ModalCalculadoraHorasExtras } from "@/components/klynn/ModalCalculadoraHorasExtras";
import {
  usePeriodosNomina,
  useDetallesNomina,
  useAnticiposNomina,
  useEmpleados,
  useCajaAbierta,
  usePlans,
} from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { exportNominaToExcel } from "@/lib/excel-nomina";
import { toast } from "sonner";
import { DMYDatePicker } from "@/components/ui/date-picker";

function formatFechaDMY(str?: string) {
  if (!str) return "N/D";
  const s = String(str).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const raw = s.split("T")[0].split(" ")[0].trim();
  const parts = raw.split("-");
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    if (parts[0].length === 4) {
      return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
    }
    if (parts[2].length === 4) {
      return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
    }
  }
  return s;
}

function formatFechaLegible(str?: string) {
  const fechaDMY = formatFechaDMY(str);
  if (fechaDMY === "N/D") return fechaDMY;
  const [dia, mes, anio] = fechaDMY.split("/").map(Number);
  if (!dia || !mes || !anio) return fechaDMY;
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date(anio, mes - 1, dia))
    .replaceAll(".", "");
}

export const Route = createFileRoute("/t/$slug/nomina")({
  component: NominaPage,
});

function NominaPage() {
  const user = useRequireAuth();
  const tenantId = user?.tenant?.id || "";
  const queryClient = useQueryClient();

  const { data: empleados = [], isLoading: loadingEmpleados } = useEmpleados(tenantId);
  const { data: periodos = [], isLoading: loadingPeriodos } = usePeriodosNomina(tenantId);
  const { data: todosDetalles = [], isLoading: loadingDetalles } = useDetallesNomina(tenantId);
  const { data: anticipos = [], isLoading: loadingAnticipos } = useAnticiposNomina(tenantId);
  const { data: cajaAbierta } = useCajaAbierta(tenantId);

  const isAuthLoading = !user || user.tenant.id === "__loading__";
  const { data: plans = [] } = usePlans();
  const activePlan = plans.find((p) => p.id === user?.tenant?.plan_id);
  const hasNominaModule = isAuthLoading
    ? true
    : isModuleEnabled(user?.tenant || null, "nomina", activePlan);

  // Estados de vista
  const [tabActual, setTabActual] = useState<"PERIODOS" | "PROCESADOR" | "ANTICIPOS" | "REGALIA">(
    "PERIODOS",
  );
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<PeriodoNomina | null>(null);

  // Modales
  const [modalNuevoPeriodo, setModalNuevoPeriodo] = useState(false);
  const [modalNuevoAnticipo, setModalNuevoAnticipo] = useState(false);
  const [modalReciboImpresion, setModalReciboImpresion] = useState(false);
  const [detalleParaRecibo, setDetalleParaRecibo] = useState<DetalleNomina | null>(null);
  const [detalleParaHorasExtras, setDetalleParaHorasExtras] = useState<DetalleNomina | null>(null);

  // Modales de confirmación con diseño propio Klynn
  const [periodoToDelete, setPeriodoToDelete] = useState<PeriodoNomina | null>(null);
  const [anticipoToDelete, setAnticipoToDelete] = useState<AnticipoNomina | null>(null);
  const [periodoToPagar, setPeriodoToPagar] = useState<PeriodoNomina | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [periodSearch, setPeriodSearch] = useState("");
  const [periodStatusFilter, setPeriodStatusFilter] = useState<"TODOS" | "BORRADOR" | "PAGADA">(
    "TODOS",
  );

  // Formulario Nuevo Período
  const [periodoForm, setPeriodoForm] = useState({
    nombre: "1ra Quincena " + new Date().toLocaleString("es-DO", { month: "long" }),
    frecuencia: "QUINCENAL" as FrecuenciaNomina,
    fecha_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    fecha_fin: new Date(new Date().getFullYear(), new Date().getMonth(), 15)
      .toISOString()
      .split("T")[0],
    fecha_pago: new Date().toISOString().split("T")[0],
  });

  // Formulario Nuevo Anticipo
  const [anticipoForm, setAnticipoForm] = useState({
    empleado_id: "",
    monto: 0,
    motivo: "Adelanto de sueldo",
    descontar_caja: true,
  });

  // Empleados activos para nómina (EL ADMINISTRADOR NUNCA APARECE EN NÓMINA)
  const empleadosActivos = useMemo(
    () => empleados.filter((e) => e.activo && e.rol?.toUpperCase() !== "ADMIN"),
    [empleados],
  );

  // Anticipos pendientes de descontar
  const anticiposPendientes = useMemo(
    () => anticipos.filter((a) => a.estado === "PENDIENTE"),
    [anticipos],
  );

  const totalAnticiposPendientes = useMemo(
    () => anticiposPendientes.reduce((acc, a) => acc + a.monto, 0),
    [anticiposPendientes],
  );

  // Detalles del período seleccionado enriquecidos con datos del empleado (excluyendo administradores)
  const detallesDelPeriodo = useMemo(() => {
    if (!periodoSeleccionado) return [];
    return todosDetalles
      .filter((d) => d.periodo_id === periodoSeleccionado.id)
      .map((d) => {
        const emp = d.empleado || empleados.find((e) => e.id === d.empleado_id);
        return {
          ...d,
          empleado: emp,
        };
      })
      .filter((d) => d.empleado?.rol?.toUpperCase() !== "ADMIN");
  }, [todosDetalles, periodoSeleccionado, empleados]);

  // Sincronizar automáticamente colaboradores de /personal con períodos en borrador
  const sincronizarEmpleadosConBorrador = async (
    periodo: PeriodoNomina,
    feedbackManual = false,
  ) => {
    if (periodo.estado !== "BORRADOR" || !tenantId) return;

    // Empleados que ya tienen detalle en esta nómina
    const detallesActuales = todosDetalles
      .filter((d) => d.periodo_id === periodo.id)
      .map((d) => ({
        ...d,
        empleado: d.empleado || empleados.find((e) => e.id === d.empleado_id),
      }))
      .filter((d) => d.empleado?.rol?.toUpperCase() !== "ADMIN");

    // Identificar activos de /personal que no están en la planilla
    const faltantes = empleadosActivos.filter(
      (emp) => !detallesActuales.some((d) => d.empleado_id === emp.id),
    );

    // Verificar si hay filas de administradores que deben eliminarse
    const adminDetalles = todosDetalles.filter(
      (d) =>
        d.periodo_id === periodo.id &&
        empleados.find((e) => e.id === d.empleado_id)?.rol?.toUpperCase() === "ADMIN",
    );

    if (faltantes.length === 0 && adminDetalles.length === 0) {
      if (feedbackManual) {
        toast.info("La nómina ya tiene todos los colaboradores activos de /personal.");
      }
      return;
    }

    const divisorFrecuencia =
      periodo.frecuencia === "QUINCENAL" ? 2 : periodo.frecuencia === "SEMANAL" ? 4 : 1;

    const nuevosDetalles: DetalleNomina[] = faltantes.map((emp) => {
      const sueldoMensual = emp.salario_base || 0;
      const sueldoPeriodo = +(sueldoMensual / divisorFrecuencia).toFixed(2);

      const anticiposEmp = anticiposPendientes.filter(
        (a) =>
          a.empleado_id === emp.id && (!a.periodo_nomina_id || a.periodo_nomina_id === periodo.id),
      );
      const totalAnticipos = anticiposEmp.reduce((acc, a) => acc + a.monto, 0);

      let tssAfp = 0;
      let tssSfs = 0;
      let isrRetencion = 0;

      if (emp.aplica_tss) {
        const { afp, sfs } = calcularTSS(sueldoPeriodo);
        tssAfp = afp;
        tssSfs = sfs;
      }

      if (emp.aplica_isr) {
        const tssTotal = tssAfp + tssSfs;
        const isrMensual = calcularISRDGII(sueldoMensual, tssTotal * divisorFrecuencia);
        isrRetencion = +(isrMensual / divisorFrecuencia).toFixed(2);
      }

      const totalIngresos = sueldoPeriodo;
      const deducciones = +(totalAnticipos + tssAfp + tssSfs + isrRetencion).toFixed(2);
      const netoPagar = Math.max(0, +(totalIngresos - deducciones).toFixed(2));

      return {
        id: uid(),
        tenant_id: tenantId,
        periodo_id: periodo.id,
        empleado_id: emp.id,
        salario_base_periodo: sueldoPeriodo,
        comisiones_destajo: 0,
        horas_extras: 0,
        bonos_incentivos: 0,
        otros_ingresos: 0,
        total_ingresos: totalIngresos,
        anticipos_descontados: totalAnticipos,
        tss_afp: tssAfp,
        tss_sfs: tssSfs,
        isr_retencion: isrRetencion,
        otras_deducciones: 0,
        total_deducciones: deducciones,
        neto_pagar: netoPagar,
        metodo_pago:
          (emp.metodo_pago as any) || (emp.numero_cuenta_banco ? "TRANSFERENCIA" : "EFECTIVO"),
        pagado: false,
        creado_en: new Date().toISOString(),
        empleado: emp,
      };
    });

    if (nuevosDetalles.length > 0) {
      await saveDetallesNomina(nuevosDetalles);
    }

    if (adminDetalles.length > 0) {
      for (const ad of adminDetalles) {
        try {
          await supabase.from("detalles_nomina").delete().eq("id", ad.id);
        } catch (e) {
          console.error("Error al remover admin de detalles_nomina:", e);
        }
      }
    }

    const listaActualizada = [...detallesActuales, ...nuevosDetalles];
    const totalBruto = listaActualizada.reduce((a, b) => a + b.total_ingresos, 0);
    const totalDeducciones = listaActualizada.reduce((a, b) => a + b.total_deducciones, 0);
    const totalNeto = listaActualizada.reduce((a, b) => a + b.neto_pagar, 0);

    const periodoActualizado: PeriodoNomina = {
      ...periodo,
      total_bruto: +totalBruto.toFixed(2),
      total_deducciones: +totalDeducciones.toFixed(2),
      total_neto: +totalNeto.toFixed(2),
      total_empleados: listaActualizada.length,
    };

    await savePeriodoNomina(periodoActualizado);
    setPeriodoSeleccionado(periodoActualizado);

    await queryClient.invalidateQueries({ queryKey: ["detalles-nomina", tenantId] });
    await queryClient.invalidateQueries({ queryKey: ["periodos-nomina", tenantId] });

    if (nuevosDetalles.length > 0) {
      toast.success(
        `Se sincronizaron ${nuevosDetalles.length} colaborador(es) activos desde /personal`,
      );
    }
  };

  const handleAbrirPeriodo = async (p: PeriodoNomina) => {
    setPeriodoSeleccionado(p);
    setTabActual("PROCESADOR");
    if (p.estado === "BORRADOR") {
      await sincronizarEmpleadosConBorrador(p);
    }
  };

  // Auto-sincronización al montar o tener seleccionado un borrador vacío
  useEffect(() => {
    if (
      periodoSeleccionado &&
      periodoSeleccionado.estado === "BORRADOR" &&
      !loadingEmpleados &&
      !loadingDetalles &&
      empleadosActivos.length > 0 &&
      detallesDelPeriodo.length === 0
    ) {
      sincronizarEmpleadosConBorrador(periodoSeleccionado);
    }
  }, [
    periodoSeleccionado?.id,
    periodoSeleccionado?.estado,
    loadingEmpleados,
    loadingDetalles,
    empleadosActivos.length,
    detallesDelPeriodo.length,
  ]);

  // Modo adaptable: visibilidad inteligente de columnas de deducciones
  const periodosFiltrados = useMemo(() => {
    const query = periodSearch.trim().toLocaleLowerCase("es");
    return periodos.filter((periodo) => {
      const matchesStatus = periodStatusFilter === "TODOS" || periodo.estado === periodStatusFilter;
      const matchesQuery =
        !query ||
        periodo.nombre.toLocaleLowerCase("es").includes(query) ||
        periodo.codigo.toLocaleLowerCase("es").includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [periodos, periodSearch, periodStatusFilter]);

  const currentYear = new Date().getFullYear();
  const regaliaRegistradaPorEmpleado = useMemo(() => {
    const periodosPagados = new Set(
      periodos
        .filter(
          (periodo) =>
            periodo.estado === "PAGADA" &&
            new Date(`${periodo.fecha_fin}T12:00:00`).getFullYear() === currentYear,
        )
        .map((periodo) => periodo.id),
    );
    const result = new Map<string, { devengado: number; periodos: number }>();
    for (const detalle of todosDetalles) {
      if (!periodosPagados.has(detalle.periodo_id)) continue;
      const current = result.get(detalle.empleado_id) || { devengado: 0, periodos: 0 };
      result.set(detalle.empleado_id, {
        devengado: current.devengado + Number(detalle.salario_base_periodo || 0),
        periodos: current.periodos + 1,
      });
    }
    return result;
  }, [periodos, todosDetalles, currentYear]);

  // Estadísticas generales
  const stats = useMemo(() => {
    const ultimoPeriodo = periodos[0];
    const totalUltimaNomina = ultimoPeriodo ? ultimoPeriodo.total_neto : 0;
    const totalRegaliaProyectada = Array.from(regaliaRegistradaPorEmpleado.values()).reduce(
      (acc, item) => acc + calcularRegaliaPascual(item.devengado),
      0,
    );

    return {
      totalUltimaNomina,
      totalAnticiposPendientes,
      totalRegaliaProyectada,
      totalEmpleadosActivos: empleadosActivos.length,
    };
  }, [periodos, empleadosActivos, totalAnticiposPendientes, regaliaRegistradaPorEmpleado]);

  // Obtener fecha Date segura a partir de string YYYY-MM-DD
  const parseFechaYMD = (str?: string): Date => {
    if (!str) return new Date();
    const parts = str.split("-").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  };

  // Ajuste inteligente de fechas y nombre al cambiar la frecuencia de pago
  const handleFrecuenciaChange = (frec: FrecuenciaNomina) => {
    const baseDate = parseFechaYMD(periodoForm.fecha_pago || periodoForm.fecha_inicio);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const monthName = baseDate.toLocaleString("es-DO", { month: "long" });
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (frec === "QUINCENAL") {
      const isFirstHalf = baseDate.getDate() <= 15;
      const lastDay = new Date(year, month + 1, 0).getDate();
      setPeriodoForm((prev) => ({
        ...prev,
        frecuencia: frec,
        nombre: isFirstHalf ? `1ra Quincena ${monthName}` : `2da Quincena ${monthName}`,
        fecha_inicio: `${year}-${pad(month + 1)}-${isFirstHalf ? "01" : "16"}`,
        fecha_fin: `${year}-${pad(month + 1)}-${isFirstHalf ? "15" : lastDay}`,
        fecha_pago: `${year}-${pad(month + 1)}-${isFirstHalf ? "15" : lastDay}`,
      }));
    } else if (frec === "SEMANAL") {
      const currentDay = baseDate.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(baseDate);
      monday.setDate(baseDate.getDate() + diffToMonday);
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);

      setPeriodoForm((prev) => ({
        ...prev,
        frecuencia: frec,
        nombre: `Semana del ${monday.getDate()} al ${saturday.getDate()} de ${monthName}`,
        fecha_inicio: fmt(monday),
        fecha_fin: fmt(saturday),
        fecha_pago: fmt(saturday),
      }));
    } else if (frec === "MENSUAL") {
      const lastDay = new Date(year, month + 1, 0).getDate();
      setPeriodoForm((prev) => ({
        ...prev,
        frecuencia: frec,
        nombre: `Mes de ${monthName}`,
        fecha_inicio: `${year}-${pad(month + 1)}-01`,
        fecha_fin: `${year}-${pad(month + 1)}-${lastDay}`,
        fecha_pago: `${year}-${pad(month + 1)}-${lastDay}`,
      }));
    }
  };

  // Sincronización automática de nombre y cortes al cambiar la Fecha de Pago
  const handleFechaPagoChange = (val: string) => {
    if (!val) return;
    const d = parseFechaYMD(val);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthName = d.toLocaleString("es-DO", { month: "long" });
    const day = d.getDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    const lastDay = new Date(year, month + 1, 0).getDate();

    setPeriodoForm((prev) => {
      let nuevoNombre = prev.nombre;
      let fInicio = prev.fecha_inicio;
      let fFin = prev.fecha_fin;

      if (prev.frecuencia === "MENSUAL") {
        nuevoNombre = `Mes de ${monthName}`;
        fInicio = `${year}-${pad(month + 1)}-01`;
        fFin = `${year}-${pad(month + 1)}-${lastDay}`;
      } else if (prev.frecuencia === "QUINCENAL") {
        const isFirst = day <= 15;
        nuevoNombre = isFirst ? `1ra Quincena ${monthName}` : `2da Quincena ${monthName}`;
        fInicio = `${year}-${pad(month + 1)}-${isFirst ? "01" : "16"}`;
        fFin = `${year}-${pad(month + 1)}-${isFirst ? "15" : lastDay}`;
      } else if (prev.frecuencia === "SEMANAL") {
        nuevoNombre = `Semana de ${monthName}`;
      }

      return {
        ...prev,
        nombre: nuevoNombre,
        fecha_pago: val,
        fecha_inicio: fInicio,
        fecha_fin: fFin,
      };
    });
  };

  // Sincronización automática de nombre y cortes al cambiar la Fecha Inicio
  const handleFechaInicioChange = (val: string) => {
    if (!val) return;
    const d = parseFechaYMD(val);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthName = d.toLocaleString("es-DO", { month: "long" });
    const day = d.getDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    const lastDay = new Date(year, month + 1, 0).getDate();

    setPeriodoForm((prev) => {
      let nuevoNombre = prev.nombre;
      let fFin = prev.fecha_fin;
      let fPago = prev.fecha_pago;

      if (prev.frecuencia === "MENSUAL") {
        nuevoNombre = `Mes de ${monthName}`;
        fFin = `${year}-${pad(month + 1)}-${lastDay}`;
        fPago = `${year}-${pad(month + 1)}-${lastDay}`;
      } else if (prev.frecuencia === "QUINCENAL") {
        const isFirst = day <= 15;
        nuevoNombre = isFirst ? `1ra Quincena ${monthName}` : `2da Quincena ${monthName}`;
        fFin = `${year}-${pad(month + 1)}-${isFirst ? "15" : lastDay}`;
        fPago = `${year}-${pad(month + 1)}-${isFirst ? "15" : lastDay}`;
      }

      return {
        ...prev,
        nombre: nuevoNombre,
        fecha_inicio: val,
        fecha_fin: fFin,
        fecha_pago: fPago,
      };
    });
  };

  // Sincronización automática al navegar entre meses con las flechas del calendario (< >)
  const handleMonthNavigate = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthName = monthDate.toLocaleString("es-DO", { month: "long" });
    const pad = (n: number) => String(n).padStart(2, "0");
    const lastDay = new Date(year, month + 1, 0).getDate();

    setPeriodoForm((prev) => {
      let nuevoNombre = prev.nombre;
      let fInicio = prev.fecha_inicio;
      let fFin = prev.fecha_fin;
      let fPago = prev.fecha_pago;

      if (prev.frecuencia === "MENSUAL") {
        nuevoNombre = `Mes de ${monthName}`;
        fInicio = `${year}-${pad(month + 1)}-01`;
        fFin = `${year}-${pad(month + 1)}-${lastDay}`;
        fPago = `${year}-${pad(month + 1)}-${lastDay}`;
      } else if (prev.frecuencia === "QUINCENAL") {
        const isSecond = prev.nombre.toLowerCase().includes("2da");
        nuevoNombre = isSecond ? `2da Quincena ${monthName}` : `1ra Quincena ${monthName}`;
        fInicio = `${year}-${pad(month + 1)}-${isSecond ? "16" : "01"}`;
        fFin = `${year}-${pad(month + 1)}-${isSecond ? lastDay : "15"}`;
        fPago = `${year}-${pad(month + 1)}-${isSecond ? lastDay : "15"}`;
      } else if (prev.frecuencia === "SEMANAL") {
        nuevoNombre = `Semana de ${monthName}`;
      }

      return {
        ...prev,
        nombre: nuevoNombre,
        fecha_inicio: fInicio,
        fecha_fin: fFin,
        fecha_pago: fPago,
      };
    });
  };

  // Handler: Crear Nuevo Período de Nómina y generar pre-nómina
  const handleCrearPeriodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodoForm.nombre.trim()) {
      toast.error("El nombre del período es requerido");
      return;
    }

    const periodoId = uid();
    const codigo = `NOM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Generar líneas de detalle para cada empleado activo
    const divisorFrecuencia =
      periodoForm.frecuencia === "QUINCENAL" ? 2 : periodoForm.frecuencia === "SEMANAL" ? 4 : 1;

    let totalBruto = 0;
    let totalDeducciones = 0;
    let totalNeto = 0;
    const anticiposDisponibles = anticiposPendientes.filter((a) => !a.periodo_nomina_id);

    const nuevosDetalles: DetalleNomina[] = empleadosActivos.map((emp) => {
      const sueldoMensual = emp.salario_base || 0;
      const sueldoPeriodo = +(sueldoMensual / divisorFrecuencia).toFixed(2);

      // Buscar anticipos pendientes de este empleado
      const anticiposEmp = anticiposDisponibles.filter((a) => a.empleado_id === emp.id);
      const totalAnticipos = anticiposEmp.reduce((acc, a) => acc + a.monto, 0);

      // Deducciones de ley dominicana (TSS e ISR)
      let tssAfp = 0;
      let tssSfs = 0;
      let isrRetencion = 0;

      if (emp.aplica_tss) {
        const { afp, sfs } = calcularTSS(sueldoPeriodo);
        tssAfp = afp;
        tssSfs = sfs;
      }

      if (emp.aplica_isr) {
        const tssTotal = tssAfp + tssSfs;
        const isrMensual = calcularISRDGII(sueldoMensual, tssTotal * divisorFrecuencia);
        isrRetencion = +(isrMensual / divisorFrecuencia).toFixed(2);
      }

      const totalIngresos = sueldoPeriodo;
      const deducciones = +(totalAnticipos + tssAfp + tssSfs + isrRetencion).toFixed(2);
      const netoPagar = Math.max(0, +(totalIngresos - deducciones).toFixed(2));

      totalBruto += totalIngresos;
      totalDeducciones += deducciones;
      totalNeto += netoPagar;

      return {
        id: uid(),
        tenant_id: tenantId,
        periodo_id: periodoId,
        empleado_id: emp.id,
        salario_base_periodo: sueldoPeriodo,
        comisiones_destajo: 0,
        horas_extras: 0,
        bonos_incentivos: 0,
        otros_ingresos: 0,
        total_ingresos: totalIngresos,
        anticipos_descontados: totalAnticipos,
        tss_afp: tssAfp,
        tss_sfs: tssSfs,
        isr_retencion: isrRetencion,
        otras_deducciones: 0,
        total_deducciones: deducciones,
        neto_pagar: netoPagar,
        metodo_pago:
          (emp.metodo_pago as any) || (emp.numero_cuenta_banco ? "TRANSFERENCIA" : "EFECTIVO"),
        pagado: false,
        creado_en: new Date().toISOString(),
        empleado: emp,
      };
    });

    const nuevoPeriodo: PeriodoNomina = {
      id: periodoId,
      tenant_id: tenantId,
      codigo,
      nombre: periodoForm.nombre.trim(),
      frecuencia: periodoForm.frecuencia,
      fecha_inicio: periodoForm.fecha_inicio,
      fecha_fin: periodoForm.fecha_fin,
      fecha_pago: periodoForm.fecha_pago,
      total_bruto: +totalBruto.toFixed(2),
      total_deducciones: +totalDeducciones.toFixed(2),
      total_neto: +totalNeto.toFixed(2),
      total_empleados: empleadosActivos.length,
      estado: "BORRADOR",
      creado_por: user?.empleado?.id,
      creado_en: new Date().toISOString(),
    };

    await savePeriodoNomina(nuevoPeriodo);
    await saveDetallesNomina(nuevosDetalles);

    // Reservar los anticipos para este borrador. Solo se consideran realmente
    // descontados cuando la nómina se confirma como pagada.
    for (const a of anticiposDisponibles) {
      if (
        nuevosDetalles.some((d) => d.empleado_id === a.empleado_id && d.anticipos_descontados > 0)
      ) {
        await saveAnticipoNomina({ ...a, estado: "PENDIENTE", periodo_nomina_id: periodoId });
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["periodos-nomina", tenantId] });
    await queryClient.invalidateQueries({ queryKey: ["detalles-nomina", tenantId] });
    await queryClient.invalidateQueries({ queryKey: ["anticipos-nomina", tenantId] });

    setPeriodoSeleccionado(nuevoPeriodo);
    setTabActual("PROCESADOR");
    setModalNuevoPeriodo(false);
    toast.success(`Nómina creada para ${empleadosActivos.length} empleado(s)`);
  };

  function recalcularDetalleConIngresos(
    detalle: DetalleNomina,
    cambios: Partial<DetalleNomina>,
  ): DetalleNomina {
    const updated = { ...detalle, ...cambios };
    const empleado = updated.empleado || empleados.find((item) => item.id === updated.empleado_id);
    const totalIngresos = +(
      Number(updated.salario_base_periodo || 0) +
      Number(updated.horas_extras || 0) +
      Number(updated.comisiones_destajo || 0) +
      Number(updated.bonos_incentivos || 0) +
      Number(updated.otros_ingresos || 0)
    ).toFixed(2);
    const divisor =
      periodoSeleccionado?.frecuencia === "QUINCENAL"
        ? 2
        : periodoSeleccionado?.frecuencia === "SEMANAL"
          ? 4
          : 1;
    const tss = empleado?.aplica_tss ? calcularTSS(totalIngresos) : { afp: 0, sfs: 0, totalTSS: 0 };
    const isrMensual = empleado?.aplica_isr
      ? calcularISRDGII(totalIngresos * divisor, tss.totalTSS * divisor)
      : 0;
    const isrRetencion = +(isrMensual / divisor).toFixed(2);
    const totalDeducciones = +(
      Number(updated.anticipos_descontados || 0) +
      tss.afp +
      tss.sfs +
      isrRetencion +
      Number(updated.otras_deducciones || 0)
    ).toFixed(2);

    return {
      ...updated,
      tss_afp: tss.afp,
      tss_sfs: tss.sfs,
      isr_retencion: isrRetencion,
      total_ingresos: totalIngresos,
      total_deducciones: totalDeducciones,
      neto_pagar: Math.max(0, +(totalIngresos - totalDeducciones).toFixed(2)),
    };
  }

  // Handler: Actualizar línea en procesador (Horas Extras, Bonos, etc.)
  const handleActualizarDetalle = async (
    detalle: DetalleNomina,
    campo: keyof DetalleNomina,
    valor: number,
  ) => {
    const finalDetalle = recalcularDetalleConIngresos(detalle, { [campo]: valor });

    // Actualizar en memoria y storage
    await saveDetallesNomina([finalDetalle]);

    // Recalcular totales del período
    if (periodoSeleccionado) {
      const otros = detallesDelPeriodo.filter((d) => d.id !== finalDetalle.id);
      const todos = [...otros, finalDetalle];
      const periodoActualizado: PeriodoNomina = {
        ...periodoSeleccionado,
        total_bruto: todos.reduce((a, b) => a + b.total_ingresos, 0),
        total_deducciones: todos.reduce((a, b) => a + b.total_deducciones, 0),
        total_neto: todos.reduce((a, b) => a + b.neto_pagar, 0),
      };
      await savePeriodoNomina(periodoActualizado);
      setPeriodoSeleccionado(periodoActualizado);
    }

    await queryClient.invalidateQueries({ queryKey: ["detalles-nomina", tenantId] });
    await queryClient.invalidateQueries({ queryKey: ["periodos-nomina", tenantId] });
  };

  // Handler: Actualizar Horas Extras (monto en pesos y cantidad de horas computadas)
  const handleActualizarHorasExtras = async (
    detalle: DetalleNomina,
    montoPesos: number,
    cantidadHoras: number,
  ) => {
    const finalDetalle = recalcularDetalleConIngresos(detalle, {
      horas_extras: montoPesos,
      cantidad_horas_extras: cantidadHoras,
    });

    await saveDetallesNomina([finalDetalle]);

    if (periodoSeleccionado) {
      const otros = detallesDelPeriodo.filter((d) => d.id !== finalDetalle.id);
      const todos = [...otros, finalDetalle];
      const periodoActualizado: PeriodoNomina = {
        ...periodoSeleccionado,
        total_bruto: todos.reduce((a, b) => a + b.total_ingresos, 0),
        total_deducciones: todos.reduce((a, b) => a + b.total_deducciones, 0),
        total_neto: todos.reduce((a, b) => a + b.neto_pagar, 0),
      };
      await savePeriodoNomina(periodoActualizado);
      setPeriodoSeleccionado(periodoActualizado);
    }

    await queryClient.invalidateQueries({ queryKey: ["detalles-nomina", tenantId] });
    await queryClient.invalidateQueries({ queryKey: ["periodos-nomina", tenantId] });
    toast.success(`Horas extras actualizadas (${cantidadHoras} hrs -> ${formatRD(montoPesos)})`);
  };

  // Handler: Confirmar y Pagar Nómina (Diseño nativo Klynn)
  const handleConfirmarPagarNomina = async () => {
    if (!periodoToPagar || isPaying || periodoToPagar.estado === "PAGADA") return;
    setIsPaying(true);
    try {
      const periodoPagado: PeriodoNomina = {
        ...periodoToPagar,
        estado: "PAGADA",
        actualizado_en: new Date().toISOString(),
      };
      // Actualizar estado de los detalles
      const detallesActualizados = detallesDelPeriodo.map((d) => ({
        ...d,
        pagado: true,
        fecha_pago: new Date().toISOString(),
      }));
      await saveDetallesNomina(detallesActualizados);

      // Registrar egreso contable en Gastos
      const gastoResult = await saveGasto({
        id: uid(),
        tenant_id: tenantId,
        empleado_id: user?.empleado?.id || "admin",
        categoria: "Nómina y Salarios",
        descripcion: `Pago de Nómina: ${periodoToPagar.nombre} (${detallesDelPeriodo.length} empleados)`,
        monto: periodoToPagar.total_neto,
        metodo_pago: "TRANSFERENCIA",
        fecha: new Date().toISOString(),
        aprobado: true,
      });

      const anticiposDelPeriodo = anticipos.filter(
        (anticipo) =>
          anticipo.periodo_nomina_id === periodoToPagar.id && anticipo.estado === "PENDIENTE",
      );
      for (const anticipo of anticiposDelPeriodo) {
        await saveAnticipoNomina({ ...anticipo, estado: "DESCONTADO" });
      }

      // El período se marca como pagado al final, después de guardar sus
      // detalles, el gasto contable y los anticipos aplicados.
      await savePeriodoNomina(periodoPagado);

      setPeriodoSeleccionado(periodoPagado);
      await queryClient.invalidateQueries({ queryKey: ["periodos-nomina", tenantId] });
      await queryClient.invalidateQueries({ queryKey: ["detalles-nomina", tenantId] });
      await queryClient.invalidateQueries({ queryKey: ["gastos", tenantId] });
      await queryClient.invalidateQueries({ queryKey: ["anticipos-nomina", tenantId] });
      if (gastoResult.queued) {
        toast.warning("Nómina pagada; el gasto quedó pendiente de sincronización", {
          description:
            "El pago se registró y el egreso se sincronizará automáticamente cuando Supabase esté disponible.",
          duration: 7000,
        });
      } else {
        toast.success("¡Nómina pagada y registrada en los gastos de la empresa!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al procesar el pago");
    } finally {
      setIsPaying(false);
      setPeriodoToPagar(null);
    }
  };

  // Handler: Confirmar Eliminación de Período de Nómina (Diseño nativo Klynn)
  const handleConfirmDeletePeriodo = async () => {
    if (!periodoToDelete) return;
    if (periodoToDelete.estado === "PAGADA") {
      toast.error(
        "Una nómina pagada no puede eliminarse. Debe anularse mediante un ajuste auditado.",
      );
      setPeriodoToDelete(null);
      return;
    }
    try {
      const anticiposReservados = anticipos.filter(
        (anticipo) => anticipo.periodo_nomina_id === periodoToDelete.id,
      );
      for (const anticipo of anticiposReservados) {
        await saveAnticipoNomina({
          ...anticipo,
          estado: "PENDIENTE",
          periodo_nomina_id: undefined,
        });
      }
      await deletePeriodoNomina(periodoToDelete.id, tenantId);
      if (periodoSeleccionado?.id === periodoToDelete.id) {
        setPeriodoSeleccionado(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["periodos-nomina", tenantId] });
      await queryClient.invalidateQueries({ queryKey: ["anticipos-nomina", tenantId] });
      toast.success(`Nómina "${periodoToDelete.nombre}" eliminada correctamente`);
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar nómina");
    } finally {
      setPeriodoToDelete(null);
    }
  };

  // Handler: Confirmar Anulación de Anticipo / Vale (Diseño nativo Klynn)
  const handleConfirmDeleteAnticipo = async () => {
    if (!anticipoToDelete) return;
    try {
      await deleteAnticipoNomina(anticipoToDelete.id, tenantId);
      await queryClient.invalidateQueries({ queryKey: ["anticipos-nomina", tenantId] });
      toast.success("Vale anulado correctamente");
    } catch (err: any) {
      toast.error(err?.message || "Error al anular vale");
    } finally {
      setAnticipoToDelete(null);
    }
  };

  // Handler: Crear Anticipo / Vale de Caja
  const handleCrearAnticipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anticipoForm.empleado_id) {
      toast.error("Seleccione un empleado");
      return;
    }
    if (anticipoForm.monto <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    const emp = empleados.find((e) => e.id === anticipoForm.empleado_id);
    const montoNum = Number(anticipoForm.monto);

    if (anticipoForm.descontar_caja) {
      if (!cajaAbierta) {
        toast.error("No hay caja abierta para entregar el efectivo del vale.");
        return;
      }

      // Registrar egreso en caja
      await saveMovimiento({
        id: uid(),
        caja_id: cajaAbierta.id,
        tenant_id: tenantId,
        tipo: "EGRESO",
        monto: montoNum,
        metodo: "EFECTIVO",
        concepto: `Vale / Anticipo de Nómina: ${emp?.nombre} ${emp?.apellido || ""}`,
        creado_en: new Date().toISOString(),
        empleado_id: user?.empleado?.id || "admin",
      });
    }

    const nuevoAnticipo: AnticipoNomina = {
      id: uid(),
      tenant_id: tenantId,
      empleado_id: anticipoForm.empleado_id,
      monto: montoNum,
      fecha: new Date().toISOString(),
      motivo: anticipoForm.motivo.trim() || "Vale de nómina",
      caja_id: anticipoForm.descontar_caja && cajaAbierta ? cajaAbierta.id : undefined,
      estado: "PENDIENTE",
      creado_por: user?.empleado?.id,
      creado_en: new Date().toISOString(),
    };

    await saveAnticipoNomina(nuevoAnticipo);
    await queryClient.invalidateQueries({ queryKey: ["anticipos-nomina", tenantId] });
    await queryClient.invalidateQueries({ queryKey: ["caja-abierta", tenantId] });
    await queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId] });

    toast.success(`Vale de ${formatRD(montoNum)} registrado a ${emp?.nombre}`);
    setModalNuevoAnticipo(false);
    setAnticipoForm({
      empleado_id: "",
      monto: 0,
      motivo: "Adelanto de sueldo",
      descontar_caja: true,
    });
  };

  const hasLoadedAny = empleados.length > 0 || periodos.length > 0;
  const borradorActivo = periodos.find((periodo) => periodo.estado === "BORRADOR");
  const periodoOperativo = periodoSeleccionado || borradorActivo || periodos[0] || null;
  if (
    !hasLoadedAny &&
    (loadingEmpleados || loadingPeriodos || loadingDetalles || loadingAnticipos)
  ) {
    return <GlobalPageLoader />;
  }

  if (!hasNominaModule) {
    return (
      <div className="min-h-[70vh] bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 shadow-2xs">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Nómina de Empleados & TSS / ISR
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              El módulo de <strong>Nómina de Empleados, Cálculos TSS / ISR y Anticipos</strong> no
              está incluido en tu plan actual. Actualiza tu suscripción para gestionar el personal y
              pagos de tu lavandería.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/t/$slug/configuracion"
              search={{ tab: "plan" }}
              params={{ slug: user?.tenant?.slug || "" }}
            >
              <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm shadow-md transition-colors cursor-pointer">
                Ver planes y actualizar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-none space-y-6 overflow-x-clip pb-24 font-sans">
      {/* Header */}
      <PageHeader
        title="Nómina"
        description="Prepara, revisa y registra el pago de tu equipo desde un solo lugar."
      >
        {periodoSeleccionado && (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold border border-emerald-600 shadow-xs hover:shadow cursor-pointer transition-all active:scale-95 shrink-0 whitespace-nowrap"
            onClick={() =>
              exportNominaToExcel({
                tenantName: user?.tenant?.nombre,
                tenantRnc: user?.tenant?.rnc,
                periodo: periodoSeleccionado,
                detalles: detallesDelPeriodo,
              })
            }
          >
            <FileSpreadsheet className="h-4 w-4 text-white" />
            <span>Exportar</span>
          </Button>
        )}

        <Button
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-xs shrink-0 whitespace-nowrap"
          onClick={() =>
            borradorActivo ? handleAbrirPeriodo(borradorActivo) : setModalNuevoPeriodo(true)
          }
        >
          {borradorActivo ? (
            <ListChecks className="h-4 w-4 text-white" />
          ) : (
            <Plus className="h-4 w-4 text-white" />
          )}
          <span>{borradorActivo ? "Continuar borrador" : "Nueva nómina"}</span>
        </Button>
      </PageHeader>

      {/* Resumen operativo: una sola superficie, sin tarjetas repetitivas. */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid md:grid-cols-[minmax(16rem,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="border-b border-border bg-primary px-5 py-4 text-primary-foreground md:border-b-0 md:border-r">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground/70">
                Estado operativo
              </span>
              {periodoOperativo && (
                <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
                  {periodoOperativo.estado === "PAGADA" ? "Pagada" : "En preparación"}
                </Badge>
              )}
            </div>
            <div className="mt-2 truncate text-lg font-black">
              {periodoOperativo?.nombre || "Aún no hay nóminas"}
            </div>
            {periodoOperativo ? (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 px-2.5 py-1 text-xs font-semibold text-primary-foreground/85">
                <Clock className="h-3.5 w-3.5" />
                <span>Pago {formatFechaLegible(periodoOperativo.fecha_pago)}</span>
              </div>
            ) : (
              <p className="mt-1 text-xs text-primary-foreground/70">
                Crea el primer período para comenzar.
              </p>
            )}
          </div>

          <div className="border-b border-border px-5 py-4 md:border-b-0 md:border-r">
            <span className="text-xs font-semibold text-muted-foreground">Neto del período</span>
            <div className="mt-1 text-xl font-black tabular-nums text-foreground">
              {formatRD(periodoOperativo?.total_neto || 0)}
            </div>
          </div>
          <div className="border-b border-border px-5 py-4 md:border-b-0 md:border-r">
            <span className="text-xs font-semibold text-muted-foreground">Colaboradores</span>
            <div className="mt-1 text-xl font-black tabular-nums text-foreground">
              {stats.totalEmpleadosActivos}
            </div>
          </div>
          <div className="px-5 py-4">
            <span className="text-xs font-semibold text-muted-foreground">
              Anticipos pendientes
            </span>
            <div className="mt-1 text-xl font-black tabular-nums text-amber-700 dark:text-amber-300">
              {formatRD(stats.totalAnticiposPendientes)}
            </div>
          </div>
        </div>
      </section>

      {/* Dos áreas principales. Historial y regalía son vistas internas de Nóminas. */}
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-xl border border-border bg-muted/70 p-1 shadow-xs">
          <Button
            variant={tabActual !== "ANTICIPOS" ? "default" : "ghost"}
            onClick={() => setTabActual("PERIODOS")}
            aria-pressed={tabActual !== "ANTICIPOS"}
            className={`h-11 gap-2 rounded-lg px-5 text-sm font-bold whitespace-nowrap active:translate-y-px ${
              tabActual !== "ANTICIPOS"
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Nóminas</span>
          </Button>
          <Button
            variant={tabActual === "ANTICIPOS" ? "default" : "ghost"}
            onClick={() => setTabActual("ANTICIPOS")}
            aria-pressed={tabActual === "ANTICIPOS"}
            className={`h-11 gap-2 rounded-lg px-5 text-sm font-bold whitespace-nowrap active:translate-y-px ${
              tabActual === "ANTICIPOS"
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Banknote className="h-4 w-4" />
            <span>Anticipos</span>
          </Button>
        </div>

        {tabActual !== "ANTICIPOS" && (
          <div className="inline-flex w-fit items-center rounded-xl border border-border bg-card p-1 shadow-xs">
            <Button
              variant={tabActual === "PERIODOS" ? "default" : "ghost"}
              onClick={() => setTabActual("PERIODOS")}
              aria-pressed={tabActual === "PERIODOS"}
              className={`h-11 gap-2 rounded-lg px-5 text-sm font-bold whitespace-nowrap active:translate-y-px ${
                tabActual === "PERIODOS"
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="h-4 w-4" />
              Historial
            </Button>
            <Button
              variant={tabActual === "REGALIA" ? "default" : "ghost"}
              onClick={() => setTabActual("REGALIA")}
              aria-pressed={tabActual === "REGALIA"}
              className={`h-11 gap-2 rounded-lg px-5 text-sm font-bold whitespace-nowrap active:translate-y-px ${
                tabActual === "REGALIA"
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Gift className="h-4 w-4" />
              Regalía {currentYear}
            </Button>
          </div>
        )}
      </div>

      {/* TAB 1: HISTORIAL DE PERÍODOS */}
      {tabActual === "PERIODOS" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-foreground">Historial de nóminas</h2>
              <p className="text-sm text-muted-foreground">
                Consulta, continúa o exporta cada período sin perder el contexto.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={periodSearch}
                  onChange={(event) => setPeriodSearch(event.target.value)}
                  placeholder="Buscar período…"
                  className="h-9 rounded-xl pl-9"
                />
              </div>
              <Select
                value={periodStatusFilter}
                onValueChange={(value: "TODOS" | "BORRADOR" | "PAGADA") =>
                  setPeriodStatusFilter(value)
                }
              >
                <SelectTrigger className="h-9 w-full rounded-xl sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="BORRADOR">Borradores</SelectItem>
                  <SelectItem value="PAGADA">Pagadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {periodos.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Calendar className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <p className="text-base font-medium">No se ha generado ninguna nómina todavía.</p>
              <p className="text-xs mt-1">
                Haz clic en "Generar Período de Nómina" para liquidar a tu personal.
              </p>
            </Card>
          ) : periodosFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-semibold text-foreground">No encontramos períodos</p>
              <p className="mt-1 text-xs text-muted-foreground">Prueba con otro nombre o estado.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="hidden grid-cols-[minmax(17rem,1.45fr)_minmax(20rem,1.35fr)_7rem_minmax(10rem,1fr)_8rem] items-center gap-4 border-b border-border bg-muted/45 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground lg:grid">
                <span className="text-center">Período</span>
                <span className="text-center">Fechas</span>
                <span className="text-center">Equipo</span>
                <span className="text-center">Neto</span>
                <span className="text-center">Acción</span>
              </div>
              <div className="divide-y divide-border">
                {periodosFiltrados.map((p) => {
                  const isSelected = periodoSeleccionado?.id === p.id;
                  const isPagada = p.estado === "PAGADA";

                  return (
                    <div
                      key={p.id}
                      className={`grid gap-4 px-5 py-4 lg:grid-cols-[minmax(17rem,1.45fr)_minmax(20rem,1.35fr)_7rem_minmax(10rem,1fr)_8rem] lg:items-center ${
                        isSelected ? "bg-primary/[0.035]" : "bg-card hover:bg-muted/20"
                      }`}
                    >
                      <div className="min-w-0 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <h3 className="truncate font-bold text-foreground">{p.nombre}</h3>
                          <Badge
                            variant="outline"
                            className={
                              isPagada
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                            }
                          >
                            {isPagada ? "Pagada" : "Borrador"}
                          </Badge>
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{p.codigo}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground lg:justify-center">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 font-bold text-foreground">
                            <span>{formatFechaLegible(p.fecha_inicio)}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{formatFechaLegible(p.fecha_fin)}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Pago {formatFechaLegible(p.fecha_pago)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between lg:block lg:text-center">
                        <span className="text-xs text-muted-foreground lg:hidden">
                          Colaboradores
                        </span>
                        <span className="font-bold tabular-nums text-foreground">
                          {p.total_empleados}
                        </span>
                      </div>
                      <div className="flex items-center justify-between lg:block lg:text-center">
                        <span className="text-xs text-muted-foreground lg:hidden">Neto</span>
                        <span className="font-black tabular-nums text-foreground">
                          {formatRD(p.total_neto)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1 lg:justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 font-semibold whitespace-nowrap"
                          onClick={() => handleAbrirPeriodo(p)}
                        >
                          <span>Abrir</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                        {!isPagada && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Eliminar borrador"
                            onClick={() => setPeriodoToDelete(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROCESADOR DE NÓMINA ACTUAL */}
      {tabActual === "PROCESADOR" && (
        <div className="space-y-4">
          {!periodoSeleccionado ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Layers className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <p className="text-base font-medium">
                Selecciona un período de nómina para editar o visualizar.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setTabActual("PERIODOS")}
              >
                Ver Historial de Períodos
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setTabActual("PERIODOS")}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver al historial
              </button>

              {/* Cabecera del flujo */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-foreground">
                        {periodoSeleccionado.nombre}
                      </h3>
                      <Badge
                        variant="outline"
                        className={
                          periodoSeleccionado.estado === "PAGADA"
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold pointer-events-none select-none hover:bg-emerald-50"
                            : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold pointer-events-none select-none hover:bg-amber-50"
                        }
                      >
                        {periodoSeleccionado.estado}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatFechaLegible(periodoSeleccionado.fecha_inicio)} –{" "}
                          {formatFechaLegible(periodoSeleccionado.fecha_fin)}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Pago:{" "}
                        <strong className="tabular-nums text-foreground">
                          {formatFechaLegible(periodoSeleccionado.fecha_pago)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-4 lg:justify-end">
                    <div className="lg:text-right">
                      <div className="text-xs text-muted-foreground font-medium">
                        Total a Dispersar
                      </div>
                      <div className="text-2xl font-black text-foreground tabular-nums tracking-tight">
                        {formatRD(periodoSeleccionado.total_neto)}
                      </div>
                    </div>

                    {periodoSeleccionado.estado !== "PAGADA" && (
                      <Button
                        onClick={() => setPeriodoToPagar(periodoSeleccionado)}
                        disabled={isPaying}
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold whitespace-nowrap"
                      >
                        <ListChecks className="h-4 w-4" />
                        <span>Revisar y pagar</span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-xl border border-border text-xs">
                  <div className="border-r border-border bg-primary/5 px-3 py-2.5">
                    <span className="font-black text-primary">01</span>
                    <span className="ml-2 font-semibold text-foreground">Generada</span>
                  </div>
                  <div
                    className={`border-r border-border px-3 py-2.5 ${periodoSeleccionado.estado === "BORRADOR" ? "bg-amber-50 dark:bg-amber-950/20" : "bg-primary/5"}`}
                  >
                    <span className="font-black text-primary">02</span>
                    <span className="ml-2 font-semibold text-foreground">Revisión</span>
                  </div>
                  <div
                    className={
                      periodoSeleccionado.estado === "PAGADA"
                        ? "bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/20"
                        : "px-3 py-2.5"
                    }
                  >
                    <span className="font-black text-primary">03</span>
                    <span className="ml-2 font-semibold text-foreground">Pagada</span>
                  </div>
                </div>
              </div>

              {/* Barra superior de la planilla */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    Colaboradores en Planilla ({detallesDelPeriodo.length})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {periodoSeleccionado?.estado === "BORRADOR" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => sincronizarEmpleadosConBorrador(periodoSeleccionado, true)}
                      className="h-8 text-xs font-semibold gap-1.5"
                      title="Sincronizar colaboradores activos desde /personal"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Actualizar equipo</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Planilla compacta: ingresos y deducciones agrupados. */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="hidden grid-cols-[minmax(13rem,1.35fr)_minmax(13rem,1.25fr)_minmax(11rem,1fr)_minmax(8rem,.8fr)_6rem] gap-5 border-b border-border bg-muted/45 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground lg:grid">
                  <span>Colaborador</span>
                  <span>Ingresos</span>
                  <span>Deducciones</span>
                  <span className="text-right">Neto</span>
                  <span className="text-right">Acción</span>
                </div>

                {detallesDelPeriodo.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center">
                    <Users className="h-9 w-9 text-muted-foreground/60" />
                    <div>
                      <p className="font-semibold text-foreground">La planilla está vacía</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Carga los colaboradores activos para continuar.
                      </p>
                    </div>
                    {periodoSeleccionado.estado === "BORRADOR" && empleadosActivos.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => sincronizarEmpleadosConBorrador(periodoSeleccionado, true)}
                      >
                        Cargar equipo
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {detallesDelPeriodo.map((d) => {
                      const emp = d.empleado;
                      const nombreCompleto = emp
                        ? `${emp.nombre} ${emp.apellido || ""}`.trim()
                        : "Empleado";
                      const tssTotal = Number(d.tss_afp || 0) + Number(d.tss_sfs || 0);

                      return (
                        <div
                          key={d.id}
                          className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(13rem,1.35fr)_minmax(13rem,1.25fr)_minmax(11rem,1fr)_minmax(8rem,.8fr)_6rem] lg:items-center lg:gap-5"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-bold text-foreground">
                              {nombreCompleto}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="capitalize">{emp?.rol}</span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {d.metodo_pago === "TRANSFERENCIA" && emp?.banco_nombre
                                  ? emp.banco_nombre.replace("_", " ")
                                  : d.metodo_pago}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-xl bg-muted/35 p-3 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Sueldo base</span>
                              <strong className="tabular-nums text-foreground">
                                {formatRD(d.salario_base_periodo)}
                              </strong>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Horas extra</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold tabular-nums text-foreground">
                                  {formatRD(d.horas_extras || 0)}
                                </span>
                                {periodoSeleccionado.estado === "BORRADOR" && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setDetalleParaHorasExtras(d)}
                                    title="Calcular horas extras"
                                  >
                                    <Calculator className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Comisiones</span>
                              {periodoSeleccionado.estado === "PAGADA" ? (
                                <strong className="tabular-nums text-foreground">
                                  {formatRD(d.comisiones_destajo || 0)}
                                </strong>
                              ) : (
                                <PriceInput
                                  className="h-7 w-24 rounded-lg text-right text-xs font-bold tabular-nums"
                                  value={d.comisiones_destajo || 0}
                                  placeholder="0"
                                  onChange={(value) =>
                                    handleActualizarDetalle(d, "comisiones_destajo", value)
                                  }
                                />
                              )}
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                              <span className="font-semibold text-foreground">Bruto</span>
                              <strong className="tabular-nums text-foreground">
                                {formatRD(d.total_ingresos)}
                              </strong>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Anticipos</span>
                              <span className="tabular-nums text-foreground">
                                {formatRD(d.anticipos_descontados || 0)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">TSS</span>
                              <span className="tabular-nums text-foreground">
                                {formatRD(tssTotal)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">ISR</span>
                              <span className="tabular-nums text-foreground">
                                {formatRD(d.isr_retencion || 0)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between border-t border-border pt-1.5 font-semibold">
                              <span>Total</span>
                              <span className="tabular-nums">
                                -{formatRD(d.total_deducciones || 0)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between lg:block lg:text-right">
                            <span className="text-xs font-semibold text-muted-foreground lg:hidden">
                              Neto a pagar
                            </span>
                            <span className="text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-300">
                              {formatRD(d.neto_pagar)}
                            </span>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-xs font-semibold whitespace-nowrap"
                              onClick={() => {
                                setDetalleParaRecibo(d);
                                setModalReciboImpresion(true);
                              }}
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span className="lg:sr-only">Recibo</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VALES Y ANTICIPOS DE CAJA */}
      {tabActual === "ANTICIPOS" && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-black text-foreground">Anticipos de sueldo</h2>
              <p className="text-sm text-muted-foreground">
                Registra entregas y controla en qué nómina serán descontadas.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setModalNuevoAnticipo(true)}
              className="gap-1.5 bg-primary text-primary-foreground font-bold whitespace-nowrap hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo anticipo</span>
            </Button>
          </div>

          {anticipos.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Banknote className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <p className="text-base font-medium">No se han registrado vales de anticipo.</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Empleado</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Motivo / Concepto</th>
                    <th className="py-3 px-4 text-right">Monto</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {anticipos.map((a) => {
                    const emp = a.empleado;
                    return (
                      <tr key={a.id} className="hover:bg-muted/20">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {emp ? `${emp.nombre} ${emp.apellido || ""}` : "Empleado"}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(a.fecha).toLocaleDateString("es-DO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {a.motivo || "Adelanto de nómina"}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {formatRD(a.monto)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={
                              a.estado === "PENDIENTE"
                                ? "bg-amber-100 text-amber-800 border-amber-200 font-semibold text-xs"
                                : "bg-slate-100 text-slate-700 border-slate-200 font-semibold text-xs"
                            }
                          >
                            {a.estado === "PENDIENTE" ? "Pendiente Descontar" : "Descontado"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {a.estado === "PENDIENTE" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                              title="Anular Vale"
                              onClick={() => setAnticipoToDelete(a)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REGALÍA PASCUAL (LEY 16-92) */}
      {tabActual === "REGALIA" && (
        <div className="space-y-4">
          <Card className="overflow-hidden border-border p-0">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1 p-5 sm:p-6">
                <h3 className="text-lg font-black text-foreground">
                  Regalía estimada · {currentYear}
                </h3>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  Estimación basada únicamente en los salarios ordinarios de las nóminas pagadas y
                  registradas en Klynn durante este año. Verifica el resultado con contabilidad
                  antes de liquidarlo.
                </p>
              </div>
              <div className="hidden self-stretch border-l border-border bg-muted/35 px-8 sm:flex sm:flex-col sm:justify-center">
                <span className="text-xs font-semibold text-muted-foreground">Total estimado</span>
                <strong className="mt-1 text-xl font-black tabular-nums text-foreground">
                  {formatRD(stats.totalRegaliaProyectada)}
                </strong>
              </div>
            </div>

            <div className="border-t border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/45 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-3 px-4">Empleado</th>
                      <th className="py-3 px-4 text-right">Salario Mensual</th>
                      <th className="py-3 px-4 text-right">Nóminas registradas</th>
                      <th className="py-3 px-4 text-right">Devengado registrado</th>
                      <th className="py-3 px-4 text-right font-bold text-foreground">
                        Regalía estimada
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {empleadosActivos.map((emp) => {
                      const sueldo = emp.salario_base || 0;
                      const registrado = regaliaRegistradaPorEmpleado.get(emp.id) || {
                        devengado: 0,
                        periodos: 0,
                      };
                      const regalia = calcularRegaliaPascual(registrado.devengado);

                      return (
                        <tr key={emp.id} className="hover:bg-muted/20">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {emp.nombre} {emp.apellido || ""}
                            <div className="text-xs font-normal capitalize text-muted-foreground">
                              {emp.rol}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">{formatRD(sueldo)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                            {registrado.periodos}
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground tabular-nums">
                            {formatRD(registrado.devengado)}
                          </td>
                          <td className="py-3 px-4 text-right text-base font-bold tabular-nums text-foreground">
                            {formatRD(regalia)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* DIALOG: GENERAR NUEVO PERÍODO */}
      <Dialog open={modalNuevoPeriodo} onOpenChange={setModalNuevoPeriodo}>
        <DialogContent className="flex max-h-[92vh] w-[94vw] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-none bg-background p-0 shadow-2xl text-foreground">
          {/* MODAL HEADER */}
          <div className="shrink-0 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 sm:p-4 pb-3 relative border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-3 pr-8">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs shrink-0">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-display font-bold text-foreground">
                  Generar Período de Nómina
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Carga automáticamente los salarios de tus empleados y deducciones vigentes.
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleCrearPeriodo} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto bg-muted/20 px-4 py-3.5 sm:px-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="nombre_periodo"
                  className="text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Nombre del Período*
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                  <Input
                    id="nombre_periodo"
                    value={periodoForm.nombre}
                    onChange={(e) =>
                      setPeriodoForm((prev) => ({ ...prev, nombre: e.target.value }))
                    }
                    required
                    placeholder="Ej. 1ra Quincena septiembre"
                    className="h-11 rounded-xl border border-slate-200 bg-white pl-9.5 text-xs font-medium text-foreground shadow-xs focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-slate-800 dark:bg-slate-950 sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Frecuencia de Pago*
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Select
                      value={periodoForm.frecuencia}
                      onValueChange={(val: any) => handleFrecuenciaChange(val)}
                    >
                      <SelectTrigger className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white pl-9.5 text-xs font-medium text-foreground shadow-xs focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-800 dark:bg-slate-950 sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900">
                        <SelectItem value="QUINCENAL" className="cursor-pointer text-xs sm:text-sm">
                          Quincenal (Días 15 y 30)
                        </SelectItem>
                        <SelectItem value="SEMANAL" className="cursor-pointer text-xs sm:text-sm">
                          Semanal (Operarios)
                        </SelectItem>
                        <SelectItem value="MENSUAL" className="cursor-pointer text-xs sm:text-sm">
                          Mensual
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="fecha_pago"
                    className="text-xs font-bold text-slate-600 dark:text-slate-400"
                  >
                    Fecha de Pago Programada*
                  </Label>
                  <DMYDatePicker
                    id="fecha_pago"
                    className="h-11 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs font-medium px-3"
                    value={periodoForm.fecha_pago}
                    onChange={handleFechaPagoChange}
                    onMonthChange={handleMonthNavigate}
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Día que se entrega el dinero (efectivo o banco).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="fecha_inicio"
                    className="text-xs font-bold text-slate-600 dark:text-slate-400"
                  >
                    Fecha Inicio (Corte)
                  </Label>
                  <DMYDatePicker
                    id="fecha_inicio"
                    className="h-11 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs font-medium px-3"
                    value={periodoForm.fecha_inicio}
                    onChange={handleFechaInicioChange}
                    onMonthChange={handleMonthNavigate}
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Primer día laborado del corte.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="fecha_fin"
                    className="text-xs font-bold text-slate-600 dark:text-slate-400"
                  >
                    Fecha Fin (Corte)
                  </Label>
                  <DMYDatePicker
                    id="fecha_fin"
                    className="h-11 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs font-medium px-3"
                    value={periodoForm.fecha_fin}
                    onChange={(val) => setPeriodoForm((prev) => ({ ...prev, fecha_fin: val }))}
                    onMonthChange={handleMonthNavigate}
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Último día laborado del corte.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl text-xs space-y-1 text-blue-900 dark:text-blue-200 shadow-xs">
                <p className="font-bold flex items-center gap-1.5 text-xs sm:text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  Cálculo Inteligente Automatizado
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Se incluirán {empleadosActivos.length} empleado(s) activos y se aplicarán
                  automáticamente las retenciones de TSS / ISR configuradas y los vales de caja
                  pendientes.
                </p>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/60 px-4 sm:px-5 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNuevoPeriodo(false)}
                className="h-11 rounded-xl px-4 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer shadow-xs active:translate-y-px px-5 text-xs sm:text-sm whitespace-nowrap"
              >
                Generar Nómina
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: REGISTRAR VALE / ANTICIPO */}
      <Dialog open={modalNuevoAnticipo} onOpenChange={setModalNuevoAnticipo}>
        <DialogContent className="flex max-h-[92vh] w-[94vw] max-w-md flex-col gap-0 overflow-hidden rounded-3xl border-none bg-background p-0 shadow-2xl text-foreground">
          {/* MODAL HEADER */}
          <div className="shrink-0 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 sm:p-4 pb-3 relative border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-3 pr-8">
              <div className="h-9 w-9 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center border border-border shadow-xs shrink-0">
                <Banknote className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-display font-bold text-foreground">
                  Registrar Vale / Anticipo
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Entrega un adelanto de sueldo y descuéntalo en la nómina correspondiente.
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleCrearAnticipo} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto bg-muted/20 px-4 py-3.5 sm:px-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Empleado Beneficiario*
                </Label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                  <Select
                    value={anticipoForm.empleado_id}
                    onValueChange={(val) =>
                      setAnticipoForm((prev) => ({ ...prev, empleado_id: val }))
                    }
                  >
                    <SelectTrigger className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white pl-9.5 text-xs font-medium text-foreground shadow-xs focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-800 dark:bg-slate-950 sm:text-sm">
                      <SelectValue placeholder="Seleccione el empleado..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900 max-h-56">
                      {empleadosActivos.map((emp) => (
                        <SelectItem
                          key={emp.id}
                          value={emp.id}
                          className="cursor-pointer text-xs sm:text-sm"
                        >
                          {emp.nombre} {emp.apellido || ""} ({emp.rol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="monto_anticipo"
                  className="text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Monto del Adelanto (RD$)*
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/80 pointer-events-none select-none z-10">
                    RD$
                  </span>
                  <PriceInput
                    id="monto_anticipo"
                    value={anticipoForm.monto || 0}
                    onChange={(val) => setAnticipoForm((prev) => ({ ...prev, monto: val }))}
                    placeholder="0.00"
                    required
                    className="h-11 rounded-xl border border-slate-200 bg-white pl-11 text-sm font-bold tabular-nums text-foreground shadow-xs focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-slate-800 dark:bg-slate-950 sm:text-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="motivo_anticipo"
                  className="text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Motivo / Concepto (Opcional)
                </Label>
                <div className="relative">
                  <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                  <Input
                    id="motivo_anticipo"
                    placeholder="Ej. Adelanto semanal, emergencia médica..."
                    value={anticipoForm.motivo}
                    onChange={(e) =>
                      setAnticipoForm((prev) => ({ ...prev, motivo: e.target.value }))
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white pl-9.5 text-xs font-medium text-foreground shadow-xs focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-slate-800 dark:bg-slate-950 sm:text-sm"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5 shadow-xs">
                <Checkbox
                  id="descontar_caja_vale"
                  checked={anticipoForm.descontar_caja}
                  onCheckedChange={(c) =>
                    setAnticipoForm((prev) => ({ ...prev, descontar_caja: !!c }))
                  }
                  className="mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <label
                    htmlFor="descontar_caja_vale"
                    className="font-bold text-foreground cursor-pointer text-xs sm:text-sm"
                  >
                    Entregar efectivo desde la Caja Abierta del Turno
                  </label>
                  <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                    Genera automáticamente una salida de caja registrada en el cuadre del turno
                    activo actual.
                  </p>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/60 px-4 sm:px-5 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNuevoAnticipo(false)}
                className="h-11 rounded-xl px-4 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border border-primary font-extrabold cursor-pointer shadow-xs active:translate-y-px px-4 text-xs sm:text-sm whitespace-nowrap"
              >
                Registrar Vale ({formatRD(anticipoForm.monto || 0)})
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: RECIBO DE PAGO IMPRIMIBLE */}
      <Dialog open={modalReciboImpresion} onOpenChange={setModalReciboImpresion}>
        <DialogContent className="flex max-h-[92vh] w-[94vw] max-w-lg print:max-w-none flex-col gap-0 overflow-hidden rounded-3xl border-none bg-background p-0 shadow-2xl text-foreground">
          {/* MODAL HEADER */}
          <div className="shrink-0 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 sm:p-4 pb-3 relative border-b border-slate-100 dark:border-slate-800/60 print:hidden">
            <div className="flex items-center gap-3 pr-8">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs shrink-0">
                <Printer className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-display font-bold text-foreground">
                  Recibo de Pago de Nómina
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Volante de pago y conformidad salarial imprimible.
                </DialogDescription>
              </div>
            </div>
          </div>

          {detalleParaRecibo && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 sm:px-5 py-3.5">
                {/* Formato Recibo Térmico */}
                <div
                  id="recibo-nomina-print"
                  className="p-5 bg-white text-black font-sans text-xs border border-slate-200 rounded-2xl shadow-inner space-y-3"
                >
                  <div className="text-center space-y-1">
                    <h4 className="font-black text-sm uppercase tracking-wide">
                      {user?.tenant?.nombre || "Klynn Lavandería"}
                    </h4>
                    <p className="text-[10px] text-slate-500">RNC: {user?.tenant?.rnc || "N/D"}</p>
                    <p className="text-[10px] font-black border-t border-b border-dashed border-slate-300 py-1.5 uppercase tracking-wider">
                      VOLANTE DE PAGO DE NÓMINA
                    </p>
                    <p className="text-[11px] font-bold">{periodoSeleccionado?.nombre}</p>
                  </div>

                  <div className="space-y-1 border-b border-dashed border-slate-300 pb-2">
                    <p>
                      <strong>Empleado:</strong> {detalleParaRecibo.empleado?.nombre}{" "}
                      {detalleParaRecibo.empleado?.apellido || ""}
                    </p>
                    <p>
                      <strong>Puesto:</strong> {detalleParaRecibo.empleado?.rol}
                    </p>
                    <p>
                      <strong>Fecha Pago:</strong> {formatFechaDMY(periodoSeleccionado?.fecha_pago)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold text-[11px]">INGRESOS:</p>
                    <div className="flex justify-between">
                      <span>Sueldo Base Período:</span>
                      <span className="font-bold tabular-nums">
                        {formatRD(detalleParaRecibo.salario_base_periodo)}
                      </span>
                    </div>
                    {detalleParaRecibo.horas_extras > 0 && (
                      <div className="flex justify-between">
                        <span>
                          Horas Extras{" "}
                          {detalleParaRecibo.cantidad_horas_extras
                            ? `(${detalleParaRecibo.cantidad_horas_extras}h)`
                            : ""}
                          :
                        </span>
                        <span className="font-bold tabular-nums">
                          {formatRD(detalleParaRecibo.horas_extras)}
                        </span>
                      </div>
                    )}
                    {detalleParaRecibo.comisiones_destajo > 0 && (
                      <div className="flex justify-between">
                        <span>Comisiones / Piezas:</span>
                        <span className="font-bold tabular-nums">
                          {formatRD(detalleParaRecibo.comisiones_destajo)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-slate-300 pt-1">
                      <span>TOTAL BRUTO:</span>
                      <span className="tabular-nums">
                        {formatRD(detalleParaRecibo.total_ingresos)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold text-[11px]">DEDUCCIONES:</p>
                    {detalleParaRecibo.anticipos_descontados > 0 && (
                      <div className="flex justify-between text-red-600 font-medium">
                        <span>Anticipos / Vales:</span>
                        <span className="tabular-nums">
                          -{formatRD(detalleParaRecibo.anticipos_descontados)}
                        </span>
                      </div>
                    )}
                    {detalleParaRecibo.tss_afp > 0 && (
                      <div className="flex justify-between">
                        <span>AFP (2.87%):</span>
                        <span className="tabular-nums">-{formatRD(detalleParaRecibo.tss_afp)}</span>
                      </div>
                    )}
                    {detalleParaRecibo.tss_sfs > 0 && (
                      <div className="flex justify-between">
                        <span>SFS (3.04%):</span>
                        <span className="tabular-nums">-{formatRD(detalleParaRecibo.tss_sfs)}</span>
                      </div>
                    )}
                    {detalleParaRecibo.isr_retencion > 0 && (
                      <div className="flex justify-between">
                        <span>ISR Retenido (DGII):</span>
                        <span className="tabular-nums">
                          -{formatRD(detalleParaRecibo.isr_retencion)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-slate-300 pt-1">
                      <span>TOTAL DEDUCCIONES:</span>
                      <span className="tabular-nums text-rose-600">
                        -{formatRD(detalleParaRecibo.total_deducciones)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between font-black text-sm border-t-2 border-b-2 border-slate-900 py-1.5">
                    <span>NETO A RECIBIR:</span>
                    <span className="tabular-nums">{formatRD(detalleParaRecibo.neto_pagar)}</span>
                  </div>

                  <div className="pt-8 text-center space-y-1">
                    <div className="border-t border-black w-48 mx-auto" />
                    <p className="text-[10px] text-slate-600">Firma de Conformidad del Empleado</p>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/60 px-4 sm:px-5 py-3 print:hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalReciboImpresion(false)}
                  className="cursor-pointer h-9.5 px-4 text-xs sm:text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="gap-2 font-bold cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs active:translate-y-px h-9.5 px-5 text-xs sm:text-sm rounded-xl whitespace-nowrap"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir Volante</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMACIÓN: Eliminar Período de Nómina */}
      <AlertDialog
        open={Boolean(periodoToDelete)}
        onOpenChange={(open) => !open && setPeriodoToDelete(null)}
      >
        <AlertDialogContent className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 max-w-[420px] p-5 sm:p-6">
          <AlertDialogHeader>
            <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-1 border border-rose-100 dark:border-rose-900/50 shadow-xs">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              ¿Eliminar período de nómina?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Estás a punto de eliminar la nómina{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                "{periodoToDelete?.nombre}"
              </strong>
              . Esta acción eliminará el registro de este corte y sus líneas asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2 pt-3">
            <AlertDialogCancel className="rounded-xl h-9.5 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeletePeriodo}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-9.5 text-xs sm:text-sm font-bold shadow-xs cursor-pointer border-none"
            >
              Sí, eliminar nómina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO DE CONFIRMACIÓN: Anular Vale / Anticipo */}
      <AlertDialog
        open={Boolean(anticipoToDelete)}
        onOpenChange={(open) => !open && setAnticipoToDelete(null)}
      >
        <AlertDialogContent className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 max-w-[420px] p-5 sm:p-6">
          <AlertDialogHeader>
            <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-1 border border-rose-100 dark:border-rose-900/50 shadow-xs">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              ¿Anular este vale de caja?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Estás a punto de anular el vale por un monto de{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {formatRD(anticipoToDelete?.monto || 0)}
              </strong>
              . Ya no será descontado en la nómina.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2 pt-3">
            <AlertDialogCancel className="rounded-xl h-9.5 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAnticipo}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-9.5 text-xs sm:text-sm font-bold shadow-xs cursor-pointer border-none"
            >
              Sí, anular vale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO DE CONFIRMACIÓN: Aprobar y Pagar Nómina */}
      <AlertDialog
        open={Boolean(periodoToPagar)}
        onOpenChange={(open) => !open && setPeriodoToPagar(null)}
      >
        <AlertDialogContent className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 max-w-[440px] p-5 sm:p-6">
          <AlertDialogHeader>
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-1 border border-emerald-100 dark:border-emerald-900/50 shadow-xs">
              <Banknote className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              ¿Aprobar y Pagar Nómina?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Se marcará como pagada la nómina{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                "{periodoToPagar?.nombre}"
              </strong>{" "}
              por un total neto de{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                {formatRD(periodoToPagar?.total_neto || 0)}
              </strong>
              . Se registrará el egreso contable en gastos de la empresa automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2 pt-3">
            <AlertDialogCancel className="rounded-xl h-9.5 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarPagarNomina}
              disabled={isPaying}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-9.5 text-xs sm:text-sm font-bold shadow-xs cursor-pointer border-none px-4"
            >
              {isPaying ? "Registrando pago…" : "Confirmar y pagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO: CALCULADORA DE HORAS EXTRAS (LEY 16-92) */}
      <ModalCalculadoraHorasExtras
        open={Boolean(detalleParaHorasExtras)}
        onOpenChange={(open) => !open && setDetalleParaHorasExtras(null)}
        detalle={detalleParaHorasExtras}
        frecuenciaPeriodo={periodoSeleccionado?.frecuencia}
        onSave={handleActualizarHorasExtras}
      />
    </div>
  );
}
