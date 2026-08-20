import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "../router";

import appCss from "../styles.css?url";

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
        type: "image/webp",
        href: "/favicon.webp",
      },
      {
        rel: "apple-touch-icon",
        href: "/logo.png",
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
        {/* Google Analytics */}
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
        {/* Service Worker Registration for PWA and Offline Support */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    reg.update();
                    console.log('[Klynn PWA] Service Worker activo y actualizado');
                  }).catch(function(err) {
                    console.warn('[Klynn PWA] Fallo al registrar Service Worker:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster richColors position="top-center" closeButton />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
