# Interface.md

## Screen Layout Overview
- The game is composed of **tap-navigated screens**: the Main Control Screen plus one Dragon Detail Screen per owned dragon or unhatched egg. There is **no swipe/GESTURE navigation** (unreliable on the real device).
- Main hub navigation uses the bottom roster-strip thumbnails; detail screens return via **Home**.
- Each screen may contain **icons** that open **modals** (panels over a semi-transparent dark overlay).
- All modals appear on top of the current screen with **no animation** and contain a **close (X)** button (top-right) to dismiss them, **except Fight modals while turns are auto-resolving, which are locked until the outcome is shown**.

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
- **Center** – large dragon illustration (style similar to the Koala game); unhatched eggs show an **egg illustration + "Hatching..."** (no timer, no stats beyond breed).
- **Above the image** – tags showing:
  - **Breed** (type name, one of 15 — revealed at spin time)
  - **Level** (display-only tier derived from Strength via config thresholds)
  - **Age**
  - **Energy** (visual bar / number)
  - **Strength** (number)
- **Bottom row** three icons (equally spaced, spanning the width; **hatched dragons only** — hidden on egg screens):
  - **Train** (left) – opens Train modal. Disabled at 0 energy.
  - **Sell** (center) – opens Sell modal.
  - **Monster** (right) – opens Monster Selection modal. Disabled at 0 energy (dragon must recover first).
- **Home** icon (bottom row) returns to the Main Control Screen.

---

### 3. Modals (common attributes)
- **Overlay** – semi-transparent dark overlay dimming the underlying screen, no entrance animation.
- **Close (X) button** – top-right corner of the modal content; tapping dismisses the modal, except while fight turns auto-resolve.

#### 3.1 Egg-Spin Purchase Modal
- **Title** – "Get a New Egg".
- **Animation** – a spinning wheel/calendar symbol that cycles through symbols (e.g., `167468123?!-+`). One symbol changes per frame; the player taps anywhere on the modal to stop the animation.
- **Result display** – the frozen combination randomly maps to one of the 15 possible dragon types (breed).
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
- **Selection** – tapping a Fight button opens the Fight Modal (see below). Requires the dragon's energy > 0.

#### 3.5 Fight Modal (Monster or Bewilder Beast)
- **Header** – shows the opponent image (monster or Bewilder Beast) with its HP bar and the participating dragon(s).
- **Turn area** – auto-resolves and logs each turn: "Dragon [name] attacks – damage X" plus retaliation on the dragon's Energy (beast) / energy drain by damage (monsters). **Locked (no X) until the outcome is shown.**
- **Formula:**
  - `damage = (dragonStrength + random(0–10)) – monsterConstantStrength` (constants per opponent, config-defined; beast counter-damage on Energy likewise config-defined).
- **Outcome (monster fight):**
  - **Win** – coins reward (random, based on difficulty) **plus permanent strength gain** (Easy +1–2, Medium +2–3, Hard +3–5). Dragon energy reduced by damage taken (no full restore).
  - **Lose** – strength unchanged; dragon's energy reduced by damage taken (0 only if depleted); modal note "Dragon is tired, will recover automatically". Train/Monster/Beast blocked until energy recovers.

#### 3.6 Bewilder Beast Modal (from Main Control)
- **Intro** – illustration of the Bewilder Beast + **Fight** button. Uses the full roster except 0-energy dragons (excluded) and eggs (never participate).
- **Turn log** – each dragon attacks in roster order; modal logs "Dragon [name] deals X damage to Bewilder Beast" and retaliation; beast HP bar shrinks; dragon Energy bars shrink.
- **Dragon out** – a dragon reduced to 0 energy mid-battle is **removed from the roster**; the next dragon enters.
- **End conditions:**
  - **Beast defeated** – "Bewilder Beast vanishes for a day. Continue adventure." Survivors keep remaining energy and each gains permanent +3–5 strength; removed dragons stay removed. Beast respawns after a day.
  - **All dragons removed** – "Defeat — roster empty. Buy a new egg. Return to Main Screen." Player buys a new egg, waiting/collecting hourly coins if broke (no game-over).

#### 3.7 Coin-Earning Summary Modal (hourly, tap-to-collect)
- Triggered only by tapping the **Earn Coins** icon (visible only when collectible coins exist).
- Shows "+X coins added (hourly generation)". Button "Yo hoo" (or similar) credits the coins and closes the modal.

---

### 4. Workflow Examples

#### A. Purchasing an Egg (from scratch)
1. Player lands on **Main Control Screen** with starting coins for one egg.
2. Taps **Buy Egg** (top-left). **Egg-Spin Purchase Modal** appears (or "Not enough coins" if broke).
3. Symbol wheel spins; player taps to stop and reveal the breed.
4. Player taps **"Yo hoo"** → coins deducted, egg added with hidden 1–2 day hatch timer.
5. Egg gets its own detail screen (egg image + "Hatching...", no actions). Once hatched, the dragon appears with Train/Sell/Monster actions.

#### B. Fighting a Monster
1. Player selects a hatched dragon (energy > 0) on the **Dragon Detail Screen** and taps **Monster** (bottom-right).
2. **Monster Selection Modal** shows only currently spawned monsters (0–3 rows) each with a Fight button, or the empty state.
3. Player taps a Fight button; **Fight Modal** opens (locked) with dragon and monster images/HP.
4. Turns resolve automatically using the damage formula; energy drains by damage taken; outcome is displayed.
5. **Win** → coins plus strength gain (Easy +1–2, Medium +2–3, Hard +3–5), energy reduced by damage taken (no auto-restore).
   **Lose** → strength unchanged, energy reduced by damage taken. Player waits for passive recovery (Train/Monster/Beast blocked at 0).

#### C. Bewilder Beast Battle
1. From **Main Control Screen**, taps **Bewilder Beast** (top-right). Intro modal appears.
2. Taps **Fight** – turn-based sequence starts with all energy-positive dragons in roster order (locked modal).
3. Each dragon deals damage; beast retaliates on Energy; modal logs damage and both HP/Energy bars.
4. Dragons at 0 are removed; next enters.
5. If the beast's HP reaches 0 → "Bewilder Beast vanishes for a day. Continue." Survivors gain +3–5 strength each (respawns after a day).
6. If all dragons are removed → "Defeat — roster empty. Buy a new egg." Player returns to Main, collects hourly coins if needed, and buys a new egg.

---
*All icons, buttons, and text positions are fixed as described to ensure a predictable, ambiguity-free UI experience.*
