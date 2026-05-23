import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { SIDEBAR_TOUR } from "./tour-steps";
import { useRouterState } from "@tanstack/react-router";
import confetti from "canvas-confetti";

export function TourManager({ userId }: { userId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    // Solo mostrar el tour si estamos en una página del tenant y no es admin
    if (userId === '__loading__' || userId === 'admin') return;

    // Pequeño delay para asegurar que el DOM esté listo
    const timer = setTimeout(() => {
      handleTour();
    }, 1500); // Aumentamos un poco el delay

    return () => clearTimeout(timer);
  }, [pathname, userId]);

  const fireConfetti = () => {
    // ... (rest of fireConfetti is unchanged, keeping it for context)
    const duration = 1.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { 
      startVelocity: 15,
      spread: 360, 
      ticks: 150,
      zIndex: 99999,
      gravity: 0.8,
      scalar: 0.9
    };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 20 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 400);
  };

  const handleTour = () => {
    const isNewRegistration = localStorage.getItem("klynn_tour_is_new_registration") === "true";
    if (!isNewRegistration) return; // Only show to newly registered users!

    const tourKey = `klynn_tour_sidebar_${userId}`;
    const sidebarDone = localStorage.getItem(tourKey);

    if (sidebarDone) return;

    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Volver',
      doneBtnText: '¡Listo, empezar!',
      allowClose: true,
      overlayColor: 'rgba(15, 23, 42, 0.85)',
      stagePadding: 8,
      popoverClass: 'klynn-tour-popover',
      onHighlightStarted: (element) => {
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      },
      onDestroyed: () => {
        // Marcar como completado SOLO cuando se cierra o termina
        localStorage.setItem(tourKey, "true");
        localStorage.removeItem("klynn_tour_is_new_registration");
        fireConfetti();
      }
    });

    // Inyectar estilos (mismo código)
    if (!document.getElementById('klynn-tour-styles')) {
      const style = document.createElement('style');
      style.id = 'klynn-tour-styles';
      style.innerHTML = `
        .driver-active-element {
          border: 3px solid #1e40af !important;
          box-shadow: 0 0 15px rgba(30, 64, 175, 0.4) !important;
          border-radius: 12px !important;
          transition: all 0.3s ease !important;
        }
        .klynn-tour-popover {
          background: #ffffff !important;
          border-radius: 16px !important;
          padding: 16px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid #e2e8f0 !important;
          max-width: 320px !important;
        }
        .driver-popover.driverjs-theme-center {
          max-width: 450px !important;
          padding: 32px !important;
          text-align: center !important;
          border: 2px solid #1e40af !important;
          box-shadow: 0 20px 50px rgba(30, 64, 175, 0.2) !important;
        }
        .driver-popover.driverjs-theme-center .driver-popover-title {
          font-size: 22px !important;
          justify-content: center !important;
        }
        .driver-popover.driverjs-theme-center .driver-popover-description {
          font-size: 16px !important;
        }
        .driver-popover-title {
          font-family: 'Outfit', sans-serif !important;
          font-size: 16px !important;
          font-weight: 800 !important;
          color: #0f172a !important;
          margin-bottom: 6px !important;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .driver-popover-description {
          font-size: 13.5px !important;
          line-height: 1.5 !important;
          color: #475569 !important;
          font-weight: 400 !important;
        }
        .driver-popover-navigation-btns {
          margin-top: 18px !important;
          display: flex !important;
          gap: 8px !important;
          justify-content: flex-end !important;
        }
        .driver-popover-next-btn {
          background: #1e40af !important; 
          color: #ffffff !important;
          border-radius: 10px !important;
          font-weight: 700 !important;
          padding: 7px 14px !important;
          border: none !important;
          font-size: 12.5px !important;
        }
        .driver-popover-next-btn:hover {
          background: #1d4ed8 !important;
          transform: translateY(-1px) !important;
        }
        .driver-popover-prev-btn {
          background: #f8fafc !important;
          color: #64748b !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 10px !important;
          padding: 7px 14px !important;
          font-weight: 600 !important;
          font-size: 12.5px !important;
        }
        .driver-popover-progress-text {
          color: #94a3b8 !important;
          font-size: 11px !important;
        }
        .driver-popover-arrow {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    const filteredSteps = SIDEBAR_TOUR.steps.filter(step => {
      if (!step.element) return true;
      const el = document.querySelector(step.element as string);
      return el !== null;
    });

    if (filteredSteps.length > 1) { // Solo si hay más pasos que el de bienvenida
      driverObj.setSteps(filteredSteps);
      driverObj.drive();
    }
  };

  return null;
}

export function resetTours(userId: string) {
  localStorage.removeItem(`klynn_tour_sidebar_${userId}`);
  window.location.reload();
}
