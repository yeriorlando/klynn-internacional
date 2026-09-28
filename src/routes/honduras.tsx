import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/honduras")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-honduras",
    });
  },
});
