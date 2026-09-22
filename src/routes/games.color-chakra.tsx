import { createFileRoute } from "@tanstack/react-router";

import { ColorChakraGame } from "@/components/color-chakra/color-chakra-game";

export const Route = createFileRoute("/games/color-chakra")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Color Chakra | Ganesha: The Divine Quest" },
      { name: "description", content: "Play Color Chakra: spin the sacred wheel to match falling colours across three fast rounds." },
      { property: "og:title", content: "Color Chakra | Ganesha: The Divine Quest" },
      { property: "og:description", content: "Spin the sacred wheel to match falling colours across three increasingly fast rounds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ColorChakraGame,
});
