# Interface.md

## Multi-device layout (Bip 6 rect + round watches)

- The UI has **no per-device forks**. Every coordinate/size lives in
  `page/layouts.js` as one table per device profile: `bip6` (Amazfit Bip 6,
  rect 390x450) and `round480` (perfectly-round 480x480 class: Active /
  Balance / T-Rex round series; 466/454/416 rounds reuse it with extra
  margin).
- At startup `Page.build()` calls `refreshLayout(deviceAdapter.getInfo())`,
  which reads `@zos/device` `getDeviceInfo()` (resolution + shape, with a
  `deviceSource` fast-path for confirmed models) and assigns the matching
  table onto live bindings. `page/index.js` uses those names as plain
  constants; colors/fonts/assets stay device-independent in
  `page/index.style.js`.
- Round-screen rule: sizes never shrink (Zepp OS `IMG` draws 1:1 — a smaller
  box would crop the art), only positions move inside the safe circle, and
  the modal panel is centered (320x340) so its bottom edge matches Bip 6.
- The web preview (`npm run dev --prefix web`) has a Device selector in the
  debug panel to render either layout.

## Screen Layout Overview
- The game is composed of **tap-navigated screens**: the Main Control Screen plus one Dragon Detail Screen per owned dragon or unhatched egg. There is **no swipe/GESTURE navigation** (unreliable on the real device).
- Main hub navigation uses the bottom roster-strip thumbnails; detail screens return via **Home**.
- Each screen may contain **icons** that open **modals** (panels over a semi-transparent dark overlay).
- All modals appear on top of the current screen with **no animation** and contain a **close (X)** button (top-right) to dismiss them. Fights are **not** modals — they use the dedicated full-screen Fight Screen (§3.5).

---

### 1. Main Control Screen
- **Positioning of icons** (fixed, relative to the screen edges):
  - **Buy Egg** – top-left corner. Tapping opens the Egg-Spin Purchase Modal. **Disabled/dimmed when coins are insufficient** (modal shows "Not enough coins", no spin starts).
  - **Bewilder Beast** – top-right corner. Always visible; tapping opens the boss intro modal.
  - **Earn Coins** – bottom-left. Tap-to-collect hourly generation; **shown only when collectible coins are available**. Tapping opens the Coin-Earning Summary Modal and credits the coins.
- **Background** – static scene image and text: "Dragons: N" (how many hatched dragons the user has; eggs may be counted separately or excluded per config — default: dragons only).
- **Behavior** – tapping a roster-strip thumbnail jumps to that Dragon Detail screen; Buy Egg / Beast icons open their modals.

---

### 2. Dragon Detail Screen
- **Center** – large dragon illustration (style similar to the Koala game); unhatched eggs show an **egg illustration + "Hatching..."** (no timer, no stats beyond breed), or **"Ready to hatch!" + a green Hatch button** once the hidden timer is due (manual tap, never automatic).
- **Above the image** – tags showing:
  - **Breed + age** in the name line, e.g. "Wooly Howl (2 days)" / "(1 day)"
  - **Energy** (segmented bar)
  - **Strength** as stars centered below the energy bar (5 strength = 1 silver,
    5 silver = 1 gold, max 125 base = 5 gold, 151 combat with full gear).
    Stars show **combat strength** (base + owned equipment). No "Lv N · Age Nd" line.
- **Bottom row** three icons (equally spaced, spanning the width; **hatched dragons only** — hidden on egg screens):
  - **Train** (left) – opens Train modal. Disabled at 0 energy.
  - **Sell** (center) – opens Sell modal.
  - **Monster** (right) – opens Monster Selection modal. Disabled at 0 energy (dragon must recover first).
- **Home** icon (bottom row) returns to the Main Control Screen.
- **"?" button** (small, right of the energy bar; **hatched dragons only**) – opens the Battle Record modal for this dragon.
- **Equipment button** (small icon, left of the energy bar, mirroring "?"; **hatched dragons only**) – opens this dragon's Equipment page: 7 slots (Head / Wings / Tail / one guard per leg), each showing its name and price (owned slots show the piece icon and "+bonus"). Tapping an empty slot opens the Equipment Buy modal with the piece icon, bonus, price, and wallet balance; tapping Buy deducts the price and marks the slot owned (one piece per slot, no second purchase). Back returns to the dragon page, Home to the Main Control Screen.

