import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/colombia")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-colombia",
    });
  },
});
