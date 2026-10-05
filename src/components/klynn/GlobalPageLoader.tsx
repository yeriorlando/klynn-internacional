"use client";

import { useEffect, useState, type CSSProperties } from "react";
import "./GlobalPageLoader.css";

export type LoaderMode = "default" | "login" | "logout";

export interface GlobalPageLoaderProps {
  /** Mode of loading:
   * - "default": No visible text (clean, modern SVG loader only).
   * - "login": Displays rotating welcome & security tips ("Cargando tu lavandería...", "Todas tus órdenes están seguras...", etc.).
   * - "logout": Displays safe session closure messages.
   */
  mode?: LoaderMode;
  /** Explicit text override (ignored in default mode unless showText=true). */
  text?: string;
  /** Force show text even when mode is default (defaults to false). */
  showText?: boolean;
  /** Any CSS length (e.g. "60vh", "320px") or Tailwind class (e.g. "min-h-screen"). */
  minHeight?: string;
  compact?: boolean;
  delayMs?: number;
  className?: string;
}

const LOGIN_MESSAGES = [
  "Cargando tu lavandería...",
  "Todas tus órdenes están seguras...",
  "Sincronizando caja y turnos...",
  "Preparando tu punto de venta...",
  "💡 Consejo: Usa los atajos de teclado para mayor agilidad",
  "💡 Consejo: Klynn guarda tus datos en tiempo real",
  "💡 Consejo: Consulta tus reportes en cualquier momento",
];

const LOGOUT_MESSAGES = [
  "Cerrando sesión de forma segura...",
  "Guardando datos locales...",
  "¡Hasta pronto!",
];

/** Indeterminate loading state with Klynn brand animation. Mount while loading, unmount when ready. */
export function GlobalPageLoader({
  mode = "default",
  text,
  showText = false,
  minHeight,
  compact = false,
  delayMs = 200,
  className = "",
}: GlobalPageLoaderProps) {
  const wait = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 200;
  const [visible, setVisible] = useState(wait === 0);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (wait === 0) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const timer = window.setTimeout(() => setVisible(true), wait);
    return () => window.clearTimeout(timer);
  }, [wait]);

  const isLogin = mode === "login";
  const isLogout = mode === "logout";
  const messages = isLogin ? LOGIN_MESSAGES : isLogout ? LOGOUT_MESSAGES : [];
  const shouldShowText = isLogin || isLogout || showText;

  useEffect(() => {
    if (!shouldShowText || messages.length <= 1) return;
    const interval = window.setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2600);
    return () => window.clearInterval(interval);
  }, [shouldShowText, messages.length]);

  const currentMessage = text || (messages.length > 0 ? messages[msgIndex % messages.length] : "");

  // Support both Tailwind classes (e.g. "min-h-screen", "min-h-[75vh]") and raw CSS lengths ("60vh", "320px")
  const isTailwindClass = Boolean(
    minHeight && /^(min-h|h-|max-h|flex-|w-|p-)/.test(minHeight.trim())
  );

  const defaultClasses = compact
    ? "klynn-loader--compact py-3"
    : "flex-1 w-full my-auto min-h-[60vh]";

  const containerClasses = [
    "klynn-loader",
    compact ? "klynn-loader--compact" : "",
    isTailwindClass ? minHeight : defaultClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const containerStyle: CSSProperties = {
    ...(!isTailwindClass && minHeight
      ? { minHeight }
      : !isTailwindClass && compact
      ? { minHeight: "96px" }
      : {}),
  };

  return (
    <div
      className={containerClasses}
      style={containerStyle}
      aria-busy="true"
    >
      {visible && (
        <div className="klynn-loader__content" role="status" aria-live="polite" aria-atomic="true">
          <div className="klynn-loader__art" aria-hidden="true">
            <svg
              className="klynn-loader__mark"
              viewBox="28 20 112 108"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                className="klynn-loader__cloud"
                d="M64 95h-3C49 95 40 85 40 73c0-12 9-22 22-23 2-11 10-19 22-19s21 8 23 19c12 1 22 10 22 23s-10 22-22 22h-4"
              />
              <g className="klynn-loader__hanger">
                <path d="M78 57a6 6 0 1 1 10 4c-3 2-4 3-4 7v1M56 84l28-15 28 15" />
              </g>
              <g className="klynn-loader__ticket">
                <path
                  className="klynn-loader__paper"
                  d="M71 88h26v29l-4.3-3.5-4.4 3.5-4.3-3.5-4.3 3.5-4.4-3.5-4.3 3.5z"
                />
                <path className="klynn-loader__line klynn-loader__line--one" d="M77 95h14" />
                <path className="klynn-loader__line klynn-loader__line--two" d="M77 101h14" />
                <path className="klynn-loader__line klynn-loader__line--three" d="M77 107h14" />
              </g>
            </svg>
          </div>
          <div className="klynn-loader__copy">
            <div className="klynn-loader__track" aria-hidden="true">
              <span />
            </div>

            {/* Screen reader text always accessible */}
            <span className="klynn-loader__sr-only">
              {currentMessage || "Cargando..."}
            </span>

            {/* Solo se muestra texto visible en login, logout o si se fuerza explícitamente */}
            {shouldShowText && currentMessage && (
              <div className="klynn-loader__message-box">
                <p key={currentMessage} className="klynn-loader__message">
                  {currentMessage}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobalPageLoader;
