import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Delete, LogOut, Eye, EyeOff, ShieldCheck, Store, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/klynn/UserAvatar";
import { supabase } from "@/lib/supabase";
import type { Empleado, Tenant } from "@/lib/storage";
import { toast } from "sonner";

const LAUNDRY_BUBBLES = [
  // Lado Izquierdo
  { id: 1, size: 100, top: "3%", left: "3%", dur: 7.5, delay: 0, swayX: [-12, 14, -8, 10, -12], floatY: [-22, 20, -22], scale: [1, 1.05, 0.96, 1.04, 1] },
  { id: 2, size: 28, top: "14%", left: "10%", dur: 5.2, delay: 0.3, swayX: [10, -14, 12, -8, 10], floatY: [24, -22, 24], scale: [1, 1.08, 0.94, 1.06, 1] },
  { id: 3, size: 14, top: "20%", left: "6%", dur: 4.2, delay: 0.8, swayX: [-8, 10, -6, 8, -8], floatY: [-16, 18, -16] },
  { id: 4, size: 22, top: "25%", left: "14%", dur: 6.0, delay: 0.1, swayX: [14, -10, 12, -14, 14], floatY: [20, -24, 20], scale: [1, 1.06, 0.95, 1.04, 1] },
  { id: 5, size: 10, top: "31%", left: "4%", dur: 3.8, delay: 1.2, swayX: [-6, 8, -8, 6, -6], floatY: [-14, 15, -14] },
  { id: 6, size: 18, top: "37%", left: "12%", dur: 5.5, delay: 0.6, swayX: [8, -12, 10, -8, 8], floatY: [18, -20, 18] },
  { id: 7, size: 8, top: "43%", left: "8%", dur: 3.4, delay: 1.7, swayX: [-5, 7, -6, 5, -5], floatY: [-12, 14, -12] },
  { id: 8, size: 120, bottom: "4%", left: "2%", dur: 9.2, delay: 0, swayX: [-15, 12, -10, 14, -15], floatY: [-26, 24, -26], scale: [1, 1.04, 0.96, 1.03, 1] },
  { id: 9, size: 36, bottom: "16%", left: "12%", dur: 6.5, delay: 0.4, swayX: [12, -16, 14, -10, 12], floatY: [25, -22, 25], scale: [1, 1.07, 0.94, 1.05, 1] },
  { id: 10, size: 12, bottom: "24%", left: "5%", dur: 4.0, delay: 1.0, swayX: [-7, 9, -8, 7, -7], floatY: [-15, 16, -15] },
  { id: 11, size: 20, bottom: "30%", left: "15%", dur: 5.0, delay: 0.5, swayX: [9, -11, 8, -10, 9], floatY: [18, -18, 18] },
  { id: 12, size: 7, bottom: "38%", left: "8%", dur: 3.2, delay: 1.5, swayX: [-4, 6, -5, 4, -4], floatY: [-10, 12, -10] },
  { id: 13, size: 16, bottom: "46%", left: "14%", dur: 4.6, delay: 0.9, swayX: [7, -9, 8, -6, 7], floatY: [16, -16, 16] },
  { id: 14, size: 9, bottom: "54%", left: "6%", dur: 3.6, delay: 2.0, swayX: [-5, 7, -6, 5, -5], floatY: [-12, 13, -12] },

  // Lado Derecho
  { id: 15, size: 90, top: "5%", right: "4%", dur: 8.0, delay: 0.2, swayX: [14, -12, 10, -14, 14], floatY: [22, -24, 22], scale: [1, 1.05, 0.95, 1.04, 1] },
  { id: 16, size: 30, top: "16%", right: "12%", dur: 5.6, delay: 0.5, swayX: [-12, 15, -10, 12, -12], floatY: [-22, 24, -22], scale: [1, 1.08, 0.94, 1.06, 1] },
  { id: 17, size: 14, top: "22%", right: "5%", dur: 4.4, delay: 1.1, swayX: [8, -10, 7, -9, 8], floatY: [16, -17, 16] },
  { id: 18, size: 24, top: "28%", right: "16%", dur: 6.2, delay: 0.3, swayX: [-14, 11, -13, 10, -14], floatY: [-20, 22, -20], scale: [1, 1.06, 0.95, 1.04, 1] },
  { id: 19, size: 9, top: "34%", right: "7%", dur: 3.5, delay: 1.8, swayX: [6, -7, 5, -6, 6], floatY: [13, -14, 13] },
  { id: 20, size: 18, top: "40%", right: "11%", dur: 5.1, delay: 0.7, swayX: [-8, 11, -9, 7, -8], floatY: [-18, 19, -18] },
  { id: 21, size: 11, top: "46%", right: "18%", dur: 4.1, delay: 1.3, swayX: [7, -8, 6, -7, 7], floatY: [15, -16, 15] },
  { id: 22, size: 85, bottom: "6%", right: "4%", dur: 7.8, delay: 0.1, swayX: [12, -15, 11, -13, 12], floatY: [24, -22, 24], scale: [1, 1.04, 0.96, 1.03, 1] },
  { id: 23, size: 40, bottom: "18%", right: "13%", dur: 6.6, delay: 0.4, swayX: [-15, 18, -12, 14, -15], floatY: [-24, 26, -24], scale: [1, 1.07, 0.94, 1.05, 1] },
  { id: 24, size: 12, bottom: "26%", right: "6%", dur: 4.3, delay: 1.2, swayX: [7, -9, 8, -6, 7], floatY: [15, -16, 15] },
  { id: 25, size: 22, bottom: "33%", right: "17%", dur: 5.4, delay: 0.6, swayX: [-10, 12, -9, 11, -10], floatY: [-19, 21, -19] },
  { id: 26, size: 8, bottom: "41%", right: "8%", dur: 3.3, delay: 1.9, swayX: [5, -6, 4, -5, 5], floatY: [11, -12, 11] },
  { id: 27, size: 16, bottom: "49%", right: "12%", dur: 4.8, delay: 1.4, swayX: [-7, 9, -8, 6, -7], floatY: [-16, 17, -16] },
  { id: 28, size: 6, bottom: "56%", right: "19%", dur: 3.0, delay: 2.2, swayX: [4, -5, 3, -4, 4], floatY: [9, -10, 9] },

  // Flotando alrededor del Centro y Bordes
  { id: 29, size: 14, top: "7%", left: "28%", dur: 5.0, delay: 0.4, swayX: [-6, 8, -7, 5, -6], floatY: [-14, 16, -14] },
  { id: 30, size: 12, top: "9%", right: "28%", dur: 4.7, delay: 0.9, swayX: [6, -7, 5, -6, 6], floatY: [13, -15, 13] },
  { id: 31, size: 16, bottom: "3%", left: "30%", dur: 5.8, delay: 0.7, swayX: [-8, 9, -7, 8, -8], floatY: [-16, 18, -16] },
  { id: 32, size: 13, bottom: "5%", right: "30%", dur: 4.5, delay: 1.3, swayX: [7, -8, 6, -7, 7], floatY: [14, -15, 14] },
];

