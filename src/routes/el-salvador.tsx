import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/el-salvador")({
  beforeLoad: () => {
    throw redirect({
      to: "/software-lavanderia-el-salvador",
    });
  },
});
