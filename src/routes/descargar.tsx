import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Download,
  Monitor,
  CheckCircle2,
  Shield,
  Zap,
  Wifi,
  Printer,
  HardDrive,
  ArrowLeft,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { LandingNavbar } from "@/components/klynn/LandingNavbar";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

// ─── IMPORTANT: Paste the real download URL here when available ───────────────
const DOWNLOAD_URL = "https://github.com/yeriorlando/klynn/releases/download/v1.0.1/Klynn-Desktop-Setup-1.0.1.exe";
const COUNTDOWN_SECONDS = 5;
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/descargar")({
  validateSearch: (search: Record<string, unknown>) => ({
    autostart: search.autostart === true || search.autostart === "true",
  }),
  head: () => ({
    meta: [
      { title: "Descargar Klynn Desktop — Software de lavandería para Windows" },
      {
        name: "description",
        content:
          "Descarga Klynn Desktop, la versión local de Klynn para Windows. Funciona sin internet, con impresoras térmicas, caja y gestión completa de tu lavandería.",
      },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const { autostart } = Route.useSearch();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  // Auto-start when coming from the landing CTA via ?autostart=true
  useEffect(() => {
    if (autostart) setStarted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!started) return;
    if (countdown <= 0) {
      setDone(true);
      if (DOWNLOAD_URL) {
        const a = document.createElement("a");
        a.href = DOWNLOAD_URL;
        a.download = "KlynnDesktop-Setup.exe";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [started, countdown]);

  const handleDownload = () => {
    setStarted(true);
    setCountdown(COUNTDOWN_SECONDS);
    setDone(false);
  };

  const handleRetry = () => {
    if (DOWNLOAD_URL) window.open(DOWNLOAD_URL, "_blank");
  };

  const progress = started ? ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100 : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar de la landing */}
      <LandingNavbar />

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        {/* Glow background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-lg text-center"
        >
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-card">
            <Monitor className="h-3.5 w-3.5 text-primary" />
            Klynn Desktop · Para Windows
          </div>

          {/* Icon */}
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-elegant">
            <Download className="h-12 w-12 text-primary" />
          </div>

          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Klynn <span className="text-primary">Desktop</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            La experiencia completa de Klynn instalada en tu computadora. Sin depender del internet, sin límites.
          </p>

          {/* CTA / Countdown area */}
          <div className="mt-10 rounded-2xl border border-border bg-surface p-8 shadow-elegant">
            <AnimatePresence mode="wait">
              {!started && !done && (
                <motion.div
                  key="cta"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="mb-6 text-sm text-muted-foreground">
                    Haz clic en el botón para iniciar la descarga. El instalador es compatible con Windows 10 y 11.
                  </p>
                  <Button
                    id="btn-descargar-desktop"
                    onClick={handleDownload}
                    className="h-14 w-full text-base font-bold bg-primary shadow-glow hover:opacity-95 gap-3"
                    size="lg"
                  >
                    <Download className="h-5 w-5" />
                    Descargar Klynn Desktop
                  </Button>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Gratis para clientes activos · ~{" "}
                    <span className="font-semibold text-foreground">174 MB</span> · Windows 10/11
                  </p>
                </motion.div>
              )}

              {started && !done && (
                <motion.div
                  key="countdown"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Countdown circle */}
                  <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
                    <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-border"
                      />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="44"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="text-primary"
                        strokeDasharray={276.46}
                        animate={{ strokeDashoffset: 276.46 - (276.46 * progress) / 100 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                      />
                    </svg>
                    <motion.span
                      key={countdown}
                      initial={{ scale: 1.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="relative font-display text-5xl font-bold text-primary"
                    >
                      {countdown}
                    </motion.span>
                  </div>

                  <p className="text-lg font-semibold text-foreground">Tu descarga iniciará en unos segundos…</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Si la descarga no comienza automáticamente,{" "}
                    <button
                      onClick={handleRetry}
                      className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                    >
                      haz clic aquí
                    </button>
                    .
                  </p>

                  {/* Progress bar */}
                  <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                    />
                  </div>
                </motion.div>
              )}

              {done && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10"
                  >
                    <CheckCircle2 className="h-9 w-9 text-success" />
                  </motion.div>
                  <p className="text-xl font-bold text-foreground">¡Descarga iniciada!</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Revisa tu carpeta de descargas. Ejecuta el instalador y sigue los pasos en pantalla.
                  </p>
                  <button
                    onClick={handleRetry}
                    className="mt-5 flex items-center gap-2 mx-auto text-sm text-primary hover:opacity-80 transition-opacity font-medium"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Descargar de nuevo
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* System requirements */}
          <div className="mt-8 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
            {[
              { icon: Monitor, label: "Windows 10/11" },
              { icon: HardDrive, label: "200 MB libres" },
              { icon: Printer, label: "ESC/POS 57/80mm" },
              { icon: Wifi, label: "Funciona offline" },
            ].map((req) => (
              <div
                key={req.label}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center shadow-card"
              >
                <req.icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">{req.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Features strip */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mt-16 w-full max-w-2xl"
        >
          <p className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Incluido en Klynn Desktop
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Zap, t: "Súper rápido", d: "Corre directo en tu PC, sin latencia de red." },
              { icon: Shield, t: "Datos locales", d: "Tu información se guarda en tu propio equipo." },
              { icon: Sparkles, t: "Funciones completas", d: "Caja, órdenes, clientes, tickets y más." },
            ].map((f) => (
              <div key={f.t} className="rounded-xl border border-border bg-surface p-5 shadow-card">
                <f.icon className="mb-3 h-5 w-5 text-primary" />
                <div className="font-display font-semibold">{f.t}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-12 text-sm text-muted-foreground"
        >
          ¿Prefieres la versión en la nube?{" "}
          <Link to="/registro" className="text-primary hover:underline font-medium">
            Prueba Klynn Cloud gratis 14 días →
          </Link>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Klynn · Hecho con 🧼 en República Dominicana
      </footer>
    </div>
  );
}
