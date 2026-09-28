import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/panama")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-panama",
    });
  },
});
