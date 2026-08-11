import { createFileRoute } from "@tanstack/react-router";
import { ProcesosPage } from "@/components/klynn/ProcesosPage";

export const Route = createFileRoute("/t/$slug/procesos")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view as string | undefined,
    area: search.area as string | undefined,
    filter: search.filter as string | undefined,
  }),
  component: ProcesosPage,
});
