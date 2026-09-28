import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/republica-dominicana")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-republica-dominicana",
    });
  },
});
