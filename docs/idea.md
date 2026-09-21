# Dragon Army – Game Overview

## Core Concept
A Zepp OS / Amazfit Bip 6 game inspired by *How to Train Your Dragon*. The player hatches, raises, and trains a collection of dragons, then uses the strongest members to battle monsters and ultimately the **Bewilder Beast** boss. Core resources are **energy** (recovers passively, drained by training and battles) and **coins** (tap-to-collect each hour). The UI is tap-navigated screens (roster strip + Home, no swipe), mimicking the Koala-game "egg-at-center" flow.

## Starting Resources
- The player begins with a **fixed amount of coins** sufficient to purchase a single random egg.
- There is **no auto-modal on launch**. The player must manually tap **Buy Egg** on the Main Control Screen to start the egg-spin flow.
- One of **15 possible dragons (= 15 breeds)** is randomly selected per egg purchase.

## Random Egg & Hatch Mechanic
- Tapping **Buy Egg** opens the **Egg-Spin Purchase Modal** with a "symbol-spinning" animation (`167468123?!-+`) that changes one symbol at a time.
- Flow is **spin-then-pay**: symbols spin → player taps anywhere on the modal to **freeze** the spinning symbols → the displayed combination determines the **egg type / breed** (randomly assigned from the 15) → player taps **"Yo hoo"** (or similar) to pay the egg price and add the egg to the collection.
- If the balance is below the egg price, **Buy Egg is disabled/dimmed**; tapping it (or opening the modal) shows a **"Not enough coins"** state and no spin starts.
- The egg's hatch time is **random between 1 and 2 days** (real-time), encoded at time of purchase. **No timer is shown.**

## Interface Layout
- The game consists of multiple **screens** switched by **tap-only button navigation** (roster-strip thumbnails on the main hub, Home on detail screens; no swipe).
- Screens: **Main Control Screen**, plus one **Dragon Detail Screen per owned dragon or unhatched egg**.
- Modals (all share the common modal design below):
  1. **Egg-Spin Purchase modal** (= "Shop / egg store")
  2. **Train modal + training result**
  3. **Sell modal + confirmation**
  4. **Monster Selection modal**
  5. **Fight modal** (used for both Monster fights and Bewilder Beast turns)
  6. **Bewilder Beast intro modal**
  7. **Coin-Earning Summary modal** (hourly tap-to-collect)

## Main Control Screen
Central hub with fixed-position icons:

1. **Buy Egg** (top-left) – Opens the Egg-Spin Purchase Modal. Disabled/dimmed when coins are insufficient (modal shows "Not enough coins", no spin).
2. **Bewilder Beast** (top-right) – Always visible. Opens the boss intro modal with the boss image and a **"Fight"** button.
   - Fighting uses: **`damage = (dragonStrength + random(0-10)) - monsterConstantStrength`** (config-defined constants per opponent).
   - The beast has an **HP bar**. Each participating dragon deals one hit in roster order; the **beast hits back**, reducing that dragon's **Energy** (Energy = Health in Beast fights; beast counter-damage amount is config-defined).
   - If a dragon's energy drops to 0 during the Beast battle, that dragon is **out and removed from the roster**; the next dragon enters.
   - If all dragons are removed before the beast falls, the player **loses**; the roster is empty and the player must **buy another egg** (waiting/collecting hourly coins if broke — never game-over).
3. **Earn Coins** (bottom-left) – **Tap-to-collect hourly generation.** The icon is **only displayed when collectible coins are available**; tapping it opens the Coin-Earning Summary modal (`+X coins`) and adds the coins. Nothing is added automatically without tapping.

## Dragon Detail Screen
Appears per dragon (or per unhatched egg). Displays at the top the dragon's **Breed (= type name, one of 15), Level (display-only tier derived from Strength via config thresholds), Age, Energy (bar/number), and Strength**. Center shows the dragon image (similar to koala); unhatched eggs show an **egg image + "Hatching..."** with no timer.

