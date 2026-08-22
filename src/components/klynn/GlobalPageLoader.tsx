import React, { useEffect, useState } from "react";

interface GlobalPageLoaderProps {
  text?: string;
  minHeight?: string;
  compact?: boolean;
  delayMs?: number; // Umbral de milisegundos antes de mostrar el loader
}

export function GlobalPageLoader({
  text,
  minHeight = "min-h-[75vh] flex-1",
  compact = false,
  delayMs = 200,
}: GlobalPageLoaderProps) {
  const [show, setShow] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) {
      setShow(true);
    } else {
      const showTimer = setTimeout(() => setShow(true), delayMs);
      return () => clearTimeout(showTimer);
    }
  }, [delayMs]);

  if (!show) return null;

  if (compact) {
    return (
      <div className="flex items-center justify-center p-2.5 space-x-2.5 text-[#1B4B73] dark:text-[#38bdf8] animate-in fade-in duration-200">
        <img
          src="/klynn-loader.svg"
          alt="Cargando..."
          className="h-7 w-7 object-contain"
        />
        {text && (
          <span className="text-xs font-black uppercase tracking-wider text-[#1B4B73] dark:text-[#38bdf8]">
            {text}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${minHeight} flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-300 w-full select-none`}
    >
      <div className="relative flex items-center justify-center w-32 sm:w-36 h-auto select-none pointer-events-none drop-shadow-xs">
        <img
          src="/klynn-loader.svg"
          alt="Cargando..."
          className="w-full h-auto max-h-40 sm:max-h-44 object-contain"
        />
      </div>
      {text && (
        <p className="mt-1 text-xs sm:text-[13.5px] font-black uppercase tracking-[0.22em] text-[#1B4B73] dark:text-[#38bdf8] select-none animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

export default GlobalPageLoader;

