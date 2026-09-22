import { createFileRoute } from "@tanstack/react-router";

import { TempleRunGame } from "@/components/temple-run/temple-run-game";

export const Route = createFileRoute("/games/temple-run")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ganesha Temple Run | Ganesha: The Divine Quest" },
      { name: "description", content: "Play Ganesha Temple Run: dodge temple traps and collect Modaks, Wisdom Stars and Coins." },
      { property: "og:title", content: "Ganesha Temple Run | Ganesha: The Divine Quest" },
      { property: "og:description", content: "Play Ganesha Temple Run: dodge temple traps and collect Modaks, Wisdom Stars and Coins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TempleRunGame,
});
