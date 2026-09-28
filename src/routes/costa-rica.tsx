import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/costa-rica")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-costa-rica",
    });
  },
});
