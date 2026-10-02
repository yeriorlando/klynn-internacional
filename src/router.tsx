import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  WifiOff,
  RefreshCw,
  MessageSquare,
  WashingMachine,
  Sparkles,
  Shirt,
  ArrowRight,
} from "lucide-react";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  // Comprobar si el fallo es por desconexión de red o fallo al descargar módulos/chunks
  const isNetworkError = () => {
    if (!isOnline && typeof navigator !== "undefined" && !navigator.onLine) {
      return true;
    }
    const msg = (error?.message || "").toLowerCase();
    const name = (error?.name || "").toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("dynamically imported module") ||
      msg.includes("networkerror") ||
      msg.includes("network error") ||
      msg.includes("chunk load") ||
      msg.includes("loading chunk") ||
      msg.includes("net::err_") ||
      msg.includes("err_internet_disconnected") ||
      msg.includes("err_connection_refused") ||
      msg.includes("err_name_not_resolved") ||
      msg.includes("load failed") ||
      name.includes("networkerror")
    );
  };

  const isNetwork = isNetworkError();

  // Escuchar cuando el usuario recupere el internet para auto-reintentar
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Cuando vuelva la conexión a internet, recargar automáticamente
      setTimeout(() => {
        window.location.reload();
      }, 500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50/60 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-8 overflow-hidden font-sans">
      {/* Burbujas y brillos decorativos de fondo con temática de lavandería */}
      <div className="absolute top-12 left-1/4 h-72 w-72 rounded-full bg-sky-200/35 dark:bg-sky-900/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-1/4 h-72 w-72 rounded-full bg-emerald-200/25 dark:bg-emerald-950/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-12 h-40 w-40 rounded-full bg-indigo-200/20 dark:bg-indigo-950/15 blur-2xl pointer-events-none" />

      {/* Tarjeta Principal */}
      <div className="relative z-10 max-w-sm sm:max-w-md w-full rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-xl p-5 sm:p-6 text-center backdrop-blur-sm space-y-3">
        {isNetwork ? (
          /* PANTALLA NIVEL 1: SIN CONEXIÓN A INTERNET (TEMÁTICA LAVANDERÍA) */
          <>
            {/* Ilustración de lavandería sin red */}
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 shadow-sm">
              <WifiOff className="h-8 w-8 stroke-[2]" />
              <div className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#1B4B73] text-white shadow-sm border-2 border-white dark:border-slate-900">
                <WashingMachine className="h-3 w-3" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/80 dark:bg-rose-950/60 border border-rose-300/80 dark:border-rose-800 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <span>Sin señal en la lavandería</span>
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white leading-snug">
                Sin conexión a internet
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed max-w-xs mx-auto">
                No pudimos conectar con los servidores de Klynn. Por favor verifica tu red Wi-Fi o datos móviles para continuar emitiendo y cobrando órdenes.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900 text-xs font-medium text-rose-800 dark:text-rose-300 flex items-center justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0"></span>
              <span>Reconectando automáticamente al detectar señal...</span>
            </div>
          </>
        ) : (
          /* PANTALLA ESTÁNDAR: ERROR INESPERADO (TEMÁTICA LAVANDERÍA) */
          <>
            {/* Ilustración de Lavadora Klynn con burbujas y prenda */}
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100/90 to-indigo-100/70 dark:from-slate-800 dark:to-slate-800/90 border border-sky-300/70 dark:border-slate-700 text-[#1B4B73] dark:text-sky-300 shadow-sm">
              <WashingMachine className="h-8 w-8 stroke-[2] text-[#1B4B73] dark:text-sky-300" />
              
              {/* Burbuja / Brillo */}
              <div className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-sm border-2 border-white dark:border-slate-900">
                <Sparkles className="h-3 w-3 fill-current" />
              </div>

              {/* Prenda pequeña */}
              <div className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1B4B73] text-white shadow-sm border-2 border-white dark:border-slate-900">
                <Shirt className="h-2.5 w-2.5" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-100/90 dark:bg-sky-950/60 border border-sky-300/70 dark:border-sky-800 px-2.5 py-0.5 text-xs font-semibold text-[#1B4B73] dark:text-sky-300">
              <WashingMachine className="h-3.5 w-3.5" />
              <span>Ciclo interrumpido</span>
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white leading-snug">
                ¡Se nos enredó una prenda!
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed max-w-xs mx-auto">
                Ocurrió una pausa inesperada en el proceso. No te preocupes, tus órdenes y datos están seguros en Klynn.
              </p>
            </div>
          </>
        )}

        {/* Diagnóstico técnico */}
        {error?.message && (
          <div className="text-left rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200/90 dark:border-slate-800 p-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0"></span>
                Diagnóstico del sistema:
              </span>
              <span className="font-mono text-[10px] text-slate-400">Reporte técnico</span>
            </div>
            <pre className="max-h-20 overflow-auto font-mono text-[10.5px] text-rose-600 dark:text-rose-400 whitespace-pre-wrap break-words leading-relaxed select-all">
              {error.message}
            </pre>
          </div>
        )}

        {/* Botones de acción */}
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#1B4B73] hover:bg-[#153a5b] px-3 text-xs font-semibold text-white shadow-sm transition-all active:scale-[0.98] cursor-pointer border-none"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reiniciar ciclo</span>
          </button>
          <a
            href="https://wa.me/18299416546?text=%C2%A1Hola%20tengo%20un%20error%20en%20Klynn%2C%20requiero%20soporte%2C%20por%20favor!"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 text-xs font-semibold text-white shadow-sm transition-all active:scale-[0.98] cursor-pointer border-none"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Soporte Klynn</span>
          </a>
        </div>

        {/* Enlace secundario para volver al inicio */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="text-xs font-medium text-[#1B4B73] dark:text-sky-400 hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            <span>Volver al inicio</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "always",
      staleTime: 1000 * 60 * 5, // 5 minutos por defecto
      gcTime: 1000 * 60 * 30, // 30 minutos
      retry: 0,
      refetchOnWindowFocus: false,
    },
    mutations: {
      networkMode: "always",
    },
  },
});

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 1000 * 60 * 5,
    defaultErrorComponent: DefaultErrorComponent,
  });

  return router;
};
