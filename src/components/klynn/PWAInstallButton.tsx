import { useEffect, useState } from "react";
import { Download, Monitor, Check, X, Sparkles, WifiOff } from "lucide-react";
import { toast } from "sonner";

interface PWAInstallProps {
  variant?: "header" | "sidebar-banner" | "card" | "settings";
  className?: string;
}

export function BrowserInstallIcon({ className = "h-4 w-4 inline-block" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Marco del monitor con apertura superior derecha */}
      <path d="M20 13v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h7" />
      {/* Base y soporte del monitor */}
      <path d="M8 21h8" />
      <path d="M12 18v3" />
      {/* Flecha hacia abajo entrando al monitor */}
      <path d="M17 3v9" />
      <path d="M13.5 8.5L17 12l3.5-3.5" />
    </svg>
  );
}

export function PWAInstallButton({ variant = "header", className = "" }: PWAInstallProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Detectar si ya está corriendo en modo standalone (instalado)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Verificar si el usuario lo descartó recientemente
    const dismissedAt = localStorage.getItem("klynn_pwa_banner_dismissed");
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 14) {
        setIsDismissed(true);
      }
    }

    // 3. Capturar el evento nativo de instalación
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast.success("¡Klynn POS se ha instalado en tu equipo exitosamente! 🎉");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast(
        <div className="flex items-start gap-3.5 text-left font-sans antialiased">
          <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <BrowserInstallIcon className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-1.5 min-w-0 flex-1">
            <p className="font-display font-bold text-[14px] text-slate-900 dark:text-white tracking-tight leading-snug">
              Instalar Klynn en tu computadora
            </p>
            <p className="text-[12.5px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
              Haz clic en el icono de instalación <span className="inline-flex items-center justify-center p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 align-middle shadow-2xs mx-0.5"><BrowserInstallIcon className="h-4 w-4 text-primary dark:text-sky-400" /></span> ubicado a la derecha en la barra de direcciones de tu navegador Chrome o Edge.
            </p>
          </div>
        </div>,
        { duration: 7000 }
      );
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } catch {
      toast.info("Haz clic en el icono de instalación en la barra superior de tu navegador para instalar.");
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    localStorage.setItem("klynn_pwa_banner_dismissed", Date.now().toString());
  };

  // Si ya está instalada la PWA
  if (isInstalled) {
    if (variant === "settings") {
      return (
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-2xs">
          <Check className="h-4 w-4 text-emerald-500" />
          <span>App de Escritorio Instalada y Activa</span>
        </div>
      );
    }
    return null;
  }

  // Si fue descartada y es el banner lateral
  if (isDismissed && variant === "sidebar-banner") {
    return null;
  }

  // ================= 1. VARIANTE SIDEBAR BANNER (Diseño sutil, elegante y descartable) =================
  if (variant === "sidebar-banner") {
    return (
      <div
        className={`relative mx-3 mb-3 p-3.5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-xs backdrop-blur-xs transition-all hover:border-primary/40 group ${className}`}
      >
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2.5 top-2.5 h-5 w-5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
          title="Ocultar sugerencia"
        >
          <X className="h-3 w-3" />
        </button>

        <div className="flex items-start gap-3 pr-4">
          <div className="h-8.5 w-8.5 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Monitor className="h-4.5 w-4.5 text-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[12.5px] font-bold text-slate-900 dark:text-white leading-tight">
                Instalar App POS
              </span>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <WifiOff className="h-2.5 w-2.5" /> Offline
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug mb-2.5">
              Accede directo desde tu escritorio sin navegador y factura sin internet.
            </p>

            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-xs hover:shadow-sm active:scale-98 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Instalar en Windows</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= 2. VARIANTE CARD / SETTINGS (Configuración o Dashboards) =================
  if (variant === "card" || variant === "settings") {
    return (
      <div
        onClick={handleInstallClick}
        className={`w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 hover:border-primary/40 text-primary dark:text-sky-400 transition-all cursor-pointer shadow-2xs hover:shadow-xs group ${className}`}
      >
        <div className="flex items-center gap-3.5 text-left">
          <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Instalar Aplicación de Escritorio
              </h4>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <Sparkles className="h-2.5 w-2.5" /> Recomendado
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ejecuta Klynn como app independiente en tu PC para mayor velocidad y modo offline continuo.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-primary text-white group-hover:scale-105 shadow-xs transition-transform shrink-0">
          <Download className="h-4 w-4" />
          <span>Instalar App</span>
        </div>
      </div>
    );
  }

  // ================= 3. VARIANTE HEADER (Badge sutil en la barra superior) =================
  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/25 hover:border-primary/40 text-primary dark:text-sky-300 text-xs font-bold shadow-2xs hover:bg-primary/15 transition-all active:scale-95 cursor-pointer group ${className}`}
      title="Instalar Klynn como aplicación de escritorio en Windows"
    >
      <Monitor className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
      <span>Instalar App</span>
      <Download className="h-3 w-3 opacity-70" />
    </button>
  );
}
