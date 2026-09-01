import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan las credenciales de Supabase en el archivo .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    timeout: 10000,
  },
});

let refreshingPromise: Promise<boolean> | null = null;

/**
 * Garantiza de forma proactiva y transparente que la sesión de Supabase esté activa y fresca.
 * Si el token expira en menos de 5 minutos o ya expiró, lo renueva silenciosamente antes de
 * que se ejecuten transacciones críticas (creación de órdenes, timbrado DGII, etc.).
 */
export async function ensureFreshSupabaseSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!navigator.onLine) return false;

  try {
    if (refreshingPromise) {
      return await refreshingPromise;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Si no hay sesión en memoria, o expira en menos de 5 minutos, o ya expiró
    if (!session || expiresAt - now < fiveMinutes) {
      refreshingPromise = (async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            console.warn("[Supabase Auth] Auto-refresh session error:", error?.message);
            return false;
          }
          return !!data.session;
        } catch (err) {
          console.warn("[Supabase Auth] Auto-refresh session warning:", err);
          return false;
        } finally {
          refreshingPromise = null;
        }
      })();

      return await refreshingPromise;
    }

    return true;
  } catch (err) {
    console.warn("[Supabase Auth] ensureFreshSupabaseSession error:", err);
    return false;
  }
}

// Configurar auto-refresco en eventos clave de la ventana (retorno de pestaña, reconexión)
if (typeof window !== "undefined") {
  // Al volver a la pestaña tras estar inactivo
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void ensureFreshSupabaseSession();
    }
  });

  // Al reconectarse a internet
  window.addEventListener("online", () => {
    void ensureFreshSupabaseSession();
  });

  // Intervalo de seguridad cada 10 minutos
  setInterval(() => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      void ensureFreshSupabaseSession();
    }
  }, 10 * 60 * 1000);
}
