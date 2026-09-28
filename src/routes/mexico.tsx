import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mexico")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-mexico",
    });
  },
});
