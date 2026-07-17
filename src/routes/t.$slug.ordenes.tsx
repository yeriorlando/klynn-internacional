import { createFileRoute } from "@tanstack/react-router";
import { OrdenesPage } from "@/components/klynn/OrdenesPage";

export const Route = createFileRoute("/t/$slug/ordenes")({
  component: OrdenesPage,
});
