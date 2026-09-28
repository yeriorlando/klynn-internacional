import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/peru")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-peru",
    });
  },
});
