import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { WifiOff, Wifi, RefreshCw, X } from "lucide-react";
import { isModuleEnabled } from "@/lib/storage";

import { queryClient } from "../router";

import "@/styles.css";
import appCss from "@/styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ghost"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>
        </div>
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  context: () => ({
    queryClient,
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Klynn — Software de gestión para lavanderías en RD" },
      { name: "description", content: "Plataforma SaaS multi-tenant para lavanderías dominicanas: órdenes, caja, ITBIS, tickets térmicos, clientes y entregas." },
      { name: "author", content: "Klynn" },
      { property: "og:title", content: "Klynn — Software de gestión para lavanderías en RD" },
      { property: "og:description", content: "Plataforma SaaS multi-tenant para lavanderías dominicanas: órdenes, caja, ITBIS, tickets térmicos, clientes y entregas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Klynn — Software de gestión para lavanderías en RD" },
      { name: "twitter:description", content: "Plataforma SaaS multi-tenant para lavanderías dominicanas: órdenes, caja, ITBIS, tickets térmicos, clientes y entregas." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/05ff4a4b-0512-4fb9-b96c-1b005d4fa98a/id-preview-e1b6eddf--32655e9b-c01d-4ebb-89e1-08399bd65bae.lovable.app-1777726950641.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/05ff4a4b-0512-4fb9-b96c-1b005d4fa98a/id-preview-e1b6eddf--32655e9b-c01d-4ebb-89e1-08399bd65bae.lovable.app-1777726950641.png" },
      { name: "theme-color", content: "#1B4B73" },
      { name: "application-name", content: "Klynn Cloud" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Klynn POS" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..800&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "96x96",
        href: "/favicon-96x96.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "48x48",
        href: "/favicon-48x48.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      {
        rel: "shortcut icon",
        href: "/favicon.ico",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Google Analytics & Hotjar (Solo en Producción) */}
        {import.meta.env.PROD && (
          <>
            <script async src="https://www.googletagmanager.com/gtag/js?id=G-9NWT8WTTL9"></script>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', 'G-9NWT8WTTL9');
                `,
              }}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (function(h,o,t,j,a,r){
                      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                      h._hjSettings={hjid:6708717,hjsv:6};
                      a=o.getElementsByTagName('head')[0];
                      r=o.createElement('script');r.async=1;
                      r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                      a.appendChild(r);
                  })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
                `,
              }}
            />
          </>
        )}
        {/* Service Worker, Control de Caché y Actualización Automática */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 1. Recuperación automática de chunks dinámicos desactualizados tras nuevos despliegues
              window.addEventListener('vite:preloadError', function(event) {
                event.preventDefault();
                var last = sessionStorage.getItem('klynn_chunk_reload');
                var now = Date.now();
                if (!last || now - parseInt(last, 10) > 8000) {
                  sessionStorage.setItem('klynn_chunk_reload', now.toString());
                  window.location.reload();
                }
              });

              window.addEventListener('unhandledrejection', function(event) {
                var reason = event.reason;
                var msg = (reason && (reason.message || reason.stack || reason.toString())) || '';
                if (
                  msg.includes('Failed to fetch dynamically imported module') ||
                  msg.includes('Importing a module script failed') ||
                  msg.includes('error loading dynamically imported module') ||
                  msg.includes('Unable to preload CSS')
                ) {
                  event.preventDefault();
                  var last = sessionStorage.getItem('klynn_chunk_reload');
                  var now = Date.now();
                  if (!last || now - parseInt(last, 10) > 8000) {
                    sessionStorage.setItem('klynn_chunk_reload', now.toString());
                    console.warn('[Klynn] Módulo desactualizado tras despliegue. Recargando con versión fresca...');
                    window.location.reload();
                  }
                }
              });

              // 2. Gestión de Service Worker y auto-actualización
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                if (${import.meta.env.DEV}) {
                  // En desarrollo: limpiar cualquier Service Worker activo y caché residual
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (var r of registrations) {
                      r.unregister();
                    }
                  });
                  if ('caches' in window) {
                    caches.keys().then(function(names) {
                      for (var name of names) {
                        caches.delete(name);
                      }
                    });
                  }
                } else {
                  var refreshing = false;
                  var hadPreviousController = Boolean(navigator.serviceWorker.controller);

                  function reloadAppSafely() {
                    if (refreshing) return;

                    // Si el usuario está escribiendo en un input, textarea o contenteditable, diferir reload
                    var activeEl = document.activeElement;
                    var isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);

                    if (isTyping) {
                      var onDone = function() {
                        if (!refreshing) {
                          refreshing = true;
                          window.removeEventListener('blur', onDone, true);
                          window.removeEventListener('focusout', onDone, true);
                          window.location.reload();
                        }
                      };
                      window.addEventListener('blur', onDone, true);
                      window.addEventListener('focusout', onDone, true);
                      setTimeout(onDone, 25000);
                      return;
                    }

                    refreshing = true;
                    console.log('[Klynn PWA] Nueva versión activada. Recargando aplicación...');
                    window.location.reload();
                  }

                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    if (!hadPreviousController) return;
                    reloadAppSafely();
                  });

                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(function(reg) {
                      console.log('[Klynn PWA] Service Worker activo y registrado');
                      reg.update().catch(function() {});

                      if (reg.waiting) {
                        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                      }

                      reg.addEventListener('updatefound', function() {
                        var newWorker = reg.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', function() {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                          }
                        });
                      });

                      // Chequeo periódico cada 15 minutos
                      setInterval(function() {
                        reg.update().catch(function() {});
                      }, 15 * 60 * 1000);

                      // Chequeo al reactivar pantalla / pestaña
                      document.addEventListener('visibilitychange', function() {
                        if (document.visibilityState === 'visible') {
                          reg.update().catch(function() {});
                        }
                      });
                    }).catch(function(err) {
                      console.warn('[Klynn PWA] Fallo al registrar Service Worker:', err);
                    });
                  });

                  // 3. Verificación redundante de versión de servidor (version.json)
                  var serverVersion = null;
                  function checkServerVersion() {
                    if (!navigator.onLine) return;
                    fetch('/version.json?_t=' + Date.now(), { cache: 'no-store' })
                      .then(function(res) {
                        if (!res.ok) return null;
                        return res.json();
                      })
                      .then(function(data) {
                        if (!data || !data.version) return;
                        if (serverVersion === null) {
                          serverVersion = data.version;
                        } else if (serverVersion !== data.version) {
                          serverVersion = data.version;
                          navigator.serviceWorker.getRegistration().then(function(reg) {
                            if (reg) {
                              reg.update().catch(function() {});
                            } else {
                              reloadAppSafely();
                            }
                          });
                        }
                      })
                      .catch(function() {});
                  }

                  setTimeout(checkServerVersion, 5000);
                  setInterval(checkServerVersion, 10 * 60 * 1000);
                  document.addEventListener('visibilitychange', function() {
                    if (document.visibilityState === 'visible') {
                      checkServerVersion();
                    }
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function checkHasOfflineModule(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("klynn_last_auth_user");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const tenant = parsed?.tenant;
    if (!tenant) return false;
    return isModuleEnabled(tenant, "pos_offline");
  } catch {
    return false;
  }
}

function GlobalOfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [hasOfflineMode, setHasOfflineMode] = useState(false);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerRestoredNotification = useCallback(() => {
    setShowRestored(true);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setShowRestored(false);
    }, 3500);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const handleOnline = () => {
      if (!isMounted) return;
      setIsOnline(true);
      setIsDismissed(false);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      triggerRestoredNotification();
    };

    const handleOffline = () => {
      if (!isMounted) return;
      setIsOnline(false);
      setIsDismissed(false);
      setShowRestored(false);

      const isOfflineActive = checkHasOfflineModule();
      setHasOfflineMode(isOfflineActive);

      // Si la lavandería tiene el módulo Offline activo: auto-ocultar a los 6 segundos para no molestar al cajero
      if (isOfflineActive) {
        if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = setTimeout(() => {
          if (isMounted) {
            setIsDismissed(true);
          }
        }, 6000);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [triggerRestoredNotification]);

  const handleRetry = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      setIsOnline(true);
      setIsDismissed(false);
      triggerRestoredNotification();
    }, 400);
  };

  // ESTADO 1: SIN CONEXIÓN A INTERNET (FONDO BLANCO, ICONO WIFI FONDO ROJO CON ICONO BLANCO, BOTÓN AZUL AÑIL)
  if (!isOnline && !isDismissed) {
    return (
      <aside
        aria-live="polite"
        role="status"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] max-w-[94vw] sm:max-w-md w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl border border-red-200/80 dark:border-red-900/50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-red-500 flex items-center justify-center shrink-0 shadow-xs text-white">
            <WifiOff className="h-4 w-4 text-white stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black font-display tracking-tight block leading-tight text-slate-900 dark:text-white">
                Sin conexión a Internet
              </span>
              {hasOfflineMode && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase font-display bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  Modo Offline
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans block truncate leading-tight mt-0.5">
              {hasOfflineMode
                ? "Modo Offline activo — Órdenes guardadas localmente."
                : "Esperando reconexión para sincronizar..."}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isChecking}
            className="text-[10px] font-black uppercase font-display px-3 py-1.5 rounded-xl bg-[#1B4B73] hover:bg-[#133857] text-white shrink-0 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm shadow-[#1B4B73]/25 disabled:opacity-75"
          >
            {isChecking ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin text-white" />
                <span>Comprobando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 text-white" />
                <span>Reintentar</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Cerrar aviso"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // ESTADO 2: CON CONEXIÓN A INTERNET (FONDO BLANCO, ICONO WIFI FONDO VERDE CON ICONO BLANCO)
  if (showRestored) {
    return (
      <aside
        aria-live="polite"
        role="status"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] max-w-[94vw] sm:max-w-sm w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-xs text-white">
            <Wifi className="h-4 w-4 text-white stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black font-display tracking-tight block leading-tight text-slate-900 dark:text-white">
                Conexión restablecida
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase font-display bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                En línea
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-sans block leading-tight mt-0.5 font-medium">
              Has vuelto a estar en línea.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowRestored(false)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          title="Cerrar aviso"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </aside>
    );
  }

  return null;
}

function RootComponent() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  useEffect(() => {
    const isTenantWorkspace = pathname.startsWith("/t/") && !pathname.endsWith("/login");
    if (!isTenantWorkspace && typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
    }
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalOfflineBanner />
      <Outlet />
      <Toaster 
        position="top-center" 
        duration={2500}
        closeButton={false}
        toastOptions={{
          duration: 2500,
          style: {
            fontFamily: "'Plus Jakarta Sans', var(--font-sans), sans-serif",
          },
        }}
      />
    </QueryClientProvider>
  );
}
