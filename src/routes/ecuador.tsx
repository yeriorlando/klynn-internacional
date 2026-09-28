import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ecuador")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-ecuador",
    });
  },
});
