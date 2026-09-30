import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WifiOff, AlertTriangle, RefreshCw, MessageSquare } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        {isNetwork ? (
          /* PANTALLA NIVEL 1: SIN CONEXIÓN A INTERNET */
          <>
            <div className="mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/25">
              <WifiOff className="h-9 w-9 stroke-[2.2] text-white" />
            </div>
            <h1 className="text-2xl font-black font-display tracking-tight text-foreground uppercase">
              Sin conexión a Internet
            </h1>
            <p className="mt-2 text-sm text-muted-foreground font-sans leading-relaxed">
              No pudimos conectar con los servidores de Klynn. Por favor verifica tu señal Wi-Fi, cable de red o datos móviles.
            </p>
            <div className="mt-4 p-2.5 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900 text-[11px] font-bold text-red-800 dark:text-red-300 flex items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>Reconectando automáticamente al detectar señal...</span>
            </div>
          </>
        ) : (
          /* PANTALLA ESTÁNDAR: ERROR INESPERADO */
          <>
            <div className="mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-xs border border-destructive/20">
              <AlertTriangle className="h-9 w-9 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-black font-display tracking-tight text-foreground uppercase">
              Algo salió mal
            </h1>
            <p className="mt-2 text-sm text-muted-foreground font-sans leading-relaxed">
              Ocurrió un error inesperado al procesar la solicitud. Por favor intenta de nuevo.
            </p>
          </>
        )}

        {import.meta.env.DEV && error?.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold font-display text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.98] cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar Conexión
          </button>
          <a
            href="https://wa.me/18299416546?text=%C2%A1Hola%20tengo%20un%20error%20en%20Klynn%2C%20requiero%20soporte%2C%20por%20favor!"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-xs font-bold font-display text-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/30 cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Soporte Klynn
          </a>
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
