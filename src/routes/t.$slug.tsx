import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { TenantShell } from "@/components/klynn/TenantShell";
import { ThemeProvider } from "next-themes";

export const Route = createFileRoute("/t/$slug")({
  beforeLoad: ({ params }) => {
    return { slug: params.slug };
  },
  component: TenantLayout,
});

function TenantLayout() {
  const routerState = useRouterState();
  const isLoginPage = routerState.location.pathname.endsWith("/login");

  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem={false}
      forcedTheme={isLoginPage ? "light" : undefined}
    >
      {isLoginPage ? <Outlet /> : <TenantShell />}
    </ThemeProvider>
  );
}
