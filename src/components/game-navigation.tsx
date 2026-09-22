import { Link } from "@tanstack/react-router";
import { Gamepad2, Home, LockKeyhole, Medal, Trophy, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const lockedItems = [
  { label: "Leaderboard", icon: Trophy },
  { label: "Achievements", icon: Medal },
];

export function GameNavigation({ active = "profile" }: { active?: "home" | "games" | "profile" }) {
  return (
    <TooltipProvider delayDuration={150}>
      <nav className="game-navigation" aria-label="Game navigation">
        <Button asChild variant="ghost" size="sm" className={`game-nav-item ${active === "home" ? "game-nav-active" : ""}`}>
          <Link to="/"><Home aria-hidden="true" /> <span>Home</span></Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className={`game-nav-item ${active === "games" ? "game-nav-active" : ""}`}>
          <Link to="/games"><Gamepad2 aria-hidden="true" /> <span>Games</span></Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className={`game-nav-item ${active === "profile" ? "game-nav-active" : ""}`}>
          <Link to="/profile"><UserRound aria-hidden="true" /> <span>Profile</span></Link>
        </Button>
        {lockedItems.map(({ label, icon: Icon }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <span><Button variant="ghost" size="sm" className="game-nav-item" disabled><Icon aria-hidden="true" /><span>{label}</span><LockKeyhole className="game-nav-lock" /></Button></span>
            </TooltipTrigger>
            <TooltipContent>{label} unlocks in a future chapter</TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </TooltipProvider>
  );
}
