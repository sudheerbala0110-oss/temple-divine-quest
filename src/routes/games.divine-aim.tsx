import { createFileRoute } from "@tanstack/react-router";

import { DivineAimGame } from "@/components/divine-aim/divine-aim-game";

export const Route = createFileRoute("/games/divine-aim")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Divine Aim | Ganesha: The Divine Quest" },
      { name: "description", content: "Play Divine Aim: drag to aim, release glowing energy orbs and light up sacred targets across three rounds." },
      { property: "og:title", content: "Divine Aim | Ganesha: The Divine Quest" },
      { property: "og:description", content: "Drag to aim, release glowing energy orbs and light up sacred targets across three rounds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DivineAimGame,
});
