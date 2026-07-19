"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

const ThemeSwitch = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [checked, setChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setChecked(resolvedTheme === "dark"), [resolvedTheme]);

  const handleCheckedChange = useCallback(
    (isChecked: boolean) => {
      setChecked(isChecked);
      const newTheme = isChecked ? "dark" : "light";

      if (
        typeof document === "undefined" ||
        !document.startViewTransition ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        setTheme(newTheme);
        return;
      }

      document.documentElement.classList.add("no-transitions");
      const transition = document.startViewTransition(() => {
        flushSync(() => {
          setTheme(newTheme);
        });
      });

      transition.ready.then(() => {
        const docWidth = window.innerWidth;
        const docHeight = window.innerHeight;
        const endRadius = Math.hypot(docWidth, docHeight);
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${docWidth / 2}px ${docHeight / 2}px)`,
              `circle(${endRadius}px at ${docWidth / 2}px ${docHeight / 2}px)`,
            ],
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
    },
    [setTheme]
  );

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 cursor-pointer select-none",
        "h-8 w-16",
        className
      )}
      {...props}
    >
      {/* The real shadcn Switch */}
      <Switch
        checked={checked}
        onCheckedChange={handleCheckedChange}
        className={cn(
          "peer absolute inset-0 h-full w-full rounded-full bg-slate-200 dark:bg-slate-800 transition-colors border-none cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "[&>span]:h-6 [&>span]:w-6 [&>span]:rounded-full [&>span]:bg-white dark:[&>span]:bg-slate-950 [&>span]:shadow-md [&>span]:z-10",
          "data-[state=unchecked]:[&>span]:translate-x-1",
          "data-[state=checked]:[&>span]:translate-x-[35px]"
        )}
      />

      {/* Icons overlaid inside the track */}
      <span
        className={cn(
          "pointer-events-none absolute left-2 inset-y-0 z-0 flex items-center justify-center"
        )}
      >
        <SunIcon
          size={14}
          className={cn(
            "transition-all duration-200 ease-out",
            checked ? "text-slate-400 opacity-60" : "text-amber-500 scale-110"
          )}
        />
      </span>

      <span
        className={cn(
          "pointer-events-none absolute right-2 inset-y-0 z-0 flex items-center justify-center"
        )}
      >
        <MoonIcon
          size={14}
          className={cn(
            "transition-all duration-200 ease-out",
            checked ? "text-indigo-400 scale-110" : "text-slate-400 opacity-60"
          )}
        />
      </span>
    </div>
  );
};

export default ThemeSwitch;