- **Breed** is revealed at spin time and shown as the dragon's name/image on its detail screen.
- **Level** does not drive formulas directly; it is a display tier computed from Strength (config thresholds).
- Bottom row (hatched dragons only): three icons:
  - **Train** icon – Opens a modal showing the **training price** (plus -15 energy) and a **"Start"** button.
    - Paying the price increases the dragon's **strength** by a random value within a range and drains 15 energy; the stronger the dragon, the higher the cost (reasonable progression, config-defined).
    - Blocked when the dragon's energy is 0.
  - **Sell** icon – Opens a modal showing the **sale price**, which depends on the dragon's **age, strength, energy, and breed** (config). Selling can provide coins to buy multiple eggs.
  - **Monster** icon – Opens the Monster Selection Modal.
    - Spawn-based availability: **0–3 monsters** may be present. Easy spawns frequently, Medium rarely, Hard rarest. Missing difficulties are hidden; if nothing spawned the modal shows "No monsters right now".
    - Fighting follows the same strength-+-random vs. monster-strength formula.
    - **Win → receives coins** (amount random, based on monster difficulty) **plus permanent strength gain** (Easy +1–2, Medium +2–3, Hard +3–5). No free egg.
    - **Lose → strength unchanged**; energy drained by damage taken (see Energy & Recovery).
- **Unhatched egg screens have no Train / Sell / Monster actions**; they only display the egg until it hatches into a dragon.

## Energy & Recovery
- Energy **drains after every battle (win or lose), proportional to damage taken** during the fight. There is no full-restore on win and no forced set-to-0 on lose — the bar simply drops by the damage amount (reaching 0 only if damage depletes it).
- Energy **recovers automatically** over time; no manual action and no food mechanic.
- A dragon with **0 energy cannot Train, fight a monster, or join a Beast battle** until it recovers passively.
- Exception: dragons reduced to 0 energy **inside a Bewilder Beast battle are removed** from the roster (not kept to recover).

## Progression & Currency
- **Coins** are earned by **tapping Earn Coins each hour** (small amount, enough to start training the first hatched dragon), plus monster victories and selling dragons.
- Coins are spent on: buying eggs, training dragons.
- Training cost scales with dragon strength (config-defined).
- No "food" resource; energy is the sole depletion/recovery meter.

## Boss & Winning Condition
- **Bewilder Beast** – The final boss. It has HP; dragons attack in roster order with beast retaliation on Energy as described above.
- Defeating the beast: surviving dragons keep their remaining (drained) energy and each gains permanent +3–5 strength; dragons dropped to 0 during the run are removed. The beast **vanishes for a day, then respawns**. There is **no end-win state** — the loop continues with new eggs and dragons.
- Losing to the beast: all participating dragons are removed; the player continues by buying a new egg (waiting for hourly coins if needed).

## Modal Design
- **No entrance animation.** Every modal appears on top of the current screen over a **semi-transparent dark overlay** dimming the underlying screen.
- Every modal contains a **close (X) button** (top-right) **except Fight modals while turns are auto-resolving** — fight-in-progress cannot be closed; X (and outcome buttons) appear only once the outcome is shown.
- Modals: egg-spin purchase ("Yo hoo" confirm) + "Not enough coins" state, training price/Start + training result, sell price + Sell confirmation, monster selection (0–3 rows or empty state) + fight outcome, Bewilder Beast intro + turn log + end states, coin-earning summary ("Yo hoo" to close/collect).

## Rules Summary
1. Start with fixed coins enough for one random egg; no auto-modal — player taps Buy Egg.
2. Spin-then-pay in the egg modal (spin → tap to stop → Yo hoo to pay + add egg); insufficient coins = disabled / "Not enough coins", no spin.
3. Egg hatches in 1–2 days (real-time), no timer shown; egg gets its own detail screen with no actions until hatched.
4. Tap-only navigation between Main screen and one detail screen per dragon/egg (roster strip + Home, no swipe).
5. Dragon screen shows Breed / Level (from Strength) / Age / Energy / Strength; Train, Sell, Monster actions via modals (blocked at 0 energy; eggs have no actions).
6. Training costs coins plus 15 energy, raises strength randomly; cost scales with strength.
7. Selling price depends on age, strength, energy, breed.
8. Monsters spawn by rarity (Easy frequent / Medium rare / Hard rarest, 0–3 shown); win gives coins plus strength gain (+1–2 / +2–3 / +3–5), lose drains energy by damage with strength unchanged.
9. Beast battle is turn-based with retaliation on Energy (Energy = Health); each dragon attacks in order, modal logs each turn; 0-energy dragons are removed; if all fall, player loses and must buy a new egg (wait for hourly coins if broke).
10. Beast vanishes for a day after defeat (survivors gain +3–5 strength each), then respawns; no final win state — the loop continues.
11. Hourly coins are tap-to-collect via the Earn Coins icon (visible only when collectible), enabling first training after first hatch.
