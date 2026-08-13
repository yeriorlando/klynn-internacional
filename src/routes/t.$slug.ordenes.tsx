import { createFileRoute } from "@tanstack/react-router";
import { OrdenesPage } from "@/components/klynn/OrdenesPage";

export const Route = createFileRoute("/t/$slug/ordenes")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view as string | undefined,
    action: search.action as string | undefined,
    filter: search.filter as string | undefined,
  }),
  component: OrdenesPage,
});
