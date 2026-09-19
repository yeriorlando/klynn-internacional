import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Building2,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  CreditCard,
  Phone,
  FileSpreadsheet,
  AlertTriangle,
  Trash2,
  Banknote,
  Receipt,
  ChevronDown,
  ChevronUp,
  Filter,
  Users,
  FileText,
  Calendar,
  Wallet,
  X,
  Lock,
  Sparkles,
  Tag,
  Landmark,
  MapPin,
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
import { Textarea } from "@/components/ui/textarea";
import {
  formatRD,
  uid,
  resolveTenantId,
  saveSuplidor,
  deleteSuplidor,
  saveFacturaCXP,
  deleteFacturaCXP,
  saveAbonoCXP,
  saveMovimiento,
  saveGasto,
  isModuleEnabled,
  type Suplidor,
  type FacturaCXP,
  type AbonoFacturaCXP,
  type CategoriaInsumo,
  type EstadoMoraCXP,
  type EstadoFacturaCXP,
} from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import {
  useSuplidores,
  useFacturasCXP,
  useAbonosCXP,
  useCajaAbierta,
  usePlans,
} from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { exportCXPToExcel } from "@/lib/excel-cxp";
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

export const Route = createFileRoute("/t/$slug/cxp")({
  component: CuentasPorPagarPage,
});

const MORA_CONFIG: Record<
  EstadoMoraCXP,
  { label: string; color: string; dot: string }
