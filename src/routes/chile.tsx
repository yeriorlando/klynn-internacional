import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/chile")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-chile",
    });
  },
});
