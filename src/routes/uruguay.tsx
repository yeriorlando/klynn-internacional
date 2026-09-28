import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/uruguay")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-uruguay",
    });
  },
});
