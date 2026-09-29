import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://api.klynncloud.com';
const defaultSupabaseAnonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoiYW5vbiJ9.TsHqtNcA63ts-rjsS0VijOHICQ-06AXymSoIaAmqov8';

const supabaseUrl = 
  import.meta.env?.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined) ||
  defaultSupabaseUrl;

const supabaseAnonKey = 
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined) ||
  defaultSupabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
let lastInteractionRefreshCheck = 0;

/**
 * Busca en localStorage cualquier token de refresco persistido por Supabase.
 */
function getStoredSupabaseRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        ((key.startsWith("sb-") && key.endsWith("-auth-token")) ||
          key.includes("supabase.auth.token") ||
          key.includes("klynn_supabase_token"))
      ) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.refresh_token && typeof parsed.refresh_token === "string") {
            return parsed.refresh_token;
          }
          if (parsed?.currentSession?.refresh_token) {
            return parsed.currentSession.refresh_token;
          }
        }
      }
    }
  } catch (e) {
    console.warn("[Supabase Auth] Error al leer refresh_token almacenado:", e);
  }
  return null;
}

export interface FreshSessionResult {
  ok: boolean;
  accessToken?: string;
}

/**
 * Garantiza de forma proactiva, transparente y resiliente que la sesión de Supabase esté activa.
 * - Si el token expira en menos de 10 minutos o ya expiró, lo renueva silenciosamente.
 * - Si la sesión en memoria se perdió (inactividad prolongada), rescata el refresh_token
 *   desde localStorage para resucitar la sesión sin obligar al usuario a cerrar e iniciar sesión.
 * - Proporciona reintentos limpios con mutex para evitar colisiones entre pestañas.
 */
export async function ensureFreshSupabaseSession(force = false): Promise<FreshSessionResult> {
  if (typeof window === "undefined") return { ok: false };
  if (!navigator.onLine) return { ok: false };

  try {
    if (refreshingPromise) {
      const ok = await refreshingPromise;
      const { data } = await supabase.auth.getSession();
      return { ok, accessToken: data?.session?.access_token };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    const needsRefresh = force || !session || !session.access_token || (expiresAt - now < tenMinutes);

    if (needsRefresh) {
      refreshingPromise = (async () => {
        try {
          // 1. Intento estándar de refresco si hay sesión en memoria
          let refreshResult = await supabase.auth.refreshSession().catch(() => ({ data: { session: null }, error: null }));

          // 2. Si falló o no había sesión en memoria, intentar resucitarla con el refresh_token almacenado
          if (!refreshResult.data?.session) {
            const storedRefreshToken = getStoredSupabaseRefreshToken();
            if (storedRefreshToken) {
              refreshResult = await supabase.auth.refreshSession({
                refresh_token: storedRefreshToken,
              }).catch((err) => ({ data: { session: null }, error: err }));
            }
          }

          if (refreshResult.error) {
            console.warn("[Supabase Auth] Auto-refresh aviso:", refreshResult.error?.message || refreshResult.error);
            const fallback = await supabase.auth.getSession();
            return !!fallback.data?.session?.access_token;
          }

          return !!refreshResult.data?.session?.access_token;
        } catch (err) {
          console.warn("[Supabase Auth] Error en ensureFreshSupabaseSession:", err);
          return false;
        } finally {
          refreshingPromise = null;
        }
      })();

      const ok = await refreshingPromise;
      const { data } = await supabase.auth.getSession();
      return { ok, accessToken: data?.session?.access_token };
    }

    return { ok: true, accessToken: session.access_token };
  } catch (err) {
    console.warn("[Supabase Auth] ensureFreshSupabaseSession error general:", err);
    return { ok: false };
  }
}

// Configurar auto-refresco en eventos clave de la ventana (retorno de pestaña, reconexión, actividad)
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

  // Al interactuar con la interfaz (click, tecla), verificar silenciosamente si pasaron > 5 min
  const handleUserActivity = () => {
    const now = Date.now();
    if (now - lastInteractionRefreshCheck > 5 * 60 * 1000) {
      lastInteractionRefreshCheck = now;
      void ensureFreshSupabaseSession();
    }
  };

  window.addEventListener("click", handleUserActivity, { passive: true });
  window.addEventListener("keydown", handleUserActivity, { passive: true });
  window.addEventListener("touchstart", handleUserActivity, { passive: true });

  // Intervalo de seguridad proactivo cada 4 minutos
  setInterval(() => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      void ensureFreshSupabaseSession();
    }
  }, 4 * 60 * 1000);
}
