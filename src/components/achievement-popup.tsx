import { Award } from "lucide-react";
import { useEffect, useState } from "react";

import { findAchievement } from "@/lib/achievements";

type Props = { ids: string[] | undefined };

/** Animated queue of achievement-unlock popups. */
export function AchievementPopup({ ids }: Props) {
  const [queue, setQueue] = useState<string[]>([]);

  useEffect(() => {
    if (!ids || ids.length === 0) return;
    setQueue(ids);
  }, [ids]);

  useEffect(() => {
    if (queue.length === 0) return;
    const id = window.setTimeout(() => setQueue((rest) => rest.slice(1)), 3200);
    return () => window.clearTimeout(id);
  }, [queue]);

  const current = queue[0];
  if (!current) return null;
  const achievement = findAchievement(current);
  if (!achievement) return null;

  return (
    <div className="achievement-popup" role="status" aria-live="polite">
      <span className="achievement-popup-icon"><Award aria-hidden="true" /></span>
      <div>
        <p className="achievement-popup-kicker">Achievement unlocked</p>
        <strong>{achievement.title}</strong>
        <p className="achievement-popup-detail">{achievement.detail}</p>
      </div>
    </div>
  );
}