> = {
  AL_DIA: {
    label: "Al día",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  POR_VENCER: {
    label: "Por vencer",
    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  VENCIDA: {
    label: "Vencida",
    color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
    dot: "bg-orange-500",
  },
  CRITICA: {
    label: "Crítica (>30d)",
    color: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
    dot: "bg-rose-500",
  },
  PAGADA: {
    label: "Saldada",
    color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dot: "bg-slate-400",
  },
};

const CATEGORIAS_INSUMO: { value: CategoriaInsumo; label: string }[] = [
  { value: "QUIMICOS", label: "Químicos & Detergentes" },
  { value: "EMPAQUE", label: "Fundas, Ganchos & Empaque" },
  { value: "CALDERAS_REPUESTOS", label: "Calderas, Equipos & Repuestos" },
  { value: "COMBUSTIBLE", label: "GLP Gas / Gasoil" },
  { value: "SERVICIOS", label: "Mantenimiento & Servicios" },
  { value: "OTROS", label: "Otros Insumos" },
];

function CuentasPorPagarPage() {
  const user = useRequireAuth();
  const tenantId = user?.tenant?.id || "";
  const queryClient = useQueryClient();

  const { data: suplidores = [], isLoading: loadingSuplidores } = useSuplidores(tenantId);
  const { data: facturas = [], isLoading: loadingFacturas } = useFacturasCXP(tenantId);
  const { data: abonos = [] } = useAbonosCXP(tenantId);
  const { data: cajaAbierta } = useCajaAbierta(tenantId);

  // Suscripción en tiempo real a cambios en Suplidores, Facturas CXP y Abonos
  useEffect(() => {
    if (!tenantId || tenantId === "__loading__") return;
    const realTenantId = resolveTenantId(tenantId);

    const channel = supabase
      .channel(`cxp-realtime-${realTenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suplidores" },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row && (row.tenant_id === realTenantId || row.tenant_id === tenantId)) {
            queryClient.invalidateQueries({ queryKey: ["suplidores", tenantId] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facturas_cxp" },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row && (row.tenant_id === realTenantId || row.tenant_id === tenantId)) {
            queryClient.invalidateQueries({ queryKey: ["facturas-cxp", tenantId] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "abonos_cxp" },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row && (row.tenant_id === realTenantId || row.tenant_id === tenantId)) {
            queryClient.invalidateQueries({ queryKey: ["abonos-cxp", tenantId] });
            queryClient.invalidateQueries({ queryKey: ["facturas-cxp", tenantId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  const isAuthLoading = !user || user.tenant.id === "__loading__";
  const { data: plans = [] } = usePlans();
  const activePlan = plans.find((p) => p.id === user?.tenant?.plan_id);
  const hasCxpModule = isAuthLoading ? true : isModuleEnabled(user?.tenant || null, "cxp", activePlan);

  // Estados de interfaz
  const [tabActual, setTabActual] = useState<"FACTURAS" | "POR_SUPLIDOR" | "SUPLIDORES" | "SALDADAS">("FACTURAS");
  const [search, setSearch] = useState("");
  const [filtroMora, setFiltroMora] = useState<string>("TODAS");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("TODAS");
  const [expandedSuplidores, setExpandedSuplidores] = useState<Record<string, boolean>>({});

  // Modales
  const [modalSuplidorOpen, setModalSuplidorOpen] = useState(false);
  const [modalFacturaOpen, setModalFacturaOpen] = useState(false);
  const [modalAbonoOpen, setModalAbonoOpen] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaCXP | null>(null);
  const [modalHistorialOpen, setModalHistorialOpen] = useState(false);

  // Modales de confirmación nativos Klynn
  const [facturaToDelete, setFacturaToDelete] = useState<FacturaCXP | null>(null);
  const [suplidorToDelete, setSuplidorToDelete] = useState<Suplidor | null>(null);

  // Formulario Suplidor
  const [suplidorForm, setSuplidorForm] = useState({
    nombre_comercial: "",
    razon_social: "",
    rnc_cedula: "",
    telefono: "",
    email: "",
    direccion: "",
    categoria_insumo: "QUIMICOS" as CategoriaInsumo,
    dias_credito_default: 30,
    notas: "",
  });
  const [insumoPersonalizado, setInsumoPersonalizado] = useState("");

  // Categorías personalizadas existentes entre los suplidores
  const categoriasPersonalizadas = useMemo(() => {
    const defaultKeys = new Set(["QUIMICOS", "EMPAQUE", "CALDERAS_REPUESTOS", "COMBUSTIBLE", "SERVICIOS", "OTROS"]);
    const list: string[] = [];
    suplidores.forEach((s) => {
      if (s.categoria_insumo && !defaultKeys.has(s.categoria_insumo) && !list.includes(s.categoria_insumo)) {
        list.push(s.categoria_insumo);
      }
    });
    return list;
  }, [suplidores]);

  // Formulario Factura
  const [facturaForm, setFacturaForm] = useState({
    suplidor_id: "",
    numero_factura: "",
    ncf: "",
    tipo_ncf: "B01",
    fecha_emision: new Date().toISOString().split("T")[0],
    plazo_dias: 30,
    subtotal: 0,
    itbis: 0,
    total: 0,
    categoria_gasto: "INSUMOS",
    descripcion: "",
  });

  // Formulario Abono
  const [abonoForm, setAbonoForm] = useState({
    monto: 0,
    metodo_pago: "TRANSFERENCIA" as "TRANSFERENCIA" | "EFECTIVO" | "CHEQUE",
    banco_origen: "BANCO_POPULAR",
    referencia_bancaria: "",
    descontar_caja: false,
    notas: "",
  });

  // Totales y Estadísticas
  const facturasPendientes = useMemo(
    () => facturas.filter((f) => f.estado !== "PAGADA" && f.estado !== "ANULADA" && f.saldo_pendiente > 0),
    [facturas]
  );

  const facturasSaldadas = useMemo(
    () => facturas.filter((f) => f.estado === "PAGADA" || f.saldo_pendiente <= 0),
    [facturas]
  );

  const stats = useMemo(() => {
    const totalDeuda = facturasPendientes.reduce((acc, f) => acc + (f.saldo_pendiente || 0), 0);
    const alDia = facturasPendientes.filter((f) => f.estado_mora === "AL_DIA").reduce((acc, f) => acc + f.saldo_pendiente, 0);
    const porVencer = facturasPendientes.filter((f) => f.estado_mora === "POR_VENCER").reduce((acc, f) => acc + f.saldo_pendiente, 0);
    const vencidas = facturasPendientes.filter((f) => f.estado_mora === "VENCIDA").reduce((acc, f) => acc + f.saldo_pendiente, 0);
    const criticas = facturasPendientes.filter((f) => f.estado_mora === "CRITICA").reduce((acc, f) => acc + f.saldo_pendiente, 0);
    return { totalDeuda, alDia, porVencer, vencidas, criticas };
  }, [facturasPendientes]);

  // Filtrado de Facturas
  const facturasFiltradas = useMemo(() => {
    const lista = tabActual === "SALDADAS" ? facturasSaldadas : facturasPendientes;
    return lista.filter((f) => {
      const matchSearch =
        search === "" ||
        f.numero_factura.toLowerCase().includes(search.toLowerCase()) ||
        (f.ncf && f.ncf.toLowerCase().includes(search.toLowerCase())) ||
        (f.suplidor?.nombre_comercial && f.suplidor.nombre_comercial.toLowerCase().includes(search.toLowerCase())) ||
        (f.suplidor?.rnc_cedula && f.suplidor.rnc_cedula.includes(search));

      const matchMora = filtroMora === "TODAS" || f.estado_mora === filtroMora;
      const matchCat = filtroCategoria === "TODAS" || f.suplidor?.categoria_insumo === filtroCategoria;

      return matchSearch && matchMora && matchCat;
    });
  }, [facturasPendientes, facturasSaldadas, tabActual, search, filtroMora, filtroCategoria]);

  // Agrupado por Suplidor
  const suplidoresConDeuda = useMemo(() => {
    const map = new Map<
      string,
      {
        suplidor: Suplidor;
        total_deuda: number;
        facturas: FacturaCXP[];
        peor_mora: EstadoMoraCXP;
      }
    >();

    suplidores.forEach((s) => {
      const facs = facturasPendientes.filter((f) => f.suplidor_id === s.id);
      if (facs.length > 0) {
        const total_deuda = facs.reduce((acc, f) => acc + f.saldo_pendiente, 0);
        let peor_mora: EstadoMoraCXP = "AL_DIA";
        if (facs.some((f) => f.estado_mora === "CRITICA")) peor_mora = "CRITICA";
        else if (facs.some((f) => f.estado_mora === "VENCIDA")) peor_mora = "VENCIDA";
        else if (facs.some((f) => f.estado_mora === "POR_VENCER")) peor_mora = "POR_VENCER";

        map.set(s.id, { suplidor: s, total_deuda, facturas: facs, peor_mora });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total_deuda - a.total_deuda);
  }, [suplidores, facturasPendientes]);

  // Handlers Guardar Suplidor
  const handleGuardarSuplidor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suplidorForm.nombre_comercial.trim()) {
      toast.error("El nombre comercial del suplidor es obligatorio");
      return;
    }

    if (suplidorForm.categoria_insumo === "OTROS" && !insumoPersonalizado.trim()) {
      toast.error("Por favor, especifica el nombre del insumo personalizado");
      return;
    }

    const categoriaFinal =
      suplidorForm.categoria_insumo === "OTROS"
        ? insumoPersonalizado.trim()
        : suplidorForm.categoria_insumo;

    const nuevo: Suplidor = {
      id: uid(),
      tenant_id: tenantId,
      nombre_comercial: suplidorForm.nombre_comercial.trim(),
      razon_social: suplidorForm.razon_social.trim() || undefined,
      rnc_cedula: suplidorForm.rnc_cedula.trim() || undefined,
      telefono: suplidorForm.telefono.trim() || undefined,
      email: suplidorForm.email.trim() || undefined,
      direccion: suplidorForm.direccion.trim() || undefined,
      categoria_insumo: categoriaFinal,
      dias_credito_default: Number(suplidorForm.dias_credito_default) || 30,
      notas: suplidorForm.notas.trim() || undefined,
      activo: true,
      creado_en: new Date().toISOString(),
    };

    // Actualización optimista inmediata en la UI (0ms)
    queryClient.setQueryData<Suplidor[]>(["suplidores", tenantId], (old = []) => {
      return [...old.filter((s) => s.id !== nuevo.id), nuevo].sort((a, b) =>
        a.nombre_comercial.localeCompare(b.nombre_comercial)
      );
    });

    await saveSuplidor(nuevo);
    await queryClient.invalidateQueries({ queryKey: ["suplidores", tenantId] });
    toast.success("Suplidor registrado correctamente");
    setModalSuplidorOpen(false);
    setSuplidorForm({
      nombre_comercial: "",
      razon_social: "",
      rnc_cedula: "",
      telefono: "",
      email: "",
      direccion: "",
      categoria_insumo: "QUIMICOS",
      dias_credito_default: 30,
      notas: "",
    });
    setInsumoPersonalizado("");
  };

  // Handlers Guardar Factura
  const handleGuardarFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facturaForm.suplidor_id) {
      toast.error("Seleccione un suplidor");
      return;
    }
    if (!facturaForm.numero_factura.trim()) {
      toast.error("Ingrese el número de factura");
      return;
    }
    if (facturaForm.total <= 0) {
      toast.error("El total de la factura debe ser mayor a 0");
      return;
    }

    // Calcular fecha de vencimiento según plazo
    const parts = facturaForm.fecha_emision.split("-").map(Number);
    const emision = new Date(parts[0], parts[1] - 1, parts[2]);
    const vencimiento = new Date(emision);
    vencimiento.setDate(vencimiento.getDate() + Number(facturaForm.plazo_dias));
    const vy = vencimiento.getFullYear();
    const vm = String(vencimiento.getMonth() + 1).padStart(2, "0");
    const vd = String(vencimiento.getDate()).padStart(2, "0");
    const fechaVencimientoStr = `${vy}-${vm}-${vd}`;

    const nuevaFactura: FacturaCXP = {
      id: uid(),
      tenant_id: tenantId,
      suplidor_id: facturaForm.suplidor_id,
      numero_factura: facturaForm.numero_factura.trim(),
      ncf: facturaForm.ncf.trim() || undefined,
      tipo_ncf: facturaForm.tipo_ncf,
      fecha_emision: facturaForm.fecha_emision,
      plazo_dias: Number(facturaForm.plazo_dias),
      fecha_vencimiento: fechaVencimientoStr,
      subtotal: Number(facturaForm.subtotal),
      itbis: Number(facturaForm.itbis),
      total: Number(facturaForm.total),
      monto_pagado: 0,
      saldo_pendiente: Number(facturaForm.total),
      estado: "PENDIENTE",
      categoria_gasto: facturaForm.categoria_gasto,
      descripcion: facturaForm.descripcion.trim() || undefined,
      creado_por: user?.empleado?.id,
      creado_en: new Date().toISOString(),
    };

    const suplidorAsociado = suplidores.find((s) => s.id === facturaForm.suplidor_id);
    const nuevaFacturaConSuplidor: FacturaCXP = {
      ...nuevaFactura,
      suplidor: suplidorAsociado,
      estado_mora: "AL_DIA",
      dias_vencida: 0,
    };

    // Actualización optimista inmediata en la UI (0ms)
    queryClient.setQueryData<FacturaCXP[]>(["facturas-cxp", tenantId], (old = []) => {
      return [nuevaFacturaConSuplidor, ...old.filter((f) => f.id !== nuevaFactura.id)];
    });

    await saveFacturaCXP(nuevaFactura);
    await queryClient.invalidateQueries({ queryKey: ["facturas-cxp", tenantId] });
    toast.success("Factura a crédito registrada exitosamente");
    setModalFacturaOpen(false);
    setFacturaForm({
      suplidor_id: "",
      numero_factura: "",
      ncf: "",
      tipo_ncf: "B01",
      fecha_emision: new Date().toISOString().split("T")[0],
      plazo_dias: 30,
      subtotal: 0,
      itbis: 0,
      total: 0,
      categoria_gasto: "INSUMOS",
      descripcion: "",
    });
  };

  // Handlers Guardar Abono
  const handleRegistrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facturaSeleccionada) return;

    const montoNum = Number(abonoForm.monto);
    if (montoNum <= 0) {
      toast.error("El monto a abonar debe ser mayor a 0");
      return;
    }
    if (montoNum > facturaSeleccionada.saldo_pendiente) {
      toast.error(
        `El abono no puede superar el saldo pendiente (${formatRD(facturaSeleccionada.saldo_pendiente)})`
      );
      return;
    }

    if (abonoForm.metodo_pago === "EFECTIVO" && abonoForm.descontar_caja) {
      if (!cajaAbierta) {
        toast.error("No hay ninguna caja abierta en este turno para descontar el efectivo.");
        return;
      }
    }

    const nuevoAbono: AbonoFacturaCXP = {
      id: uid(),
      tenant_id: tenantId,
      factura_cxp_id: facturaSeleccionada.id,
      suplidor_id: facturaSeleccionada.suplidor_id,
      empleado_id: user?.empleado?.id || "admin",
      monto: montoNum,
      metodo_pago: abonoForm.metodo_pago,
      banco_origen: abonoForm.metodo_pago === "TRANSFERENCIA" ? abonoForm.banco_origen : undefined,
      referencia_bancaria: abonoForm.referencia_bancaria.trim() || undefined,
      caja_id: abonoForm.descontar_caja && cajaAbierta ? cajaAbierta.id : undefined,
      notas: abonoForm.notas.trim() || undefined,
      fecha_pago: new Date().toISOString(),
      creado_en: new Date().toISOString(),
    };

    // Actualización optimista de facturas y abonos en la UI (0ms)
    queryClient.setQueryData<FacturaCXP[]>(["facturas-cxp", tenantId], (old = []) => {
      return old.map((f) => {
        if (f.id !== facturaSeleccionada.id) return f;
        const nuevoMontoPagado = +(Number(f.monto_pagado || 0) + montoNum).toFixed(2);
        const nuevoSaldo = Math.max(0, +(Number(f.total) - nuevoMontoPagado).toFixed(2));
        const nuevoEstado: EstadoFacturaCXP =
          nuevoSaldo <= 0 ? "PAGADA" : nuevoMontoPagado > 0 ? "PARCIAL" : "PENDIENTE";
        return {
          ...f,
          monto_pagado: nuevoMontoPagado,
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado,
        };
      });
    });

    queryClient.setQueryData<AbonoFacturaCXP[]>(["abonos-cxp", tenantId, undefined], (old = []) => [
      nuevoAbono,
      ...(old || []),
    ]);
    queryClient.setQueryData<AbonoFacturaCXP[]>(
      ["abonos-cxp", tenantId, facturaSeleccionada.id],
      (old = []) => [nuevoAbono, ...(old || [])]
    );

    // Si se solicitó descontar de la caja abierta
    if (abonoForm.descontar_caja && cajaAbierta) {
      const movId = uid();
      await saveMovimiento({
        id: movId,
        caja_id: cajaAbierta.id,
        tenant_id: tenantId,
        tipo: "EGRESO",
        monto: montoNum,
        metodo: "EFECTIVO",
        concepto: `Pago CXP Factura #${facturaSeleccionada.numero_factura} (${facturaSeleccionada.suplidor?.nombre_comercial || "Suplidor"})`,
        creado_en: new Date().toISOString(),
        empleado_id: user?.empleado?.id || "admin",
      });

      // También registrar en gastos
      await saveGasto({
        id: uid(),
        tenant_id: tenantId,
        empleado_id: user?.empleado?.id || "admin",
        categoria: "Insumos & Suplidores (CXP)",
        descripcion: `Abono Factura #${facturaSeleccionada.numero_factura} - ${facturaSeleccionada.suplidor?.nombre_comercial}`,
        monto: montoNum,
        metodo_pago: "EFECTIVO",
        proveedor: facturaSeleccionada.suplidor?.nombre_comercial,
        proveedor_rnc: facturaSeleccionada.suplidor?.rnc_cedula,
        fecha: new Date().toISOString(),
        aprobado: true,
        is_caja_chica: true,
        ncf: facturaSeleccionada.ncf,
      });
    }

    await saveAbonoCXP(nuevoAbono);
    await queryClient.invalidateQueries({ queryKey: ["facturas-cxp", tenantId] });
    await queryClient.invalidateQueries({ queryKey: ["abonos-cxp", tenantId] });
    await queryClient.invalidateQueries({ queryKey: ["caja-abierta", tenantId] });
    await queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId] });

    toast.success(`Abono de ${formatRD(montoNum)} registrado con éxito.`);
    setModalAbonoOpen(false);
    setFacturaSeleccionada(null);
    setAbonoForm({
      monto: 0,
      metodo_pago: "TRANSFERENCIA",
      banco_origen: "BANCO_POPULAR",
      referencia_bancaria: "",
      descontar_caja: false,
      notas: "",
    });
  };

  const handleEliminarFactura = (f: FacturaCXP) => {
    setFacturaToDelete(f);
  };

  const handleConfirmDeleteFactura = async () => {
    if (!facturaToDelete) return;
    try {
      // Optimistic delete
      queryClient.setQueryData<FacturaCXP[]>(["facturas-cxp", tenantId], (old = []) =>
        old.filter((f) => f.id !== facturaToDelete.id)
      );
      await deleteFacturaCXP(facturaToDelete.id, tenantId);
      await queryClient.invalidateQueries({ queryKey: ["facturas-cxp", tenantId] });
      toast.success("Factura eliminada correctamente");
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar factura");
    } finally {
      setFacturaToDelete(null);
    }
  };

  const handleConfirmDeleteSuplidor = async () => {
    if (!suplidorToDelete) return;
    try {
      // Optimistic delete
      queryClient.setQueryData<Suplidor[]>(["suplidores", tenantId], (old = []) =>
        old.filter((s) => s.id !== suplidorToDelete.id)
      );
      await deleteSuplidor(suplidorToDelete.id, tenantId);
      await queryClient.invalidateQueries({ queryKey: ["suplidores", tenantId] });
      toast.success("Suplidor eliminado correctamente");
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar suplidor");
    } finally {
      setSuplidorToDelete(null);
    }
  };

  const abonosDeFacturaSeleccionada = useMemo(() => {
    if (!facturaSeleccionada) return [];
    return abonos.filter((a) => a.factura_cxp_id === facturaSeleccionada.id);
  }, [abonos, facturaSeleccionada]);

  const hasLoadedAny = suplidores.length > 0 || facturas.length > 0;
  if (!hasLoadedAny && (loadingSuplidores || loadingFacturas)) {
    return <GlobalPageLoader />;
  }

  if (!hasCxpModule) {
    return (
      <div className="min-h-[70vh] bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 shadow-2xs">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Cuentas por Pagar (CxP)
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              El módulo de <strong>Cuentas por Pagar (CxP), Suplidores, Facturas y Abonos</strong> no está incluido en tu plan actual. Actualiza tu suscripción para llevar un control estricto de tus compras a crédito e insumos.
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
        title="Cuentas por Pagar (CXP)"
        description="Control de compras a crédito, suplidores, facturas con NCF y pagos"
      >
        <Button
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold border border-emerald-600 shadow-xs hover:shadow cursor-pointer transition-all active:scale-95 shrink-0"
          onClick={() =>
            exportCXPToExcel({
              tenantName: user?.tenant?.nombre,
              tenantRnc: user?.tenant?.rnc,
              facturas,
              suplidores,
            })
          }
        >
          <FileSpreadsheet className="h-4 w-4 text-white" />
          <span>Exportar Excel</span>
        </Button>
        <Button
          className="gap-2 bg-[#F0B900] hover:bg-[#d9a700] text-[#1B4B73] border border-[#d4a300] font-bold shadow-xs hover:shadow cursor-pointer transition-all active:scale-95 shrink-0"
          onClick={() => setModalSuplidorOpen(true)}
        >
          <Building2 className="h-4 w-4 text-[#1B4B73]" />
          <span>Nuevo Suplidor</span>
        </Button>
        <Button
          className="gap-2 bg-[#1B4B73] hover:bg-[#133857] text-white font-bold border border-[#133857] shadow-xs hover:shadow cursor-pointer transition-all active:scale-95 shrink-0"
          onClick={() => setModalFacturaOpen(true)}
        >
          <Plus className="h-4 w-4 text-white" />
          <span>Registrar Factura a Crédito</span>
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            Total Por Pagar
          </div>
          <div className="text-xl md:text-2xl font-black text-foreground mt-2 tracking-tight">
            {formatRD(stats.totalDeuda)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {facturasPendientes.length} facturas por liquidar
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            Mora Crítica (&gt;30d)
          </div>
          <div className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 tracking-tight">
            {formatRD(stats.criticas)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Prioridad de pago alta</div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Vencidas (1-30d)
          </div>
          <div className="text-xl md:text-2xl font-black text-orange-600 dark:text-orange-400 mt-2 tracking-tight">
            {formatRD(stats.vencidas)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Fuera del término</div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Por Vencer (≤7d)
          </div>
          <div className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 tracking-tight">
            {formatRD(stats.porVencer)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Flujo de esta semana</div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs col-span-2 md:col-span-1">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Al Día
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
            {formatRD(stats.alDia)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Dentro del plazo de crédito</div>
        </Card>
      </div>

      {/* Selector de pestañas y búsqueda perfectamente alineados en una sola fila */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Button
            variant={tabActual === "FACTURAS" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTabActual("FACTURAS")}
            className={`font-semibold gap-1.5 cursor-pointer transition-colors ${
              tabActual === "FACTURAS" ? "bg-[#1B4B73] hover:bg-[#133857] text-white" : ""
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Facturas Pendientes</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {facturasPendientes.length}
            </Badge>
          </Button>

          <Button
            variant={tabActual === "POR_SUPLIDOR" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTabActual("POR_SUPLIDOR")}
            className={`font-semibold gap-1.5 cursor-pointer transition-colors ${
              tabActual === "POR_SUPLIDOR" ? "bg-[#1B4B73] hover:bg-[#133857] text-white" : ""
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Por Suplidor</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {suplidoresConDeuda.length}
            </Badge>
          </Button>

          <Button
            variant={tabActual === "SUPLIDORES" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTabActual("SUPLIDORES")}
            className={`font-semibold gap-1.5 cursor-pointer transition-colors ${
              tabActual === "SUPLIDORES" ? "bg-[#1B4B73] hover:bg-[#133857] text-white" : ""
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Directorio de Suplidores</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {suplidores.length}
            </Badge>
          </Button>

          <Button
            variant={tabActual === "SALDADAS" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTabActual("SALDADAS")}
            className={`font-semibold gap-1.5 cursor-pointer transition-colors ${
              tabActual === "SALDADAS" ? "bg-[#1B4B73] hover:bg-[#133857] text-white" : ""
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Facturas Saldadas</span>
          </Button>
        </div>

        {/* Barra de Filtros y Búsqueda perfectamente alineada a la derecha con fondo blanco */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar suplidor, NCF o factura..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-7 text-sm h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {tabActual === "FACTURAS" && (
            <Select value={filtroMora} onValueChange={setFiltroMora}>
              <SelectTrigger className="w-40 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs cursor-pointer focus:border-[#1B4B73] focus:ring-[#1B4B73]/20">
                <SelectValue placeholder="Estado Mora" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
                <SelectItem value="TODAS" className="cursor-pointer">Toda Mora</SelectItem>
                <SelectItem value="CRITICA" className="cursor-pointer">Crítica (&gt;30d)</SelectItem>
                <SelectItem value="VENCIDA" className="cursor-pointer">Vencida</SelectItem>
                <SelectItem value="POR_VENCER" className="cursor-pointer">Por Vencer</SelectItem>
                <SelectItem value="AL_DIA" className="cursor-pointer">Al Día</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* CONTENIDO TAB 1: FACTURAS PENDIENTES */}
      {tabActual === "FACTURAS" && (
        <div className="space-y-4">
          {facturasFiltradas.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Receipt className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <p className="text-base font-medium">No hay facturas pendientes con estos filtros.</p>
              <p className="text-xs mt-1">¡Excelente! Tu lavandería está al día con sus proveedores.</p>
            </Card>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Suplidor / RNC</th>
                      <th className="py-3 px-4">Factura &amp; NCF</th>
                      <th className="py-3 px-4">Emisión / Vence</th>
                      <th className="py-3 px-4">Estado Mora</th>
                      <th className="py-3 px-4 text-right">Total Factura</th>
                      <th className="py-3 px-4 text-right">Abonado</th>
                      <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {facturasFiltradas.map((f) => {
                      const mora = f.estado_mora || "AL_DIA";
                      const cfg = MORA_CONFIG[mora];

                      return (
                        <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-medium">
                            <div className="text-foreground font-semibold">
                              {f.suplidor?.nombre_comercial || "Suplidor"}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span>RNC: {f.suplidor?.rnc_cedula || "N/D"}</span>
                              <span>•</span>
                              <span className="capitalize">{f.categoria_gasto}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground tabular-nums">
                              #{f.numero_factura}
                            </div>
                            {f.ncf && (
                              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                                {f.ncf}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-xs">
                            <div className="text-muted-foreground">Emisión: {formatFechaDMY(f.fecha_emision)}</div>
                            <div className="font-medium text-foreground mt-0.5 flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              Vence: {formatFechaDMY(f.fecha_vencimiento)}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={`gap-1.5 font-semibold text-xs py-0.5 px-2 ${cfg.color}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </Badge>
                            {(f.dias_vencida || 0) > 0 && (
                              <div className="text-[11px] text-rose-500 font-semibold mt-0.5">
                                +{f.dias_vencida} días vencida
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-medium text-muted-foreground">
                            {formatRD(f.total)}
                          </td>

                          <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {formatRD(f.monto_pagado)}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-foreground text-base">
                            {formatRD(f.saldo_pendiente)}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-2.5"
                                onClick={() => {
                                  setFacturaSeleccionada(f);
                                  setAbonoForm((prev) => ({
                                    ...prev,
                                    monto: f.saldo_pendiente,
                                  }));
                                  setModalAbonoOpen(true);
                                }}
                              >
                                <Banknote className="h-3.5 w-3.5" />
                                <span>Abonar</span>
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-500 hover:text-foreground"
                                title="Ver Historial de Abonos"
                                onClick={() => {
                                  setFacturaSeleccionada(f);
                                  setModalHistorialOpen(true);
                                }}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                title="Eliminar Factura"
                                onClick={() => handleEliminarFactura(f)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO TAB 2: POR SUPLIDOR */}
      {tabActual === "POR_SUPLIDOR" && (
        <div className="space-y-4">
          {suplidoresConDeuda.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Building2 className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <p className="text-base font-medium">No hay deudas activas agrupadas por suplidor.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {suplidoresConDeuda.map(({ suplidor, total_deuda, facturas: facs, peor_mora }) => {
                const isExpanded = expandedSuplidores[suplidor.id] ?? true;
                const moraCfg = MORA_CONFIG[peor_mora];

                return (
                  <Card key={suplidor.id} className="overflow-hidden border-slate-200 dark:border-slate-800">
                    <div
                      className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() =>
                        setExpandedSuplidores((prev) => ({
                          ...prev,
                          [suplidor.id]: !isExpanded,
                        }))
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-base text-foreground flex items-center gap-2">
                            <span>{suplidor.nombre_comercial}</span>
                            <Badge variant="outline" className={`text-xs ${moraCfg.color}`}>
                              {moraCfg.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>RNC: {suplidor.rnc_cedula || "N/D"}</span>
                            {suplidor.telefono && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {suplidor.telefono}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span>{facs.length} factura(s) a crédito</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Deuda Total</div>
                          <div className="text-lg font-black text-foreground">
                            {formatRD(total_deuda)}
                          </div>
                        </div>

                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800 bg-muted/20 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {facs.map((f) => (
                            <div
                              key={f.id}
                              className="p-3 bg-card border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2 shadow-2xs"
                            >
                              <div>
                                <div className="font-bold text-sm tabular-nums">
                                  Factura #{f.numero_factura}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Vence: {formatFechaDMY(f.fecha_vencimiento)} ({f.plazo_dias} días)
                                </div>
                                <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
                                  Saldo: {formatRD(f.saldo_pendiente)}
                                </div>
                              </div>

                              <Button
                                size="sm"
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFacturaSeleccionada(f);
                                  setAbonoForm((prev) => ({
                                    ...prev,
                                    monto: f.saldo_pendiente,
                                  }));
                                  setModalAbonoOpen(true);
                                }}
                              >
                                <Banknote className="h-3.5 w-3.5" />
                                <span>Abonar</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO TAB 3: DIRECTORIO DE SUPLIDORES */}
      {tabActual === "SUPLIDORES" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Catálogo de Proveedores Registrados
            </h3>
            <Button
              size="sm"
              onClick={() => setModalSuplidorOpen(true)}
              className="gap-1.5 font-bold text-xs cursor-pointer bg-[#F0B900] hover:bg-[#d9a700] text-[#1B4B73] border border-[#d4a300] shadow-xs hover:shadow transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Suplidor</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suplidores.map((s) => (
              <Card key={s.id} className="p-4 space-y-3 border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-base text-foreground">{s.nombre_comercial}</h4>
                    {s.razon_social && (
                      <p className="text-xs text-muted-foreground">{s.razon_social}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs font-medium">
                    {s.dias_credito_default} días crédito
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>
                    <strong className="text-foreground font-medium">RNC/Cédula:</strong>{" "}
                    {s.rnc_cedula || "N/D"}
                  </div>
                  {s.telefono && (
                    <div className="flex items-center gap-1">
                      <strong className="text-foreground font-medium">Tel:</strong> {s.telefono}
                    </div>
                  )}
                  {s.direccion && (
                    <div>
                      <strong className="text-foreground font-medium">Dirección:</strong> {s.direccion}
                    </div>
                  )}
                  <div>
                    <strong className="text-foreground font-medium">Insumo:</strong>{" "}
                    {CATEGORIAS_INSUMO.find((c) => c.value === s.categoria_insumo)?.label || s.categoria_insumo}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Activo
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    onClick={() => setSuplidorToDelete(s)}
                  >
                    Eliminar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 4: SALDADAS */}
      {tabActual === "SALDADAS" && (
        <div className="space-y-4">
          {facturasFiltradas.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
              <p className="text-base font-medium">No hay facturas saldadas registradas aún.</p>
            </Card>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Suplidor</th>
                    <th className="py-3 px-4">Factura # &amp; NCF</th>
                    <th className="py-3 px-4">Emisión / Vencimiento</th>
                    <th className="py-3 px-4 text-right">Monto Total</th>
                    <th className="py-3 px-4 text-right">Total Pagado</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {facturasFiltradas.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-medium">{f.suplidor?.nombre_comercial || "Suplidor"}</td>
                      <td className="py-3 px-4 font-bold tabular-nums">
                        #{f.numero_factura} {f.ncf ? `(${f.ncf})` : ""}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {formatFechaDMY(f.fecha_emision)} al {formatFechaDMY(f.fecha_vencimiento)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{formatRD(f.total)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatRD(f.monto_pagado)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold text-xs">
                          Saldada
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DIALOG: REGISTRAR ABONO / PAGO */}
      <Dialog open={modalAbonoOpen} onOpenChange={setModalAbonoOpen}>
        <DialogContent className="flex max-h-[92vh] w-[94vw] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-none bg-background p-0 shadow-2xl text-foreground">
          {/* MODAL HEADER */}
          <div className="shrink-0 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 sm:p-4 pb-3 relative border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-3 pr-8">
              <div className="h-9 w-9 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs shrink-0">
                <Banknote className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-display font-bold text-foreground">
                  Registrar Pago a Factura
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Abono a factura #{facturaSeleccionada?.numero_factura} · <span className="font-semibold text-foreground">{facturaSeleccionada?.suplidor?.nombre_comercial}</span>
                </DialogDescription>
              </div>
            </div>
          </div>

          {facturaSeleccionada && (
            <form onSubmit={handleRegistrarAbono} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 sm:px-5 py-3.5">
                {/* Balance pendiente */}
                <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-xs flex justify-between items-center">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                    <Receipt className="h-4 w-4 shrink-0 opacity-75" />
                    <span className="text-xs sm:text-sm font-semibold">Saldo Pendiente Actual:</span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">
                    {formatRD(facturaSeleccionada.saldo_pendiente)}
                  </span>
                </div>

                {/* Monto a abonar */}
                <div className="space-y-1.5">
                  <Label htmlFor="monto_abono" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Monto a Pagar (RD$)*
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/80 pointer-events-none select-none z-10">
                      RD$
                    </span>
                    <PriceInput
                      id="monto_abono"
                      value={abonoForm.monto || 0}
                      onChange={(val) =>
                        setAbonoForm((prev) => ({ ...prev, monto: val }))
                      }
                      placeholder="0.00"
                      required
                      className="h-10 pl-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs text-sm sm:text-base font-bold tabular-nums focus-visible:border-emerald-600 focus-visible:ring-emerald-600/20"
                    />
                  </div>
                </div>

                {/* Método de pago y banco */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Método de Pago*</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                      <Select
                        value={abonoForm.metodo_pago}
                        onValueChange={(val: any) =>
                          setAbonoForm((prev) => ({ ...prev, metodo_pago: val }))
                        }
                      >
                        <SelectTrigger className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs cursor-pointer focus:border-emerald-600 focus:ring-emerald-600/20 text-xs sm:text-sm font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900">
                          <SelectItem value="TRANSFERENCIA" className="cursor-pointer text-xs sm:text-sm">Transferencia</SelectItem>
                          <SelectItem value="EFECTIVO" className="cursor-pointer text-xs sm:text-sm">Efectivo</SelectItem>
                          <SelectItem value="CHEQUE" className="cursor-pointer text-xs sm:text-sm">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {abonoForm.metodo_pago === "TRANSFERENCIA" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Banco de Salida</Label>
                      <div className="relative">
                        <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                        <Select
                          value={abonoForm.banco_origen}
                          onValueChange={(val) =>
                            setAbonoForm((prev) => ({ ...prev, banco_origen: val }))
                          }
                        >
                          <SelectTrigger className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs cursor-pointer focus:border-emerald-600 focus:ring-emerald-600/20 text-xs sm:text-sm font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900">
                            <SelectItem value="BANCO_POPULAR" className="cursor-pointer text-xs sm:text-sm">Banco Popular</SelectItem>
                            <SelectItem value="BANRESERVAS" className="cursor-pointer text-xs sm:text-sm">Banreservas</SelectItem>
                            <SelectItem value="BANCO_BHD" className="cursor-pointer text-xs sm:text-sm">Banco BHD</SelectItem>
                            <SelectItem value="OTRO" className="cursor-pointer text-xs sm:text-sm">Otro Banco</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {abonoForm.metodo_pago === "TRANSFERENCIA" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ref_bancaria" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Número de Confirmación / Referencia
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                      <Input
                        id="ref_bancaria"
                        placeholder="Ej. TR-92841"
                        value={abonoForm.referencia_bancaria}
                        onChange={(e) =>
                          setAbonoForm((prev) => ({ ...prev, referencia_bancaria: e.target.value }))
                        }
                        className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/20 text-xs sm:text-sm font-medium"
                      />
                    </div>
                  </div>
                )}

                {abonoForm.metodo_pago === "EFECTIVO" && (
                  <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5 shadow-xs">
                    <Checkbox
                      id="descontar_caja"
                      checked={abonoForm.descontar_caja}
                      onCheckedChange={(c) =>
                        setAbonoForm((prev) => ({ ...prev, descontar_caja: !!c }))
                      }
                      className="mt-0.5 cursor-pointer"
                    />
                    <div className="text-xs">
                      <label htmlFor="descontar_caja" className="font-bold text-foreground cursor-pointer">
                        Descontar dinero de la Caja Abierta del Turno
                      </label>
                      <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                        Registra automáticamente una salida de efectivo y egreso en la caja activa del turno actual.
                      </p>
                    </div>
                  </div>
                )}

                {/* Notas */}
                <div className="space-y-1.5">
                  <Label htmlFor="notas_abono" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Notas o Concepto (Opcional)
                  </Label>
                  <div className="relative">
                    <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Input
                      id="notas_abono"
                      placeholder="Detalle o nota adicional..."
                      value={abonoForm.notas}
                      onChange={(e) => setAbonoForm((prev) => ({ ...prev, notas: e.target.value }))}
                      className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/20 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/60 px-4 sm:px-5 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalAbonoOpen(false)}
                  className="h-9.5 rounded-xl px-3.5 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-9.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs active:translate-y-px px-4 text-xs sm:text-sm whitespace-nowrap"
                >
                  Registrar Pago ({formatRD(abonoForm.monto || 0)})
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: REGISTRAR NUEVA FACTURA CXP */}
      <Dialog open={modalFacturaOpen} onOpenChange={setModalFacturaOpen}>
        <DialogContent className="flex max-h-[92vh] w-[94vw] max-w-xl flex-col gap-0 overflow-hidden rounded-3xl border-none bg-background p-0 shadow-2xl text-foreground">
          {/* MODAL HEADER */}
          <div className="shrink-0 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 sm:p-4 pb-3 relative border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-3 pr-8">
              <div className="h-9 w-9 rounded-2xl bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-sky-950/50 dark:text-sky-400 flex items-center justify-center border border-[#1B4B73]/20 shadow-xs shrink-0">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-display font-bold text-foreground">
                  Registrar Factura a Crédito
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Ingresa la factura del proveedor con su plazo de pago y NCF de República Dominicana.
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleGuardarFactura} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 sm:px-5 py-3.5">
              {/* Fila 1: Suplidor (col-span-2) + Plazo de Crédito (col-span-1) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Suplidor / Proveedor*
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Select
                      value={facturaForm.suplidor_id}
                      onValueChange={(val) => {
                        const sup = suplidores.find((s) => s.id === val);
                        setFacturaForm((prev) => ({
                          ...prev,
                          suplidor_id: val,
                          plazo_dias: sup?.dias_credito_default ?? 30,
                          categoria_gasto: sup?.categoria_insumo || "INSUMOS",
                        }));
                      }}
                    >
                      <SelectTrigger className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs cursor-pointer focus:border-[#1B4B73] focus:ring-[#1B4B73]/20 text-xs sm:text-sm font-medium">
                        <SelectValue placeholder="Seleccione un suplidor..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900 max-h-56">
                        {suplidores.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="cursor-pointer text-xs sm:text-sm">
                            {s.nombre_comercial} ({s.dias_credito_default}d)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plazo_dias" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Plazo Crédito
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Select
                      value={String(facturaForm.plazo_dias)}
                      onValueChange={(val) =>
                        setFacturaForm((prev) => ({ ...prev, plazo_dias: Number(val) }))
                      }
                    >
                      <SelectTrigger className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs cursor-pointer focus:border-[#1B4B73] focus:ring-[#1B4B73]/20 text-xs sm:text-sm font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900">
                        <SelectItem value="15" className="cursor-pointer text-xs sm:text-sm">15 días de crédito</SelectItem>
                        <SelectItem value="30" className="cursor-pointer text-xs sm:text-sm">30 días de crédito</SelectItem>
                        <SelectItem value="45" className="cursor-pointer text-xs sm:text-sm">45 días de crédito</SelectItem>
                        <SelectItem value="60" className="cursor-pointer text-xs sm:text-sm">60 días de crédito</SelectItem>
                        <SelectItem value="90" className="cursor-pointer text-xs sm:text-sm">90 días de crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Fila 2: Número de Factura, NCF, Fecha Emisión */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="num_factura" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Número Factura*
                  </Label>
                  <div className="relative">
                    <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Input
                      id="num_factura"
                      placeholder="Ej. F-10294"
                      value={facturaForm.numero_factura}
                      onChange={(e) =>
                        setFacturaForm((prev) => ({ ...prev, numero_factura: e.target.value }))
                      }
                      required
                      className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ncf_factura" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    NCF (Opcional)
                  </Label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Input
                      id="ncf_factura"
                      placeholder="Ej. B0100000042"
                      value={facturaForm.ncf}
                      onChange={(e) => setFacturaForm((prev) => ({ ...prev, ncf: e.target.value }))}
                      className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fecha_emision" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Fecha Emisión
                  </Label>
                  <DMYDatePicker
                    id="fecha_emision"
                    className="h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xs sm:text-sm font-medium px-3"
                    value={facturaForm.fecha_emision}
                    onChange={(val) =>
                      setFacturaForm((prev) => ({ ...prev, fecha_emision: val }))
                    }
                  />
                </div>
              </div>

              {/* Fila 3: Subtotal, ITBIS 18%, Total */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="subtotal" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Subtotal (RD$)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/80 pointer-events-none select-none z-10">
                      RD$
                    </span>
                    <PriceInput
                      id="subtotal"
                      value={facturaForm.subtotal || 0}
                      placeholder="0.00"
                      onChange={(sub) => {
                        const itbis = +(sub * 0.18).toFixed(2);
                        setFacturaForm((prev) => ({
                          ...prev,
                          subtotal: sub,
                          itbis,
                          total: +(sub + itbis).toFixed(2),
                        }));
                      }}
                      className="h-10 pl-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm font-bold tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="itbis" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    ITBIS 18% (RD$)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/80 pointer-events-none select-none z-10">
                      RD$
                    </span>
                    <PriceInput
                      id="itbis"
                      value={facturaForm.itbis || 0}
                      placeholder="0.00"
                      onChange={(itbis) => {
                        setFacturaForm((prev) => ({
                          ...prev,
                          itbis,
                          total: +(Number(prev.subtotal) + itbis).toFixed(2),
                        }));
                      }}
                      className="h-10 pl-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm font-bold tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="total" className="text-xs font-bold text-[#1B4B73] dark:text-blue-300">
                    Total Factura*
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#1B4B73] dark:text-blue-400 pointer-events-none select-none z-10">
                      RD$
                    </span>
                    <PriceInput
                      id="total"
                      value={facturaForm.total || 0}
                      placeholder="0.00"
                      onChange={(tot) =>
                        setFacturaForm((prev) => ({ ...prev, total: tot }))
                      }
                      required
                      className="h-10 pl-10 rounded-xl bg-blue-50/40 dark:bg-blue-950/30 border border-[#1B4B73]/40 dark:border-blue-700 text-slate-900 dark:text-slate-100 shadow-xs font-black tabular-nums focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Fila 4: Descripción de Artículos Comprados */}
              <div className="space-y-1.5">
                <Label htmlFor="descripcion" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Descripción de Artículos Comprados (Opcional)
                </Label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                  <Input
                    id="descripcion"
                    placeholder="Ej. 10 Galones Detergente Industrial, 5 Cajas Ganchos..."
                    value={facturaForm.descripcion}
                    onChange={(e) =>
                      setFacturaForm((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                    className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/60 px-4 sm:px-5 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalFacturaOpen(false)}
                className="h-9.5 rounded-xl px-3.5 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9.5 rounded-xl bg-[#1B4B73] hover:bg-[#133857] text-white font-bold cursor-pointer shadow-xs active:translate-y-px px-5 text-xs sm:text-sm whitespace-nowrap"
              >
                Guardar Factura a Crédito
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: REGISTRAR NUEVO SUPLIDOR */}
      <Dialog open={modalSuplidorOpen} onOpenChange={setModalSuplidorOpen}>
        <DialogContent className="flex max-h-[92vh] w-[94vw] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-none bg-background p-0 shadow-2xl text-foreground">
          {/* MODAL HEADER */}
          <div className="shrink-0 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 sm:p-4 pb-3 relative border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-3 pr-8">
              <div className="h-9 w-9 rounded-2xl bg-[#F0B900]/15 text-[#b08800] dark:text-[#F0B900] flex items-center justify-center border border-[#F0B900]/25 shadow-xs shrink-0">
                <Building2 className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-display font-bold text-foreground">
                  Nuevo Suplidor / Proveedor
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Registra los datos fiscales y condiciones de crédito de tu proveedor de insumos.
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleGuardarSuplidor} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 sm:px-5 py-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="nom_comercial" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Nombre Comercial*
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                  <Input
                    id="nom_comercial"
                    placeholder="Ej. Distribuidora Química Dominicana"
                    value={suplidorForm.nombre_comercial}
                    onChange={(e) =>
                      setSuplidorForm((prev) => ({ ...prev, nombre_comercial: e.target.value }))
                    }
                    required
                    className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rnc_suplidor" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    RNC o Cédula (RD)
                  </Label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Input
                      id="rnc_suplidor"
                      placeholder="Ej. 131-00000-0"
                      value={suplidorForm.rnc_cedula}
                      onChange={(e) =>
                        setSuplidorForm((prev) => ({ ...prev, rnc_cedula: e.target.value }))
                      }
                      className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tel_suplidor" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Teléfono / WhatsApp
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Input
                      id="tel_suplidor"
                      placeholder="809-000-0000"
                      value={suplidorForm.telefono}
                      onChange={(e) =>
                        setSuplidorForm((prev) => ({ ...prev, telefono: e.target.value }))
                      }
                      className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Tipo de Insumo</Label>
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Select
                      value={suplidorForm.categoria_insumo}
                      onValueChange={(val: any) => {
                        setSuplidorForm((prev) => ({ ...prev, categoria_insumo: val }));
                        if (val !== "OTROS") {
                          setInsumoPersonalizado("");
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs cursor-pointer focus:border-[#1B4B73] focus:ring-[#1B4B73]/20 text-xs sm:text-sm font-medium">
                        <SelectValue placeholder="Seleccione insumo" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900 max-h-64">
                        {CATEGORIAS_INSUMO.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value} className="cursor-pointer text-xs sm:text-sm">
                            {cat.label}
                          </SelectItem>
                        ))}
                        {categoriasPersonalizadas.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                              Insumos Personalizados
                            </div>
                            {categoriasPersonalizadas.map((custom) => (
                              <SelectItem
                                key={custom}
                                value={custom}
                                className="cursor-pointer text-xs sm:text-sm font-medium text-[#1B4B73] dark:text-blue-300"
                              >
                                🏷️ {custom}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dias_defecto" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Días Crédito Habituales
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Select
                      value={String(suplidorForm.dias_credito_default)}
                      onValueChange={(val) =>
                        setSuplidorForm((prev) => ({ ...prev, dias_credito_default: Number(val) }))
                      }
                    >
                      <SelectTrigger className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs cursor-pointer focus:border-[#1B4B73] focus:ring-[#1B4B73]/20 text-xs sm:text-sm font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900">
                        <SelectItem value="15" className="cursor-pointer text-xs sm:text-sm">15 días</SelectItem>
                        <SelectItem value="30" className="cursor-pointer text-xs sm:text-sm">30 días</SelectItem>
                        <SelectItem value="45" className="cursor-pointer text-xs sm:text-sm">45 días</SelectItem>
                        <SelectItem value="60" className="cursor-pointer text-xs sm:text-sm">60 días</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Insumo personalizado al seleccionar 'Otros Insumos' */}
              {suplidorForm.categoria_insumo === "OTROS" && (
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-900/50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="insumo_personalizado" className="text-xs font-bold text-[#1B4B73] dark:text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#F0B900]" />
                      ¿Qué tipo de insumo provee?*
                    </Label>
                    <span className="text-[10px] text-blue-600/80 dark:text-blue-300 font-medium">Insumo personalizado</span>
                  </div>
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 pointer-events-none z-10" />
                    <Input
                      id="insumo_personalizado"
                      autoFocus
                      placeholder="Ej. Etiquetas Térmicas, Papelería, Hilos & Agujas..."
                      value={insumoPersonalizado}
                      onChange={(e) => setInsumoPersonalizado(e.target.value)}
                      required={suplidorForm.categoria_insumo === "OTROS"}
                      className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="dir_suplidor" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Dirección
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                  <Input
                    id="dir_suplidor"
                    placeholder="Calle, Sector, Ciudad..."
                    value={suplidorForm.direccion}
                    onChange={(e) =>
                      setSuplidorForm((prev) => ({ ...prev, direccion: e.target.value }))
                    }
                    className="h-10 pl-9.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20 text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/60 px-4 sm:px-5 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalSuplidorOpen(false)}
                className="h-9.5 rounded-xl px-3.5 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9.5 rounded-xl bg-[#F0B900] hover:bg-[#d9a700] text-[#1B4B73] border border-[#d4a300] font-extrabold cursor-pointer shadow-xs active:translate-y-px px-5 text-xs sm:text-sm whitespace-nowrap"
              >
                Registrar Suplidor
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: HISTORIAL DE ABONOS */}
      <Dialog open={modalHistorialOpen} onOpenChange={setModalHistorialOpen}>
        <DialogContent className="flex max-h-[92vh] w-[94vw] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-none bg-background p-0 shadow-2xl text-foreground">
          {/* MODAL HEADER */}
          <div className="shrink-0 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 sm:p-4 pb-3 relative border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-3 pr-8">
              <div className="h-9 w-9 rounded-2xl bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-sky-950/50 dark:text-sky-400 flex items-center justify-center border border-[#1B4B73]/20 shadow-xs shrink-0">
                <Clock className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-display font-bold text-foreground">
                  Historial de Pagos
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Factura #{facturaSeleccionada?.numero_factura} · <span className="font-semibold text-foreground">{facturaSeleccionada?.suplidor?.nombre_comercial || "Suplidor"}</span>
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 sm:px-5 py-3.5">
            {/* Mini-resumen compacto de la factura */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="py-2 px-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block truncate tabular-nums mt-0.5">
                  {formatRD(facturaSeleccionada?.total || 0)}
                </span>
              </div>

              <div className="py-2 px-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Abonado</span>
                <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-300 block truncate tabular-nums mt-0.5">
                  {formatRD(facturaSeleccionada?.monto_pagado || 0)}
                </span>
              </div>

              <div className="py-2 px-2.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 shadow-2xs">
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">Pendiente</span>
                <span className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300 block truncate tabular-nums mt-0.5">
                  {formatRD(facturaSeleccionada?.saldo_pendiente || 0)}
                </span>
              </div>
            </div>

            {/* Detalle de abonos o estado vacío */}
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Pagos Realizados ({abonosDeFacturaSeleccionada.length})
              </p>

              {abonosDeFacturaSeleccionada.length === 0 ? (
                <div className="py-7 px-3 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col items-center justify-center space-y-2">
                  <Banknote className="h-8 w-8 text-slate-400/60" />
                  <p className="text-xs text-muted-foreground font-medium">
                    No hay pagos registrados para esta factura aún.
                  </p>
                  {facturaSeleccionada && (facturaSeleccionada.saldo_pendiente || 0) > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8.5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all mt-1"
                      onClick={() => {
                        setModalHistorialOpen(false);
                        setAbonoForm((prev) => ({
                          ...prev,
                          monto: facturaSeleccionada.saldo_pendiente,
                        }));
                        setModalAbonoOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Registrar Primer Abono</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900 max-h-[240px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {abonosDeFacturaSeleccionada.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 text-xs flex justify-between items-center hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-foreground text-xs sm:text-sm tabular-nums">{formatRD(a.monto)}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-bold rounded-md bg-slate-50 dark:bg-slate-800">
                            {a.metodo_pago}
                          </Badge>
                          {a.referencia_bancaria && <span className="font-mono">Ref: {a.referencia_bancaria}</span>}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground text-right tabular-nums font-medium">
                        {formatFechaDMY(a.fecha_pago)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/60 px-4 sm:px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalHistorialOpen(false)}
              className="cursor-pointer h-9.5 text-xs sm:text-sm px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold"
            >
              Cerrar
            </Button>

            {facturaSeleccionada && (facturaSeleccionada.saldo_pendiente || 0) > 0.01 && abonosDeFacturaSeleccionada.length > 0 && (
              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm h-9.5 px-4 rounded-xl cursor-pointer shadow-xs active:translate-y-px transition-all"
                onClick={() => {
                  setModalHistorialOpen(false);
                  setAbonoForm((prev) => ({
                    ...prev,
                    monto: facturaSeleccionada.saldo_pendiente,
                  }));
                  setModalAbonoOpen(true);
                }}
              >
                <Banknote className="h-4 w-4" />
                <span>Nuevo Abono</span>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMACIÓN: Eliminar Factura CXP */}
      <AlertDialog
        open={Boolean(facturaToDelete)}
        onOpenChange={(open) => !open && setFacturaToDelete(null)}
      >
        <AlertDialogContent className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 max-w-[420px] p-5 sm:p-6">
          <AlertDialogHeader>
            <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-1 border border-rose-100 dark:border-rose-900/50 shadow-xs">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              ¿Eliminar factura de compra?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Estás a punto de eliminar la factura{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                #{facturaToDelete?.numero_factura}
              </strong>{" "}
              de {facturaToDelete?.suplidor?.nombre_comercial || "este suplidor"}. Esta acción es irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2 pt-3">
            <AlertDialogCancel className="rounded-xl h-9.5 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteFactura}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-9.5 text-xs sm:text-sm font-bold shadow-xs cursor-pointer border-none"
            >
              Sí, eliminar factura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO DE CONFIRMACIÓN: Eliminar Suplidor */}
      <AlertDialog
        open={Boolean(suplidorToDelete)}
        onOpenChange={(open) => !open && setSuplidorToDelete(null)}
      >
        <AlertDialogContent className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 max-w-[420px] p-5 sm:p-6">
          <AlertDialogHeader>
            <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-1 border border-rose-100 dark:border-rose-900/50 shadow-xs">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              ¿Eliminar suplidor / proveedor?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Estás a punto de eliminar al suplidor{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                "{suplidorToDelete?.nombre_comercial}"
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2 pt-3">
            <AlertDialogCancel className="rounded-xl h-9.5 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteSuplidor}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-9.5 text-xs sm:text-sm font-bold shadow-xs cursor-pointer border-none"
            >
              Sí, eliminar suplidor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
