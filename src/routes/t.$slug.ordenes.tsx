import { createFileRoute } from "@tanstack/react-router";
import { OrdenesPage } from "@/components/klynn/OrdenesPage";

export type OrdenesSearchParams = {
  view?: string;
  action?: string;
  filter?: string;
};

export const Route = createFileRoute("/t/$slug/ordenes")({
  validateSearch: (search: Record<string, unknown>): OrdenesSearchParams => ({
    view: typeof search.view === "string" ? search.view : undefined,
    action: typeof search.action === "string" ? search.action : undefined,
    filter: typeof search.filter === "string" ? search.filter : undefined,
  }),
  component: OrdenesPage,
});