---

### 3. Modals (common attributes)
- **Overlay** – semi-transparent dark overlay dimming the underlying screen, no entrance animation.
- **Close (X) button** – top-right corner of the modal content; tapping dismisses the modal.

#### 3.1 Egg-Spin Purchase Modal
- **Title** – "Get a New Egg".
- **Animation** – a spinning wheel/calendar symbol that cycles through symbols (e.g., `167468123?!-+`). One symbol changes per frame; the player taps anywhere on the modal to stop the animation.
- **Result display** – the frozen combination randomly maps to one of the 16 possible dragon types (breed).
- **Button** – "Yo hoo" (or similar). **Spin-then-pay**: tapping it deducts the egg price and adds the egg to the player's collection with a 1–2 day real-time hatch timer encoded (not displayed).
- **Insufficient funds** – if balance < egg price, no spin starts; the modal shows "Not enough coins" and the confirm button is disabled.
- **First purchase** – no auto-modal on launch; the player starts with coins for one egg and must tap Buy Egg manually.

#### 3.2 Train Modal
- **Title** – "Train [Dragon Name]".
- **Cost display** – "Cost: X coins" (scales with dragon's current strength, per config) plus "-15 energy per session".
- **Start button** – "Start". Requires energy > 0 and sufficient coins. Tapping deducts the coins, drains 15 energy, and increases the dragon's strength by a random value within the configured range.
- **Result modal** – "Strength +Y (new total)" plus "-15 energy". Level display updates if a threshold is crossed.

#### 3.3 Sell Modal
- **Title** – "Sell [Dragon Name]".
- **Price display** – "Will receive: X coins" (based on dragon's age, strength, energy, and breed).
- **Confirm button** – "Sell". Confirmation removes the dragon from the roster and adds the displayed coins to the player's balance.

#### 3.4 Monster Selection Modal
- **Title** – "Battle Monster".
- **Monster rows** – **only spawned monsters are listed (0–3 rows)**:
  - **Easy** – frequent spawns.
  - **Medium** – rare spawns.
  - **Hard** – rarest spawns.
- Each row contains a monster image and a "Fight" button.
- **Empty state** – if nothing spawned: "No monsters right now".
- **Selection** – tapping a Fight button opens the Fight Screen (see §3.5). Requires the dragon's energy > 0.

#### 3.5 Fight Screen (Monster or Bewilder Beast)
- **Not a modal** – a dedicated full-screen replay that replaces the whole screen (no nav, no X) until the player taps **Continue** after the last turn.
- **Layout** – player dragons on the left (1 column up to 3 dragons, 2 columns beyond; up to 12 roster dragons fit, rows overlap slightly at the extreme), the enemy alone on the right. A **green HP bar** sits above every unit.
- **Animation** – per turn: the attacker highlights, a fireball flies attacker → target, then an impact burst (hit) or **MISS** text (miss) shows and the target's HP bar steps to its post-turn HP. One turn ≈ 1.1s. One narration line per turn at the bottom ("Gronkle hits monster 1 for 23" / "Gronkle misses monster 1").
- **Resolution** – the engine resolves the whole fight instantly and persists it (anti-cheat — leaving mid-fight keeps the result); the screen only replays the returned turns. Tapping anywhere skips to the outcome; **Continue** appears only after the last turn. Monster fights return to that dragon's page; beast fights return to Main.
- **Formula** – every attack rolls hit/miss first (80% on even combat, ±0.4% per combat edge, clamped 55–95%); a landed hit deals `attackerCombat − floor(defenderCombat / 2) + random(0–8)`, floored at 3. At most 2 consecutive misses per combatant (pity rule — fights always terminate, no endless whiffing).
- **Outcome (monster fight):**
  - **Win** – coins reward (random, based on difficulty) **plus permanent strength gain** (Easy +1–2, Medium +1–2, Hard +2–4). The dragon keeps its leftover HP as energy. The win is recorded on the dragon's battle record (see 3.8): +1 in the matching difficulty bucket and the coins added to its lifetime earnings.
  - **Lose** – strength unchanged; energy drops to 0 (knocked out). Train/Monster/Beast blocked until energy recovers.

#### 3.6 Bewilder Beast Modal (from Main Control)
- **Intro** – illustration of the Bewilder Beast + **Fight** button. Uses the full roster except 0-energy dragons (excluded) and eggs (never participate).
- **Fight** – the Fight Screen (§3.5) replays round-based turns: every living dragon attacks in roster order, then the beast fires back at **one random living dragon**. A dragon reduced to 0 HP mid-battle **vanishes from the screen** (removed from the roster).
- **End conditions:**
  - **Beast defeated** – "Bewilder Beast vanishes for a day. Continue adventure." Survivors keep remaining energy and each dragon that attacked gains permanent +2–4 strength; removed dragons stay removed. Beast respawns after a day. The dragon that landed the killing blow gets +1 beast win and the reward coins on its battle record (see 3.8); other participants get no beast credit.
  - **All dragons removed** – "Defeat — roster lost. Buy a new egg." Player buys a new egg, waiting/collecting hourly coins if broke (no game-over). The beast **heals back to full HP** — a loss buys no progress.

#### 3.7 Coin-Earning Summary Modal (hybrid time + steps, tap-to-collect)
- Triggered only by tapping the **Earn Coins** icon (visible only when collectible coins exist).
- Shows "+X coins added (hourly generation + walking bonus)". Button "Yo hoo" (or similar) credits the coins and closes the modal.

#### 3.8 Battle Record Modal
- **Trigger** – the small **"?"** button on a hatched dragon's detail screen (right of the energy bar).
- **Title** – "[Dragon Name] Record".
- **Rows** – lifetime stats for this dragon (wins only; losses are not tracked):
  - Easy wins / Medium wins / Hard wins – monsters defeated per difficulty.
  - Beast wins – Bewilder Beasts this dragon finished with the killing blow.
  - Coins earned – total coins this dragon's victories paid into the wallet.
- Saves written before this feature get zeroed records on load (old wins are not backfilled).

---

### 4. Workflow Examples

#### A. Purchasing an Egg (from scratch)
1. Player lands on **Main Control Screen** with starting coins for one egg.
2. Taps **Buy Egg** (top-left). **Egg-Spin Purchase Modal** appears (or "Not enough coins" if broke).
3. Symbol wheel spins; player taps to stop and reveal the breed.
4. Player taps **"Yo hoo"** → coins deducted, egg added with hidden 1–2 day hatch timer.
5. Egg gets its own detail screen (egg image + "Hatching...", Sell + Home only). Once due it shows "Ready to hatch!" + a green **Hatch** button; tapping it hatches the dragon, which then appears with Train/Sell/Monster actions.

#### B. Fighting a Monster
1. Player selects a hatched dragon (energy > 0) on the **Dragon Detail Screen** and taps **Monster** (bottom-right).
2. **Monster Selection Modal** shows only currently spawned monsters (0–3 rows) each with a Fight button, or the empty state.
3. Player taps a Fight button; the **Fight Screen** opens (dragons left, monster right, green HP bars, fireballs, hit/miss).
4. Turns replay automatically (~1.1s each; tap anywhere to skip); HP bars step per turn; outcome is displayed.
5. **Win** → coins plus strength gain (Easy +1–2, Medium +1–2, Hard +2–4), dragon keeps leftover HP as energy.
   **Lose** → strength unchanged, energy drops to 0 (knocked out). Player waits for passive recovery (Train/Monster/Beast blocked at 0).

#### C. Bewilder Beast Battle
1. From **Main Control Screen**, taps **Bewilder Beast** (top-right). Intro modal appears.
2. Taps **Fight** – the **Fight Screen** replays round-based turns: all living dragons attack, then the beast fires back at one random dragon.
3. Each attack shows a fireball + hit burst / MISS; HP bars step per turn; a dragon at 0 vanishes (removed from the roster).
4. If the beast's HP reaches 0 → "Bewilder Beast vanishes for a day. Continue." Each dragon that attacked and survived gains +2–4 strength (respawns after a day).
5. If all dragons are removed → "Defeat — roster lost. Buy a new egg." The beast heals to full HP. Player returns to Main, collects hourly coins if needed, and buys a new egg.

---
*All icons, buttons, and text positions are fixed as described to ensure a predictable, ambiguity-free UI experience.*
