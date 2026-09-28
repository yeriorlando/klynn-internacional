import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/espana")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-espana",
    });
  },
});
