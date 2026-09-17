import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
  const hasNominaModule = isAuthLoading ? true : isModuleEnabled(user?.tenant || null, "nomina", activePlan);

  // Estados de vista
  const [tabActual, setTabActual] = useState<"PERIODOS" | "PROCESADOR" | "ANTICIPOS" | "REGALIA">("PERIODOS");
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

  // Formulario Nuevo Período
  const [periodoForm, setPeriodoForm] = useState({
    nombre: "1ra Quincena " + new Date().toLocaleString("es-DO", { month: "long" }),
    frecuencia: "QUINCENAL" as FrecuenciaNomina,
    fecha_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    fecha_fin: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split("T")[0],
    fecha_pago: new Date().toISOString().split("T")[0],
  });

  // Formulario Nuevo Anticipo
  const [anticipoForm, setAnticipoForm] = useState({
    empleado_id: "",
    monto: 0,
    motivo: "Adelanto de sueldo",
    descontar_caja: true,
  });

  // Empleados activos
  const empleadosActivos = useMemo(() => empleados.filter((e) => e.activo), [empleados]);

  // Anticipos pendientes de descontar
  const anticiposPendientes = useMemo(
    () => anticipos.filter((a) => a.estado === "PENDIENTE"),
    [anticipos]
  );

  const totalAnticiposPendientes = useMemo(
    () => anticiposPendientes.reduce((acc, a) => acc + a.monto, 0),
    [anticiposPendientes]
  );

  // Detalles del período seleccionado
  const detallesDelPeriodo = useMemo(() => {
    if (!periodoSeleccionado) return [];
    return todosDetalles.filter((d) => d.periodo_id === periodoSeleccionado.id);
  }, [todosDetalles, periodoSeleccionado]);

  // Modo adaptable: visibilidad inteligente de columnas de deducciones
  const [mostrarTodasColumnas, setMostrarTodasColumnas] = useState(false);

  // Detección inteligente de deducciones presentes en la planilla
  const tieneVales = useMemo(() => {
    return detallesDelPeriodo.some((d) => (d.anticipos_descontados || 0) > 0);
  }, [detallesDelPeriodo]);

  const tieneTss = useMemo(() => {
    return detallesDelPeriodo.some(
      (d) => ((d.tss_afp || 0) + (d.tss_sfs || 0)) > 0 || Boolean(d.empleado?.aplica_tss)
    );
  }, [detallesDelPeriodo]);

  const tieneIsr = useMemo(() => {
    return detallesDelPeriodo.some(
      (d) => (d.isr_retencion || 0) > 0 || Boolean(d.empleado?.aplica_isr)
    );
  }, [detallesDelPeriodo]);

  const tieneDeducciones = tieneVales || tieneTss || tieneIsr;

  // Visibilidad final de cada columna de retención / ingreso
  const showVales = mostrarTodasColumnas || tieneVales;
  const showTss = mostrarTodasColumnas || tieneTss;
  const showIsr = mostrarTodasColumnas || tieneIsr;
  const showBruto = mostrarTodasColumnas || tieneDeducciones;

  // Estadísticas generales
  const stats = useMemo(() => {
    const ultimoPeriodo = periodos[0];
    const totalUltimaNomina = ultimoPeriodo ? ultimoPeriodo.total_neto : 0;
    const totalRegaliaProyectada = empleadosActivos.reduce((acc, emp) => {
      const sueldoMensual = emp.salario_base || 0;
      // Proyección anual: duodécima parte de 12 meses (o acumulado)
      return acc + calcularRegaliaPascual(sueldoMensual * 12);
    }, 0);

    return {
      totalUltimaNomina,
      totalAnticiposPendientes,
      totalRegaliaProyectada,
      totalEmpleadosActivos: empleadosActivos.length,
    };
  }, [periodos, empleadosActivos, totalAnticiposPendientes]);

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

    const nuevosDetalles: DetalleNomina[] = empleadosActivos.map((emp) => {
      const sueldoMensual = emp.salario_base || 0;
      const sueldoPeriodo = +(sueldoMensual / divisorFrecuencia).toFixed(2);

      // Buscar anticipos pendientes de este empleado
      const anticiposEmp = anticiposPendientes.filter((a) => a.empleado_id === emp.id);
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
        metodo_pago: (emp.metodo_pago as any) || (emp.numero_cuenta_banco ? "TRANSFERENCIA" : "EFECTIVO"),
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
      total_bruto: +(totalBruto).toFixed(2),
      total_deducciones: +(totalDeducciones).toFixed(2),
      total_neto: +(totalNeto).toFixed(2),
      total_empleados: empleadosActivos.length,
      estado: "BORRADOR",
      creado_por: user?.empleado?.id,
      creado_en: new Date().toISOString(),
    };

    await savePeriodoNomina(nuevoPeriodo);
    await saveDetallesNomina(nuevosDetalles);

    // Marcar anticipos aplicados
    for (const a of anticiposPendientes) {
      if (nuevosDetalles.some((d) => d.empleado_id === a.empleado_id && d.anticipos_descontados > 0)) {
        await saveAnticipoNomina({ ...a, estado: "DESCONTADO", periodo_nomina_id: periodoId });
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

  // Handler: Actualizar línea en procesador (Horas Extras, Bonos, etc.)
  const handleActualizarDetalle = async (
    detalle: DetalleNomina,
    campo: keyof DetalleNomina,
    valor: number
  ) => {
    const updated = { ...detalle, [campo]: valor };

    const totalIngresos = +(
      Number(updated.salario_base_periodo || 0) +
      Number(updated.horas_extras || 0) +
      Number(updated.comisiones_destajo || 0) +
      Number(updated.bonos_incentivos || 0) +
      Number(updated.otros_ingresos || 0)
    ).toFixed(2);

    const totalDeducciones = +(
      Number(updated.anticipos_descontados || 0) +
      Number(updated.tss_afp || 0) +
      Number(updated.tss_sfs || 0) +
      Number(updated.isr_retencion || 0) +
      Number(updated.otras_deducciones || 0)
    ).toFixed(2);

    const netoPagar = Math.max(0, +(totalIngresos - totalDeducciones).toFixed(2));

    const finalDetalle: DetalleNomina = {
      ...updated,
      total_ingresos: totalIngresos,
      total_deducciones: totalDeducciones,
      neto_pagar: netoPagar,
    };

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
    cantidadHoras: number
  ) => {
    const updated = {
      ...detalle,
      horas_extras: montoPesos,
      cantidad_horas_extras: cantidadHoras,
    };

    const totalIngresos = +(
      Number(updated.salario_base_periodo || 0) +
      Number(updated.horas_extras || 0) +
      Number(updated.comisiones_destajo || 0) +
      Number(updated.bonos_incentivos || 0) +
      Number(updated.otros_ingresos || 0)
    ).toFixed(2);

    const totalDeducciones = +(
      Number(updated.anticipos_descontados || 0) +
      Number(updated.tss_afp || 0) +
      Number(updated.tss_sfs || 0) +
      Number(updated.isr_retencion || 0) +
      Number(updated.otras_deducciones || 0)
    ).toFixed(2);

    const netoPagar = Math.max(0, +(totalIngresos - totalDeducciones).toFixed(2));

    const finalDetalle: DetalleNomina = {
      ...updated,
      total_ingresos: totalIngresos,
      total_deducciones: totalDeducciones,
      neto_pagar: netoPagar,
    };

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
    if (!periodoToPagar) return;
    try {
      const periodoPagado: PeriodoNomina = {
        ...periodoToPagar,
        estado: "PAGADA",
        actualizado_en: new Date().toISOString(),
      };
      await savePeriodoNomina(periodoPagado);

      // Actualizar estado de los detalles
      const detallesActualizados = detallesDelPeriodo.map((d) => ({
        ...d,
        pagado: true,
        fecha_pago: new Date().toISOString(),
      }));
      await saveDetallesNomina(detallesActualizados);

      // Registrar egreso contable en Gastos
      await saveGasto({
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

      setPeriodoSeleccionado(periodoPagado);
      await queryClient.invalidateQueries({ queryKey: ["periodos-nomina", tenantId] });
      await queryClient.invalidateQueries({ queryKey: ["detalles-nomina", tenantId] });
      await queryClient.invalidateQueries({ queryKey: ["gastos", tenantId] });
      toast.success("¡Nómina pagada y registrada en los gastos de la empresa!");
    } catch (err: any) {
      toast.error(err?.message || "Error al procesar el pago");
    } finally {
      setPeriodoToPagar(null);
    }
  };

  // Handler: Confirmar Eliminación de Período de Nómina (Diseño nativo Klynn)
  const handleConfirmDeletePeriodo = async () => {
    if (!periodoToDelete) return;
    try {
      await deletePeriodoNomina(periodoToDelete.id, tenantId);
      if (periodoSeleccionado?.id === periodoToDelete.id) {
        setPeriodoSeleccionado(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["periodos-nomina", tenantId] });
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

  if (loadingEmpleados || loadingPeriodos || loadingDetalles || loadingAnticipos) {
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
              El módulo de <strong>Nómina de Empleados, Cálculos TSS / ISR y Anticipos</strong> no está incluido en tu plan actual. Actualiza tu suscripción para gestionar el personal y pagos de tu lavandería.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/t/$slug/configuracion"
              search={{ tab: "plan" }}
              params={{ slug: user?.tenant?.slug || "" }}
            >
              <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 cursor-pointer">
                Ver planes y actualizar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 font-sans">
      {/* Header */}
      <PageHeader
        title="Nómina de Empleados"
        description="Gestión de compensaciones, quincenas, deducciones de ley (TSS/ISR), anticipos y regalía"
      >
        {periodoSeleccionado && (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold border border-emerald-600 shadow-xs hover:shadow cursor-pointer transition-all active:scale-95 shrink-0"
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
            <span>Exportar Excel &amp; Dispersión</span>
          </Button>
        )}

        <Button
          className="gap-2 bg-[#F0B900] hover:bg-[#d9a700] text-[#1B4B73] border border-[#d4a300] font-bold shadow-xs hover:shadow cursor-pointer transition-all active:scale-95 shrink-0"
          onClick={() => setModalNuevoAnticipo(true)}
        >
          <Banknote className="h-4 w-4 text-[#1B4B73]" />
          <span>Registrar Vale / Anticipo</span>
        </Button>

        <Button
          className="gap-2 bg-[#1B4B73] hover:bg-[#133857] text-white font-bold border border-[#133857] shadow-xs hover:shadow cursor-pointer transition-all active:scale-95 shrink-0"
          onClick={() => setModalNuevoPeriodo(true)}
        >
          <Plus className="h-4 w-4 text-white" />
          <span>Generar Período de Nómina</span>
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            Última Nómina Neta
          </div>
          <div className="text-xl md:text-2xl font-black text-foreground mt-2 tracking-tight">
            {formatRD(stats.totalUltimaNomina)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {periodos[0]?.nombre || "Sin períodos"}
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 text-amber-500" />
            Vales Pendientes en Caja
          </div>
          <div className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 tracking-tight">
            {formatRD(stats.totalAnticiposPendientes)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {anticiposPendientes.length} anticipos por deducir
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Gift className="h-3.5 w-3.5 text-rose-500" />
            Regalía Pascual
          </div>
          <div className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 tracking-tight">
            {formatRD(stats.totalRegaliaProyectada)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Salario de Navidad</div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            Personal en Nómina
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
            {stats.totalEmpleadosActivos}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Operarios, recepción y delivery</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <Button
          variant={tabActual === "PERIODOS" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTabActual("PERIODOS")}
          className={`font-semibold gap-1.5 cursor-pointer transition-colors ${
            tabActual === "PERIODOS" ? "bg-[#1B4B73] hover:bg-[#133857] text-white" : ""
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Historial de Períodos</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {periodos.length}
          </Badge>
        </Button>

        <Button
          variant={tabActual === "PROCESADOR" ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            if (!periodoSeleccionado && periodos.length > 0) {
              setPeriodoSeleccionado(periodos[0]);
            }
            setTabActual("PROCESADOR");
          }}
          className={`font-semibold gap-1.5 cursor-pointer transition-colors ${
            tabActual === "PROCESADOR" ? "bg-[#1B4B73] hover:bg-[#133857] text-white" : ""
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>
            {periodoSeleccionado ? `Nómina: ${periodoSeleccionado.nombre}` : "Procesador de Nómina"}
          </span>
        </Button>

        <Button
          variant={tabActual === "ANTICIPOS" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTabActual("ANTICIPOS")}
          className={`font-semibold gap-1.5 cursor-pointer transition-colors ${
            tabActual === "ANTICIPOS" ? "bg-[#1B4B73] hover:bg-[#133857] text-white" : ""
          }`}
        >
          <Banknote className="h-4 w-4" />
          <span>Vales &amp; Anticipos de Caja</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {anticipos.length}
          </Badge>
        </Button>

        <Button
          variant={tabActual === "REGALIA" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTabActual("REGALIA")}
          className={`font-semibold gap-1.5 cursor-pointer transition-colors ${
            tabActual === "REGALIA" ? "bg-[#1B4B73] hover:bg-[#133857] text-white" : ""
          }`}
        >
          <Gift className="h-4 w-4" />
          <span>Regalía Pascual</span>
        </Button>
      </div>

      {/* TAB 1: HISTORIAL DE PERÍODOS */}
      {tabActual === "PERIODOS" && (
        <div className="space-y-4">
          {periodos.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Calendar className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <p className="text-base font-medium">No se ha generado ninguna nómina todavía.</p>
              <p className="text-xs mt-1">Haz clic en "Generar Período de Nómina" para liquidar a tu personal.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {periodos.map((p) => {
                const isSelected = periodoSeleccionado?.id === p.id;
                const isPagada = p.estado === "PAGADA";

                return (
                  <Card
                    key={p.id}
                    className={`p-5 space-y-4 transition-all border ${
                      isSelected ? "border-primary ring-2 ring-primary/20" : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="text-center space-y-2 pb-1">
                      <div className="flex items-center justify-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            isPagada
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold text-[10px] pointer-events-none select-none hover:bg-emerald-50"
                              : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold text-[10px] pointer-events-none select-none hover:bg-amber-50"
                          }
                        >
                          {p.estado}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-semibold">
                          {p.codigo}
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-foreground leading-tight px-1">
                        {p.nombre}
                      </h4>

                      <div className="pt-1">
                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Total a pagar
                        </div>
                        <div className="text-2xl font-black text-foreground tracking-tight mt-0.5 tabular-nums">
                          {formatRD(p.total_neto)}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 text-muted-foreground border-t border-b border-slate-100 dark:border-slate-800 py-2.5 my-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          Período:
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md text-[11px] tabular-nums">
                          {formatFechaDMY(p.fecha_inicio)} - {formatFechaDMY(p.fecha_fin)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          Fecha de Pago:
                        </span>
                        <span className="font-bold text-[#1B4B73] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md text-[11px] border border-blue-200/50 dark:border-blue-800/50 tabular-nums">
                          {formatFechaDMY(p.fecha_pago)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          Empleados:
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {p.total_empleados} en planilla
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 gap-1 cursor-pointer bg-[#1B4B73] hover:bg-[#133857] text-white font-semibold"
                        onClick={() => {
                          setPeriodoSeleccionado(p);
                          setTabActual("PROCESADOR");
                        }}
                      >
                        <span>Abrir Nómina</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        title="Eliminar Nómina"
                        onClick={() => setPeriodoToDelete(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
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
              <p className="text-base font-medium">Selecciona un período de nómina para editar o visualizar.</p>
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
              {/* Barra superior de acciones del período */}
              <div className="p-4 bg-muted/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-foreground">{periodoSeleccionado.nombre}</h3>
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
                  <div className="text-xs mt-2 flex flex-wrap items-center gap-2.5">
                    {/* Badge 1: Período (Fondo sólido pizarra oscuro) */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs shadow-xs">
                      <Calendar className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                      <span className="text-slate-300 font-medium">Período:</span>
                      <span className="font-bold text-white tabular-nums">
                        {formatFechaDMY(periodoSeleccionado.fecha_inicio)} – {formatFechaDMY(periodoSeleccionado.fecha_fin)}
                      </span>
                    </div>

                    {/* Badge 2: Fecha de Pago (Fondo sólido azul Klynn #1B4B73) */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1B4B73] dark:bg-sky-900 text-white text-xs shadow-xs">
                      <Clock className="h-3.5 w-3.5 text-[#F0B900] shrink-0" />
                      <span className="text-blue-100 font-medium">Fecha de Pago:</span>
                      <span className="font-extrabold text-white bg-white/20 px-2 py-0.5 rounded-md tabular-nums">
                        {formatFechaDMY(periodoSeleccionado.fecha_pago)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground font-medium">Total a Dispersar</div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-display tabular-nums tracking-tight">
                      {formatRD(periodoSeleccionado.total_neto)}
                    </div>
                  </div>

                  {periodoSeleccionado.estado !== "PAGADA" && (
                    <Button
                      onClick={() => setPeriodoToPagar(periodoSeleccionado)}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs hover:shadow"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Marcar como Pagada</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Barra superior de la tabla: Colaboradores & Toggle de columnas inteligentes */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Colaboradores en Planilla ({detallesDelPeriodo.length})
                  </span>
                  {!tieneDeducciones && !mostrarTodasColumnas ? (
                    <span className="inline-flex items-center text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                      Vista inteligente (columnas vacías de deducción ocultas)
                    </span>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarTodasColumnas(!mostrarTodasColumnas)}
                  className="h-7 text-xs font-semibold gap-1.5 cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                  <span>{mostrarTodasColumnas ? "Ocultar Columnas Vacías" : "Ver Todas las Columnas"}</span>
                </Button>
              </div>

              {/* Tabla de Empleados y Liquidación */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-3">Empleado</th>
                        <th className="py-3 px-3 text-right">Sueldo Base</th>
                        <th className="py-3 px-3 text-right" title="Horas extras calculadas con +35% de recargo (Ley 16-92)">H. Extras (+35%)</th>
                        <th className="py-3 px-3 text-right">Comisiones</th>
                        {showBruto && <th className="py-3 px-3 text-right">Bruto</th>}
                        {showVales && <th className="py-3 px-3 text-right text-rose-500">Vales</th>}
                        {showTss && <th className="py-3 px-3 text-right">TSS (5.91%)</th>}
                        {showIsr && <th className="py-3 px-3 text-right">ISR DGII</th>}
                        <th className="py-3 px-3 text-right font-bold">
                          {showBruto ? "Neto a Pagar" : "Total a Pagar"}
                        </th>
                        <th className="py-3 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {detallesDelPeriodo.map((d) => {
                        const emp = d.empleado;
                        const nombreCompleto = emp
                          ? `${emp.nombre} ${emp.apellido || ""}`.trim()
                          : "Empleado";

                        return (
                          <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-3 font-medium">
                              <div className="text-foreground font-semibold">{nombreCompleto}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="capitalize">{emp?.rol}</span>
                                {d.metodo_pago === "EFECTIVO" ? (
                                  <span className="text-emerald-700 dark:text-emerald-300 font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                                    Efectivo
                                  </span>
                                ) : d.metodo_pago === "CHEQUE" ? (
                                  <span className="text-blue-700 dark:text-blue-300 font-bold text-[10px] bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.2 rounded border border-blue-200/60">
                                    Cheque
                                  </span>
                                ) : emp?.banco_nombre ? (
                                  <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                                    • {emp.banco_nombre.replace("_", " ")}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">• Transferencia</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right font-medium tabular-nums">
                              {formatRD(d.salario_base_periodo)}
                            </td>

                            {/* Celda: Horas Extras */}
                            <td className="py-3 px-3 text-right">
                              {periodoSeleccionado.estado === "PAGADA" ? (
                                <div>
                                  <div className="font-semibold text-foreground tabular-nums">
                                    {formatRD(d.horas_extras)}
                                  </div>
                                  {(d.cantidad_horas_extras || 0) > 0 && (
                                    <div className="text-[10px] text-muted-foreground tabular-nums">
                                      {d.cantidad_horas_extras}h extras
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <div className="text-right">
                                    <div className="font-bold text-xs text-foreground tabular-nums">
                                      {formatRD(d.horas_extras || 0)}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground leading-none tabular-nums">
                                      {(d.cantidad_horas_extras || 0) > 0
                                        ? `${d.cantidad_horas_extras}h extras`
                                        : "0h extras"}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-7 p-0 rounded-lg cursor-pointer bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-[#1B4B73] hover:bg-[#1B4B73]/10 shadow-2xs shrink-0"
                                    onClick={() => setDetalleParaHorasExtras(d)}
                                    title="Calcular Horas Extras (Horas, Minutos y Tarifas Ley 16-92)"
                                  >
                                    <Calculator className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </td>

                            {/* Celda Editable: Comisiones */}
                            <td className="py-3 px-3 text-right">
                              {periodoSeleccionado.estado === "PAGADA" ? (
                                <span className="tabular-nums font-semibold">{formatRD(d.comisiones_destajo)}</span>
                              ) : (
                                <PriceInput
                                  className="w-20 h-7 text-xs text-right font-bold tabular-nums p-1 ml-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs rounded-lg focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20"
                                  value={d.comisiones_destajo || 0}
                                  placeholder="0"
                                  onChange={(val) =>
                                    handleActualizarDetalle(
                                      d,
                                      "comisiones_destajo",
                                      val
                                    )
                                  }
                                />
                              )}
                            </td>

                            {showBruto && (
                              <td className="py-3 px-3 text-right font-semibold text-foreground tabular-nums">
                                {formatRD(d.total_ingresos)}
                              </td>
                            )}

                            {showVales && (
                              <td className="py-3 px-3 text-right font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                                {(d.anticipos_descontados || 0) > 0 ? (
                                  `-${formatRD(d.anticipos_descontados)}`
                                ) : (
                                  <span className="text-slate-400">RD$ 0.00</span>
                                )}
                              </td>
                            )}

                            {showTss && (
                              <td className="py-3 px-3 text-right text-xs text-muted-foreground tabular-nums">
                                {d.tss_afp + d.tss_sfs > 0 ? (
                                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                                    -{formatRD(d.tss_afp + d.tss_sfs)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">RD$ 0.00</span>
                                )}
                              </td>
                            )}

                            {showIsr && (
                              <td className="py-3 px-3 text-right text-xs text-muted-foreground tabular-nums">
                                {d.isr_retencion > 0 ? (
                                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                                    -{formatRD(d.isr_retencion)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">RD$ 0.00</span>
                                )}
                              </td>
                            )}

                            <td className="py-3 px-3 text-right font-bold text-base text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatRD(d.neto_pagar)}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => {
                                  setDetalleParaRecibo(d);
                                  setModalReciboImpresion(true);
                                }}
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span>Recibo</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VALES Y ANTICIPOS DE CAJA */}
      {tabActual === "ANTICIPOS" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Control de Anticipos y Adelantos de Sueldo
            </h3>
            <Button
              size="sm"
              onClick={() => setModalNuevoAnticipo(true)}
              className="gap-1.5 font-bold text-xs cursor-pointer bg-[#F0B900] hover:bg-[#d9a700] text-[#1B4B73] border border-[#d4a300] shadow-xs hover:shadow transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar Vale</span>
            </Button>
          </div>

          {anticipos.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Banknote className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <p className="text-base font-medium">No se han registrado vales de anticipo.</p>
            </Card>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-card">
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
                        <td className="py-3 px-4 text-muted-foreground">{a.motivo || "Adelanto de nómina"}</td>
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
          <Card className="p-6 border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <Gift className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-lg font-bold text-foreground">
                  Proyección de Salario de Navidad (Regalía Pascual)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Conforme a la Ley 16-92 del Código de Trabajo de la República Dominicana, el empleador
                  está obligado a pagar en el mes de diciembre la duodécima parte (1/12) del salario ordinario
                  devengado por el trabajador durante el año natural.
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Empleado</th>
                      <th className="py-3 px-4">Puesto</th>
                      <th className="py-3 px-4 text-right">Salario Mensual</th>
                      <th className="py-3 px-4 text-right">Proyección Anual (12 Meses)</th>
                      <th className="py-3 px-4 text-right font-bold text-rose-600">
                        Regalía Acumulada a Pagar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {empleadosActivos.map((emp) => {
                      const sueldo = emp.salario_base || 0;
                      const devengadoAnual = sueldo * 12;
                      const regalia = calcularRegaliaPascual(devengadoAnual);

                      return (
                        <tr key={emp.id} className="hover:bg-muted/20">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {emp.nombre} {emp.apellido || ""}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground capitalize">
                            {emp.rol}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">{formatRD(sueldo)}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground tabular-nums">
                            {formatRD(devengadoAnual)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums text-base">
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
        <DialogContent className="sm:max-w-[560px] bg-background text-foreground rounded-2xl p-5 sm:p-6 border-none shadow-2xl">
          <DialogHeader className="space-y-1 pb-1">
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold text-base sm:text-lg">
              <Calendar className="h-5 w-5 text-[#1B4B73]" />
              <span>Generar Nuevo Período de Nómina</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Carga automáticamente los salarios de tus empleados activos y descuenta los vales de caja pendientes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCrearPeriodo} className="space-y-3.5 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="nombre_periodo" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nombre del Período*
              </Label>
              <Input
                id="nombre_periodo"
                value={periodoForm.nombre}
                onChange={(e) => setPeriodoForm((prev) => ({ ...prev, nombre: e.target.value }))}
                required
                placeholder="Ej. 1ra Quincena septiembre"
                className="h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Frecuencia de Pago*
                </Label>
                <Select
                  value={periodoForm.frecuencia}
                  onValueChange={(val: any) => handleFrecuenciaChange(val)}
                >
                  <SelectTrigger className="h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs cursor-pointer focus:border-[#1B4B73] focus:ring-[#1B4B73]/20 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
                    <SelectItem value="QUINCENAL" className="cursor-pointer text-xs sm:text-sm">Quincenal (Días 15 y 30)</SelectItem>
                    <SelectItem value="SEMANAL" className="cursor-pointer text-xs sm:text-sm">Semanal (Operarios)</SelectItem>
                    <SelectItem value="MENSUAL" className="cursor-pointer text-xs sm:text-sm">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fecha_pago" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Fecha de Pago Programada*</span>
                </Label>
                <DMYDatePicker
                  id="fecha_pago"
                  className="h-9 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
                  value={periodoForm.fecha_pago}
                  onChange={handleFechaPagoChange}
                  onMonthChange={handleMonthNavigate}
                />
                <p className="text-[10px] text-muted-foreground leading-tight">Día que se entrega el dinero (efectivo o banco).</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fecha_inicio" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Fecha Inicio (Corte)
                </Label>
                <DMYDatePicker
                  id="fecha_inicio"
                  className="h-9 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
                  value={periodoForm.fecha_inicio}
                  onChange={handleFechaInicioChange}
                  onMonthChange={handleMonthNavigate}
                />
                <p className="text-[10px] text-muted-foreground leading-tight">Primer día laborado de la nómina.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fecha_fin" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Fecha Fin (Corte)
                </Label>
                <DMYDatePicker
                  id="fecha_fin"
                  className="h-9 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
                  value={periodoForm.fecha_fin}
                  onChange={(val) =>
                    setPeriodoForm((prev) => ({ ...prev, fecha_fin: val }))
                  }
                  onMonthChange={handleMonthNavigate}
                />
                <p className="text-[10px] text-muted-foreground leading-tight">Último día laborado del corte.</p>
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs space-y-1 text-blue-900 dark:text-blue-200">
              <p className="font-bold flex items-center gap-1.5 text-xs sm:text-sm">
                <ShieldCheck className="h-4 w-4 text-[#1B4B73]" />
                Cálculo Inteligente
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Se incluirán {empleadosActivos.length} empleado(s) activos y se aplicarán automáticamente las retenciones de TSS / ISR configuradas y los vales de caja pendientes.
              </p>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalNuevoPeriodo(false)} className="cursor-pointer h-9 px-4 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#1B4B73] hover:bg-[#133857] text-white font-bold cursor-pointer shadow-xs hover:shadow h-9 px-4 text-xs sm:text-sm rounded-xl">
                Generar Nómina
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: REGISTRAR VALE / ANTICIPO */}
      <Dialog open={modalNuevoAnticipo} onOpenChange={setModalNuevoAnticipo}>
        <DialogContent className="max-w-[420px] sm:max-w-[420px] bg-background text-foreground rounded-2xl p-5 border-none shadow-2xl">
          <DialogHeader className="space-y-1 pb-1">
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold text-base sm:text-lg">
              <Banknote className="h-5 w-5 text-[#F0B900]" />
              <span>Registrar Vale / Anticipo de Sueldo</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Entrega un adelanto de sueldo y descuéntalo automáticamente en la próxima nómina.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCrearAnticipo} className="space-y-3.5 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Empleado Beneficiario*
              </Label>
              <Select
                value={anticipoForm.empleado_id}
                onValueChange={(val) =>
                  setAnticipoForm((prev) => ({ ...prev, empleado_id: val }))
                }
              >
                <SelectTrigger className="h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs cursor-pointer focus:border-[#1B4B73] focus:ring-[#1B4B73]/20 text-xs sm:text-sm">
                  <SelectValue placeholder="Seleccione el empleado..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
                  {empleadosActivos.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="cursor-pointer text-xs sm:text-sm">
                      {emp.nombre} {emp.apellido || ""} ({emp.rol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="monto_anticipo" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Monto del Adelanto (RD$)*
              </Label>
              <PriceInput
                id="monto_anticipo"
                value={anticipoForm.monto || 0}
                onChange={(val) =>
                  setAnticipoForm((prev) => ({ ...prev, monto: val }))
                }
                placeholder="0.00"
                required
                className="h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs text-base font-bold tabular-nums focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="motivo_anticipo" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Motivo / Concepto
              </Label>
              <Input
                id="motivo_anticipo"
                placeholder="Ej. Adelanto semanal, emergencia médica..."
                value={anticipoForm.motivo}
                onChange={(e) =>
                  setAnticipoForm((prev) => ({ ...prev, motivo: e.target.value }))
                }
                className="h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm"
              />
            </div>

            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5">
              <Checkbox
                id="descontar_caja_vale"
                checked={anticipoForm.descontar_caja}
                onCheckedChange={(c) =>
                  setAnticipoForm((prev) => ({ ...prev, descontar_caja: !!c }))
                }
                className="mt-0.5 cursor-pointer"
              />
              <div className="text-xs">
                <label htmlFor="descontar_caja_vale" className="font-bold text-foreground cursor-pointer text-xs sm:text-sm">
                  Entregar efectivo desde la Caja Abierta del Turno
                </label>
                <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                  Genera una salida de caja registrada en el cuadre del turno actual.
                </p>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalNuevoAnticipo(false)} className="cursor-pointer h-9 px-4 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#F0B900] hover:bg-[#d9a700] text-[#1B4B73] border border-[#d4a300] font-extrabold cursor-pointer shadow-xs hover:shadow h-9 px-4 text-xs sm:text-sm rounded-xl"
              >
                Registrar Vale ({formatRD(anticipoForm.monto || 0)})
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: RECIBO DE PAGO IMPRIMIBLE */}
      <Dialog open={modalReciboImpresion} onOpenChange={setModalReciboImpresion}>
        <DialogContent className="sm:max-w-[560px] print:max-w-none bg-background text-foreground rounded-2xl p-5 sm:p-6 border-none shadow-2xl">
          <DialogHeader className="space-y-1 pb-1">
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold text-base sm:text-lg">
              <Printer className="h-5 w-5 text-primary" />
              <span>Recibo de Pago de Nómina</span>
            </DialogTitle>
          </DialogHeader>

          {detalleParaRecibo && (
            <div className="space-y-4">
              {/* Formato Recibo Térmico */}
              <div
                id="recibo-nomina-print"
                className="p-4 bg-white text-black font-sans text-xs border rounded-lg shadow-inner space-y-3"
              >
                <div className="text-center space-y-1">
                  <h4 className="font-black text-sm uppercase">{user?.tenant?.nombre || "Klynn Lavandería"}</h4>
                  <p className="text-[10px]">RNC: {user?.tenant?.rnc || "N/D"}</p>
                  <p className="text-[10px] font-bold border-t border-b border-dashed py-1">
                    VOLANTE DE PAGO DE NÓMINA
                  </p>
                  <p className="text-[10px]">{periodoSeleccionado?.nombre}</p>
                </div>

                <div className="space-y-1 border-b border-dashed pb-2">
                  <p>
                    <strong>Empleado:</strong> {detalleParaRecibo.empleado?.nombre} {detalleParaRecibo.empleado?.apellido || ""}
                  </p>
                  <p>
                    <strong>Puesto:</strong> {detalleParaRecibo.empleado?.rol}
                  </p>
                  <p>
                    <strong>Fecha Pago:</strong> {formatFechaDMY(periodoSeleccionado?.fecha_pago)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold">INGRESOS:</p>
                  <div className="flex justify-between">
                    <span>Sueldo Base Período:</span>
                    <span>{formatRD(detalleParaRecibo.salario_base_periodo)}</span>
                  </div>
                  {detalleParaRecibo.horas_extras > 0 && (
                    <div className="flex justify-between">
                      <span>
                        Horas Extras {detalleParaRecibo.cantidad_horas_extras ? `(${detalleParaRecibo.cantidad_horas_extras}h)` : ""}:
                      </span>
                      <span>{formatRD(detalleParaRecibo.horas_extras)}</span>
                    </div>
                  )}
                  {detalleParaRecibo.comisiones_destajo > 0 && (
                    <div className="flex justify-between">
                      <span>Comisiones / Piezas:</span>
                      <span>{formatRD(detalleParaRecibo.comisiones_destajo)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>TOTAL BRUTO:</span>
                    <span>{formatRD(detalleParaRecibo.total_ingresos)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-bold">DEDUCCIONES:</p>
                  {detalleParaRecibo.anticipos_descontados > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Anticipos / Vales:</span>
                      <span>-{formatRD(detalleParaRecibo.anticipos_descontados)}</span>
                    </div>
                  )}
                  {detalleParaRecibo.tss_afp > 0 && (
                    <div className="flex justify-between">
                      <span>AFP (2.87%):</span>
                      <span>-{formatRD(detalleParaRecibo.tss_afp)}</span>
                    </div>
                  )}
                  {detalleParaRecibo.tss_sfs > 0 && (
                    <div className="flex justify-between">
                      <span>SFS (3.04%):</span>
                      <span>-{formatRD(detalleParaRecibo.tss_sfs)}</span>
                    </div>
                  )}
                  {detalleParaRecibo.isr_retencion > 0 && (
                    <div className="flex justify-between">
                      <span>ISR Retenido (DGII):</span>
                      <span>-{formatRD(detalleParaRecibo.isr_retencion)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>TOTAL DEDUCCIONES:</span>
                    <span>-{formatRD(detalleParaRecibo.total_deducciones)}</span>
                  </div>
                </div>

                <div className="flex justify-between font-black text-sm border-t-2 border-b-2 py-1.5">
                  <span>NETO A RECIBIR:</span>
                  <span>{formatRD(detalleParaRecibo.neto_pagar)}</span>
                </div>

                <div className="pt-8 text-center space-y-1">
                  <div className="border-t border-black w-48 mx-auto" />
                  <p className="text-[10px]">Firma de Conformidad del Empleado</p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setModalReciboImpresion(false)} className="cursor-pointer h-9 px-4 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    window.print();
                  }}
                  className="gap-1.5 font-bold cursor-pointer bg-[#1B4B73] hover:bg-[#133857] text-white shadow-xs hover:shadow h-9 px-4 text-xs sm:text-sm rounded-xl"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir Volante</span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMACIÓN: Eliminar Período de Nómina */}
      <AlertDialog
        open={Boolean(periodoToDelete)}
        onOpenChange={(open) => !open && setPeriodoToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 max-w-[420px] p-5">
          <AlertDialogHeader>
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-1 border border-rose-100 dark:border-rose-900/50">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
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
          <AlertDialogFooter className="gap-2 sm:gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl h-9 text-xs font-semibold border-slate-200 dark:border-slate-800 cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeletePeriodo}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-9 text-xs font-bold shadow-xs cursor-pointer border-none"
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
        <AlertDialogContent className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 max-w-[420px] p-5">
          <AlertDialogHeader>
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-1 border border-rose-100 dark:border-rose-900/50">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
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
          <AlertDialogFooter className="gap-2 sm:gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl h-9 text-xs font-semibold border-slate-200 dark:border-slate-800 cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAnticipo}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-9 text-xs font-bold shadow-xs cursor-pointer border-none"
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
        <AlertDialogContent className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 max-w-[440px] p-5">
          <AlertDialogHeader>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-1 border border-emerald-100 dark:border-emerald-900/50">
              <Banknote className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              ¿Aprobar y Pagar Nómina?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Se marcará como pagada la nómina{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                "{periodoToPagar?.nombre}"
              </strong>{" "}
              por un total neto de{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                {formatRD(periodoToPagar?.total_neto || 0)}
              </strong>
              . Se registrará el egreso contable en gastos de la empresa automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl h-9 text-xs font-semibold border-slate-200 dark:border-slate-800 cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarPagarNomina}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 text-xs font-bold shadow-xs cursor-pointer border-none"
            >
              Confirmar y Pagar
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
