import { createFileRoute } from "@tanstack/react-router";
import { ClonedApp } from "@/cloned-app-mount";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "E-Serikali Mtaa - Huduma za Serikali za Mtaa Tanzania" },
      {
        name: "description",
        content: "E-Serikali Mtaa - Mfumo wa Huduma za Serikali za Mtaa Tanzania.",
      },
    ],
  }),
  component: ClonedApp,
});
