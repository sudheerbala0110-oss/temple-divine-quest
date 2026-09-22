import { createFileRoute } from "@tanstack/react-router";

import { GaneshRhythmGame } from "@/components/ganesh-rhythm/ganesh-rhythm-game";

export const Route = createFileRoute("/games/ganesh-rhythm")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ganesh Rhythm | Ganesha: The Divine Quest" },
      { name: "description", content: "Play Ganesh Rhythm: strike four glowing temple bells in time across three original rhythm rounds." },
      { property: "og:title", content: "Ganesh Rhythm | Ganesha: The Divine Quest" },
      { property: "og:description", content: "Strike four glowing temple bells in time across three original rhythm rounds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GaneshRhythmGame,
});