interface PinLockScreenProps {
  isOpen: boolean;
  empleado: Empleado;
  tenant: Tenant;
  cajaAbierta?: boolean;
  onUnlock: () => void;
  onLogout: () => void;
}

export function PinLockScreen({
  isOpen,
  empleado,
  tenant,
  cajaAbierta = false,
  onUnlock,
  onLogout,
}: PinLockScreenProps) {
  const [pin, setPin] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  // Modo alternativo de contraseña
  const [usePasswordFallback, setUsePasswordFallback] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState<boolean>(false);

  const isCheckingRef = useRef<boolean>(false);

  // Reloj en tiempo real y fecha con ortografía correcta en español
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-DO", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );

      const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      const diaSemana = dias[now.getDay()];
      const diaMes = now.getDate();
      const mes = meses[now.getMonth()];
      const anio = now.getFullYear();

      // Formato solicitado: Jueves 3 de septiembre 2026
      setCurrentDate(`${diaSemana} ${diaMes} de ${mes} ${anio}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Limpiar estados al abrir y bloquear completamente cualquier desplazamiento
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setIsError(false);
      setIsSuccess(false);
      setIsUnlocking(false);
      setErrorMessage("");
      setPasswordInput("");
      setUsePasswordFallback(!empleado.pin);
      isCheckingRef.current = false;

      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      const handleWheel = (e: WheelEvent) => e.preventDefault();
      const handleTouchMove = (e: TouchEvent) => e.preventDefault();
      window.addEventListener("wheel", handleWheel, { passive: false });
      window.addEventListener("touchmove", handleTouchMove, { passive: false });

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("touchmove", handleTouchMove);
      };
    }
  }, [isOpen, empleado.pin]);

  // Manejador de transición suave de desbloqueo
  const triggerUnlock = useCallback(() => {
    setIsSuccess(true);
    setIsUnlocking(true);
    if (typeof navigator !== "undefined" && (navigator as any).vibrate) {
      (navigator as any).vibrate([40, 30, 40]);
    }
    setTimeout(() => {
      onUnlock();
      setIsUnlocking(false);
      setIsSuccess(false);
      isCheckingRef.current = false;
    }, 480);
  }, [onUnlock]);

  // Manejador de validación de PIN
  const verifyPin = useCallback(
    (enteredPin: string) => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      // Si no tiene PIN configurado
      if (!empleado.pin) {
        setIsError(true);
        setErrorMessage("No tienes un PIN configurado. Usa tu contraseña.");
        setTimeout(() => {
          setUsePasswordFallback(true);
          isCheckingRef.current = false;
        }, 800);
        return;
      }

      if (enteredPin === empleado.pin) {
        setIsError(false);
        setErrorMessage("");
        triggerUnlock();
      } else {
        setIsError(true);
        setErrorMessage("PIN incorrecto");
        if (typeof navigator !== "undefined" && (navigator as any).vibrate) {
          (navigator as any).vibrate(150);
        }
        setTimeout(() => {
          setPin("");
          setIsError(false);
          setErrorMessage("");
          isCheckingRef.current = false;
        }, 600);
      }
    },
    [empleado.pin, triggerUnlock]
  );

  // Agregar dígito
  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length >= 4 || isCheckingRef.current) return;
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    },
    [pin, verifyPin]
  );

  // Borrar dígito
  const handleDelete = useCallback(() => {
    if (isCheckingRef.current) return;
    setPin((prev) => prev.slice(0, -1));
    setIsError(false);
    setErrorMessage("");
  }, []);

  // Limpiar todo el PIN
  const handleClear = useCallback(() => {
    if (isCheckingRef.current) return;
    setPin("");
    setIsError(false);
    setErrorMessage("");
  }, []);

  // Escuchar teclado físico
  useEffect(() => {
    if (!isOpen || usePasswordFallback) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, usePasswordFallback, handleDigit, handleDelete, handleClear]);

  // Desbloqueo mediante contraseña
  const handleUnlockWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim() || isUnlocking) return;

    setIsVerifyingPassword(true);
    try {
      // 1. Intentar validar con Supabase Auth si hay conexión
      if (navigator.onLine && empleado.email) {
        const { error } = await supabase.auth.signInWithPassword({
          email: empleado.email,
          password: passwordInput,
        });
        if (!error) {
          triggerUnlock();
          return;
        }
      }

      // 2. Fallback con contraseña guardada si coincide
      if (empleado.password && empleado.password === passwordInput) {
        triggerUnlock();
        return;
      }

      toast.error("Contraseña incorrecta ❌");
    } catch {
      toast.error("Error al validar la contraseña");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  if (!isOpen) return null;

  const roleLabel =
    (
      {
        ADMIN: "Administrador",
        CAJERO: "Cajero",
        VENDEDOR: "Vendedor",
        RECEPCIONISTA: "Recepcionista",
        REPARTIDOR: "Repartidor",
        OPERARIO: "Operario",
      } as Record<string, string>
    )[empleado.rol] ?? empleado.rol;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={
        isUnlocking
          ? { opacity: 0, scale: 1.02, filter: "blur(8px)" }
          : { opacity: 1, scale: 1, filter: "blur(0px)" }
      }
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[99999] grid place-items-center p-4 sm:p-6 select-none overflow-hidden bg-gradient-to-b from-[#B8E2FD] via-[#CEEBFE] to-[#A8DAFC]"
    >
      {/* 1. Atmósfera Acuática Klynn con Esferas de Luz Azul Vibrante */}
      <motion.div
        animate={
          isUnlocking
            ? { opacity: 0, scale: 1.05 }
            : { opacity: 1, scale: 1 }
        }
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      >
        <div className="absolute -top-32 left-1/4 w-[700px] h-[550px] rounded-full bg-[#38BDF8]/45 blur-[90px]" />
        <div className="absolute top-1/3 -left-28 w-[550px] h-[550px] rounded-full bg-[#1B4B73]/30 blur-[100px]" />
        <div className="absolute -bottom-36 right-8 w-[650px] h-[600px] rounded-full bg-[#0284C7]/35 blur-[100px]" />
        <div className="absolute top-1/4 -right-16 w-[450px] h-[450px] rounded-full bg-[#60A5FA]/40 blur-[90px]" />

        {/* Ondas de Agua Sólidas SVG en el Fondo */}
        <div className="absolute bottom-0 inset-x-0 h-80 opacity-60 overflow-hidden pointer-events-none">
          <motion.svg
            animate={{ x: [-35, 0, -35] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            viewBox="0 0 1440 320"
            className="absolute bottom-0 w-[125%] h-full text-[#7DD3FC] fill-current"
            preserveAspectRatio="none"
          >
            <path d="M0,192L48,197.3C96,203,192,213,288,197.3C384,181,480,139,576,138.7C672,139,768,181,864,186.7C960,192,1056,160,1152,144C1248,128,1344,128,1392,128L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </motion.svg>
          <motion.svg
            animate={{ x: [0, -45, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            viewBox="0 0 1440 320"
            className="absolute bottom-0 w-[125%] h-full text-[#60A5FA]/60 fill-current"
            preserveAspectRatio="none"
          >
            <path d="M0,96L48,112C96,128,192,160,288,181.3C384,203,480,213,576,192C672,171,768,117,864,112C960,107,1056,149,1152,165.3C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </motion.svg>
        </div>

        {/* 2. Conjunto Rico de 32 Burbujas de Jabón y Agua con Movimiento Natural de Lavandería */}
        {LAUNDRY_BUBBLES.map((b) => (
          <motion.div
            key={b.id}
            style={{
              width: b.size,
              height: b.size,
              top: b.top,
              bottom: b.bottom,
              left: b.left,
              right: b.right,
            }}
            animate={{
              y: b.floatY,
              x: b.swayX,
              scale: b.scale || [1, 1.06, 0.96, 1.03, 1],
              rotate: [0, 8, -8, 4, 0],
            }}
            transition={{
              duration: b.dur,
              delay: b.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute rounded-full pointer-events-none select-none ${
              b.size > 60
                ? "bg-gradient-to-tr from-white/80 via-sky-200/60 to-blue-200/50 border-2 border-white shadow-[0_12px_36px_rgba(2,132,199,0.25)] backdrop-blur-xs"
                : b.size > 20
                ? "bg-gradient-to-tr from-white/85 via-sky-200/65 to-blue-100/50 border-1.5 border-white shadow-[0_4px_18px_rgba(2,132,199,0.2)]"
                : "bg-gradient-to-tr from-white/95 via-sky-300/65 to-white/70 border border-white shadow-xs"
            }`}
          >
            {/* Reflejo Curvo de Burbuja de Jabón Realista */}
            {b.size >= 14 && (
              <div 
                className="absolute rounded-full bg-white/95 rotate-[-30deg]" 
                style={{
                  top: Math.max(2, b.size * 0.1),
                  left: Math.max(2.5, b.size * 0.12),
                  width: Math.max(3, b.size * 0.24),
                  height: Math.max(1.5, b.size * 0.11),
                }}
              />
            )}
            {b.size >= 35 && (
              <div 
                className="absolute rounded-full bg-white/70"
                style={{
                  bottom: b.size * 0.12,
                  right: b.size * 0.15,
                  width: Math.max(2, b.size * 0.09),
                  height: Math.max(2, b.size * 0.09),
                }}
              />
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Contenedor central perfectamente centrado y con tamaño equilibrado */}
      <div className="w-full max-w-[390px] flex flex-col items-center justify-center relative z-10 m-auto">
        {/* Indicador superior de tiempo y fecha con animación coordinada */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={
            isUnlocking
              ? { opacity: 0, y: -26, scale: 0.94, filter: "blur(4px)" }
              : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
          }
          transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 flex flex-col items-center text-center text-[#1B4B73]"
        >
          <div className="overflow-hidden py-1">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentTime}
                initial={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl sm:text-5xl font-black font-display tracking-tight text-[#1B4B73] drop-shadow-[0_2px_14px_rgba(255,255,255,0.85)]"
              >
                {currentTime || "--:--"}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="text-sm font-bold text-[#1B4B73]/85 mt-0.5 tracking-wide drop-shadow-xs">
            {currentDate || ""}
          </div>

          {/* Widgets y Resumen Operativo en Reposo (Discreto & Elegante) */}
          <div className="mt-2.5 flex items-center justify-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-white/90 backdrop-blur-md text-[11px] font-semibold text-[#1B4B73] shadow-sm">
              <span className={`h-2 w-2 rounded-full ${cajaAbierta ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span>{cajaAbierta ? "Caja Abierta" : "Caja Cerrada"}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-white/90 backdrop-blur-md text-[11px] font-semibold text-[#1B4B73] shadow-sm">
              <Store className="h-3 w-3 text-[#1B4B73]" />
              <span className="truncate max-w-[130px] font-bold">{tenant.nombre}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-white/90 backdrop-blur-md text-[11px] font-semibold text-emerald-700 shadow-sm">
              <ShieldCheck className="h-3 w-3" />
              <span>Protegida</span>
            </div>
          </div>
        </motion.div>

        {/* Tarjeta de desbloqueo con animación cinemática hacia el usuario */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={
            isUnlocking
              ? { opacity: 0, scale: 1.05, y: -10, filter: "blur(3px)" }
              : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
          }
          transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
          className="w-full rounded-3xl border border-white/90 bg-white/95 shadow-[0_24px_50px_rgba(2,132,199,0.22)] p-5 sm:p-6 backdrop-blur-xl"
        >
          {/* Info del Empleado */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-2.5">
              <div className="h-14 w-14 rounded-full bg-[#1B4B73] text-white flex items-center justify-center font-bold text-xl shadow-md ring-2 ring-white/70 dark:ring-slate-800">
                <UserAvatar
                  name={empleado.nombre}
                  avatarUrl={empleado.avatar_url}
                  size={56}
                />
              </div>
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs" />
            </div>

            {isUnlocking ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1.5 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                <Unlock className="h-3 w-3 text-emerald-600 animate-bounce" />
                <span>Desbloqueando...</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                <Lock className="h-3 w-3 text-[#F0B900]" />
                <span>Terminal Suspendida</span>
              </div>
            )}

            <h3 className="font-display font-black text-lg text-foreground tracking-tight leading-tight">
              {empleado.nombre} {empleado.apellido || ""}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 justify-center">
              <span>{tenant.nombre}</span>
              <span>•</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold uppercase">
                {roleLabel}
              </Badge>
            </p>
          </div>

          {/* Vista A: Teclado PIN */}
          {!usePasswordFallback ? (
            <div className="mt-4 space-y-3.5">
              <p className="text-xs font-semibold text-center text-slate-500 dark:text-slate-400">
                Ingresa tu PIN de 4 dígitos
              </p>

              {/* Los 4 Círculos Indicadores */}
              <motion.div
                animate={isError ? { x: [-10, 10, -6, 6, -3, 3, 0] } : {}}
                transition={{ duration: 0.35 }}
                className="flex items-center justify-center gap-3.5 py-0.5"
              >
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = pin.length > index;
                  return (
                    <motion.div
                      key={index}
                      initial={false}
                      animate={{
                        scale: isFilled ? [1, 1.2, 1] : 1,
                      }}
                      transition={{ duration: 0.16 }}
                      className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
                        isError
                          ? "bg-rose-500 ring-3 ring-rose-500/20"
                          : isSuccess
                            ? "bg-emerald-500 ring-3 ring-emerald-500/20"
                            : isFilled
                              ? "bg-[#1B4B73] dark:bg-[#F0B900] ring-3 ring-[#1B4B73]/20 dark:ring-[#F0B900]/20"
                              : "border-2 border-slate-300 dark:border-slate-700 bg-transparent"
                      }`}
                    />
                  );
                })}
              </motion.div>

              {/* Mensaje de error si falla */}
              <div className="h-3 text-center">
                {errorMessage && (
                  <p className="text-[10.5px] font-bold text-rose-500 animate-in fade-in">
                    {errorMessage}
                  </p>
                )}
              </div>

              {/* Teclado Numérico Táctil */}
              <div className="grid grid-cols-3 gap-2 max-w-[225px] mx-auto pt-0.5">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isUnlocking}
                    onClick={() => handleDigit(num)}
                    className="h-11 w-full rounded-xl bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-foreground font-display font-bold text-lg transition-all active:scale-90 flex items-center justify-center shadow-2xs cursor-pointer select-none"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={isUnlocking}
                  onClick={handleClear}
                  className="h-11 w-full rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-[11px] uppercase tracking-wider transition-all active:scale-90 flex items-center justify-center cursor-pointer select-none"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  disabled={isUnlocking}
                  onClick={() => handleDigit("0")}
                  className="h-11 w-full rounded-xl bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-foreground font-display font-bold text-lg transition-all active:scale-90 flex items-center justify-center shadow-2xs cursor-pointer select-none"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={isUnlocking}
                  onClick={handleDelete}
                  className="h-11 w-full rounded-xl bg-slate-100/50 dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all active:scale-90 flex items-center justify-center shadow-2xs cursor-pointer select-none"
                >
                  <Delete className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Alternar a contraseña si olvidó el PIN */}
              <div className="pt-1.5 text-center">
                <button
                  type="button"
                  onClick={() => setUsePasswordFallback(true)}
                  className="text-xs font-semibold text-slate-500 hover:text-primary transition-colors cursor-pointer"
                >
                  ¿Olvidaste tu PIN? Desbloquear con contraseña
                </button>
              </div>
            </div>
          ) : (
            /* Vista B: Desbloqueo con Contraseña */
            <form onSubmit={handleUnlockWithPassword} className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-center text-slate-500 dark:text-slate-400">
                Ingresa tu contraseña de acceso
              </p>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoFocus
                  disabled={isUnlocking}
                  className="h-10 rounded-xl pl-3.5 pr-10 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isVerifyingPassword || !passwordInput.trim() || isUnlocking}
                className="w-full h-10 rounded-xl bg-[#1B4B73] hover:bg-[#1B4B73]/90 font-bold text-sm text-white shadow-xs active:scale-98 cursor-pointer transition-all"
              >
                {isUnlocking ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    Desbloqueado
                  </span>
                ) : isVerifyingPassword ? (
                  "Verificando..."
                ) : (
                  "Desbloquear Pantalla"
                )}
              </Button>

              {empleado.pin ? (
                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => setUsePasswordFallback(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-primary transition-colors cursor-pointer"
                  >
                    ← Volver a ingresar PIN de 4 dígitos
                  </button>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-2.5 text-center border border-amber-200/60 dark:border-amber-900/40">
                  <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 leading-snug">
                    💡 Tip: Puedes configurar tu PIN de 4 dígitos en <b>Personal</b> para desbloquear con un solo toque.
                  </p>
                </div>
              )}
            </form>
          )}

          {/* Separador y Salir */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-muted-foreground">
            <span>¿No eres tú?</span>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
