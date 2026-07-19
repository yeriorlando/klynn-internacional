import { createFileRoute } from "@tanstack/react-router";
import { OrdenesPage } from "@/components/klynn/OrdenesPage";

export const Route = createFileRoute("/t/$slug/ordenes")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view as string | undefined,
  }),
  component: OrdenesPage,
});
