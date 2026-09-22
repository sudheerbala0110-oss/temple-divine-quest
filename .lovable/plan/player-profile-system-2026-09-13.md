# Player Profile System

## What will be built
- Add a dedicated **Profile** screen using the existing cinematic temple visual style.
- Store and display player name, selected college, level, XP, coins, streak, best score, completed games, and achievements.
- Add an animated XP progress bar and animated stat/achievement cards.
- Add a compact navigation menu for **Home**, **Games**, **Profile**, **Leaderboard**, and **Achievements** on the profile screen. Profile opens the new screen; Home returns to the opening, and future sections remain visibly locked rather than creating extra pages.
- Connect **Enter the Divine Quest** on college selection to the profile screen.
- Keep the existing landing screen and college selection layout/content unchanged.

## Scope guard
- Do not create game, leaderboard, or standalone achievements screens yet.
- Do not create any playable games.

## Technical details
- Extend the existing player profile record with safe defaults for all progression fields and achievements.
- Keep profile access tied to the existing anonymous player key stored on the device.
- Make player name editable and persist changes in Lovable Cloud.
- Add route-specific titles and sharing descriptions for each new screen.
- Verify compilation and the mobile profile/navigation experience.
