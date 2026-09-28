import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/guatemala")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-guatemala",
    });
  },
});
