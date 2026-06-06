"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const ThemeSwitch = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLButtonElement>) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const isDark = resolvedTheme === "dark";
    const newTheme = isDark ? "light" : "dark";

    // If document.startViewTransition is not supported, just setTheme
    if (
      typeof document === "undefined" ||
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setTheme(newTheme);
      return;
    }

    // Capture the exact button center compensating for any page zoom
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom || "1") || 1;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / zoom;
    const y = (rect.top + rect.height / 2) / zoom;

    const docWidth = window.innerWidth / zoom;
    const docHeight = window.innerHeight / zoom;
    const endRadius = Math.hypot(
      Math.max(x, docWidth - x),
      Math.max(y, docHeight - y)
    );

    // Disable CSS transitions during the view transition to prevent lag/half-transitioned captures
    document.documentElement.classList.add("no-transitions");

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
      });
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];
      document.documentElement.animate(
        {
          clipPath: clipPath,
        },
        {
          duration: 500,
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });

    transition.finished.finally(() => {
      document.documentElement.classList.remove("no-transitions");
    });
  };

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-9 w-9 rounded-full border border-border bg-background shadow-sm",
          className
        )}
      />
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring overflow-hidden cursor-pointer",
        className
      )}
      aria-label="Cambiar tema"
      {...(props as any)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {resolvedTheme === "dark" ? (
          <motion.div
            key="moon"
            initial={{ y: 15, opacity: 0, rotate: -20 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -15, opacity: 0, rotate: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex items-center justify-center"
          >
            <MoonIcon className="h-[18px] w-[18px]" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ y: 15, opacity: 0, rotate: 20 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -15, opacity: 0, rotate: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex items-center justify-center"
          >
            <SunIcon className="h-[18px] w-[18px]" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};

export default ThemeSwitch;
