/**
 * Dragon Army — central type definitions.
 *
 * Single place for ALL game types (balance shapes, entities, persistence,
 * runtime state). `config.ts` keeps values + pure formulas and imports the
 * shared shapes from here — it must not redeclare them.
 *
 * Conventions:
 * - All `Player` / `GameState` fields are plain JSON-serializable
 *   (string | number | boolean | null | arrays | plain objects).
 *   No `Date`, `Map`, `Set`, or functions — so a whole `Player` or
 *   `GameState` can be passed through `JSON.stringify` / `JSON.parse`.
 * - Time is always epoch milliseconds (`...Ms` suffix).
 * - Energy lives PER DRAGON (`Dragon.energy`), not as a global pool.
 *   `Player` holds the roster; each entry carries its own energy bar.
 * - `Level` is display-only, derived via `levelForStrength()` — never stored.
 */

// ---------------------------------------------------------------------------
// Moved from config.ts (canonical definitions live here)
// ---------------------------------------------------------------------------

/** Random source returning a float in [0, 1). Injected for pure/testable rolls. */
export type Random01 = () => number;

export type Rarity = "common" | "uncommon" | "rare" | "epic";
export type Difficulty = "Easy" | "Medium" | "Hard";

/** Static breed catalogue entry (see DRAGONS in config.ts). */
export interface DragonBreed {
  id: string;
  name: string;
  rarity: Rarity;
  baseStrengthMin: number;
  baseStrengthMax: number;
  sellMultiplier: number;
  /**
   * Asset basename for `assets/dragons/<assetKey>.png` and
   * `assets/eggs/<assetKey>.png`. Presentation-only; never enters formulas.
   */
  assetKey: string;
  /**
   * Full lifespan in days counted from `hatchedAtMs`.
   * Cheaper/weaker breeds live longer (45d) than strong/epic ones (30d).
   * Death/expiry is computed: `ageDaysForDragon(...) >= lifespanDays`.
   */
  lifespanDays: number;
}

/** Display-only level tier: strength >= minStrength maps to level. */
export interface LevelThreshold {
  level: number;
  minStrength: number;
}

/** Static monster catalogue entry (see MONSTERS in config.ts). */
export interface MonsterDef {
  id: string;
  name: string;
  difficulty: Difficulty;
  strength: number;
  rewardMin: number;
  rewardMax: number;
  spawnChance: number;
  energyLossWinMin: number;
  energyLossWinMax: number;
  energyLossLoseMin: number;
  energyLossLoseMax: number;
  /**
   * Image path relative to `assets/` (e.g. `monsters/gronkle.png`).
   * Presentation-only; never enters formulas.
   */
  image: string;
}

/** Outcome of one monster fight (pure result of `resolveMonsterFight`). */
export interface MonsterFightResult {
  rawDamage: number;
  won: boolean;
  coinReward: number;
  energyLoss: number;
  energyAfter: number;
}

/** Outcome of a single Bewilder Beast turn (`resolveBeastTurn`). */
export interface BeastTurnResult {
  rawDamage: number;
  beastHpAfter: number;
  counterDamage: number;
  dragonEnergyAfter: number;
  dragonRemoved: boolean;
  beastDefeated: boolean;
}

// ---------------------------------------------------------------------------
// Dragon entity (egg + hatched dragon in one serializable object)
// ---------------------------------------------------------------------------

/** Lifecycle stage of a roster entry. Eggs have no actions until hatched. */
export type DragonStage = "egg" | "hatched";

/**
 * One owned dragon OR unhatched egg.
 *
 * STORED vs COMPUTED contract (do not add stored derived fields):
 * - Stored anchors (persist these 8): `id`, `breedId`, `strength`,
 *   `energy` (= value AT `lastEnergyUpdateMs`, not "current"),
 *   `purchasedAtMs`, `hatchAtMs`, `hatchedAtMs`, `lastEnergyUpdateMs`.
 * - Always computed via `config.ts` pure functions, never stored:
 *   - `stage` = `dragonStage(hatchedAtMs)` ("egg" while null, else "hatched");
 *     hatch is due when `isHatchDue(hatchAtMs, nowMs)`.
 *   - `ageDays` = `ageDaysForDragon(hatchedAtMs, nowMs)` (0 for eggs).
 *   - current energy = `energyAt(energy, lastEnergyUpdateMs, nowMs)`.
 *   - `level` = `levelForStrength(strength)` (display-only).
 *   - sell price = `sellPrice(strength, ageDays(now), energy(now), breed)`.
 *   - lifespan = `breed.lifespanDays`; remaining/expired via
 *     `remainingLifespanDays(...)` / `isDragonExpired(...)`.
 *
 * Eggs: `strength` is 0 until hatch, `hatchedAtMs` is null,
 * `hatchAtMs` holds the hidden 1–2 day timer encoded at purchase.
 * Hatched: `hatchedAtMs` is set once, `strength` >= breed base, actions
 * Train / Sell / Monster available (blocked at 0 energy).
 */
export interface Dragon {
  /** Unique instance id (uuid), distinct from `breedId`. */
  id: string;
  /** Foreign key into the `DRAGONS` catalogue (`DragonBreed.id`). */
  breedId: string;
  /** Current combat strength. 0 while an egg; rolled from breed range on hatch. */
  strength: number;
  /**
   * Energy value AT `lastEnergyUpdateMs` (anchor, not live value).
   * Live value = `energyAt(energy, lastEnergyUpdateMs, nowMs)`.
   * Mutated only on drains (battle/train); recovery is computed, never written.
   */
  energy: number;
  /** Epoch ms when the egg was purchased (spin-then-pay confirm). */
  purchasedAtMs: number;
  /** Epoch ms when the egg hatches (hidden timer, `rollHatchMs` at purchase). */
  hatchAtMs: number;
  /** Epoch ms when hatching happened; null while still an egg. */
  hatchedAtMs: number | null;
  /**
   * Epoch ms anchoring the stored `energy` value.
   * Update it only when `energy` itself is written (drain events);
   * passive recovery must NOT tick-write, it is derived.
   */
  lastEnergyUpdateMs: number;
}

// ---------------------------------------------------------------------------
// Player — persistent, serializable profile (single object)
// ---------------------------------------------------------------------------

/**
 * The whole persistent player profile in ONE object for
 * serialization / deserialization (`JSON.stringify(player)` round-trips).
 *
 * Contains: spendable `coins`, the full `dragons` roster (eggs + hatched,
 * each carrying its own `energy`), coin-collection anchors, and lifetime
 * stats. Derived values (collectible coins, levels, prices) are computed
 * via `config.ts` pure functions — never stored here.
 */
export interface Player {
  /** Unique player id. */
  id: string;
  /** Spendable balance. Credited ONLY via tap-collect, fight rewards, sales. */
  coins: number;
  /** All owned entries: unhatched eggs + hatched dragons. Capped by limits. */
  dragons: Dragon[];
  /** Epoch ms when the profile was created (starts with `startingCoins`). */
  createdAtMs: number;
  /** Epoch ms of the last session tick (used for offline accrual). */
  lastSeenMs: number;
  /**
   * Epoch ms of the last Earn-Coins tap-collect.
   * Collectible amount = `collectibleCoins(nowMs - lastCoinCollectMs)`.
   */
  lastCoinCollectMs: number;
  // -- lifetime stats (progression, no gameplay effect) --
  totalCoinsEarned: number;
  totalEggsBought: number;
  totalEggsHatched: number;
  totalTrainings: number;
  totalMonsterWins: number;
  totalMonsterLosses: number;
  totalBeastsDefeated: number;
  totalDragonsSold: number;
}

/** Initial-value factory shape (caller supplies ids/timestamps). */
export interface NewPlayerParams {
  id: string;
  coins: number;
  nowMs: number;
}

// ---------------------------------------------------------------------------
// GameState — current global game state (persistent + transient runtime)
// ---------------------------------------------------------------------------

/** Bewilder Beast lifecycle. */
export type BeastStatus = "alive" | "vanished";

/**
 * Boss runtime state. Survivors keep drained energy; 0-energy dragons are
 * removed; after a win the beast `vanishes` until `respawnAtMs`, then `alive`.
 */
export interface BeastState {
  /** Remaining HP (0 when defeated). Max = `CONFIG.beast.hp`. */
  currentHp: number;
  /** Max HP snapshot (mirrors `CONFIG.beast.hp` at fight start). */
  maxHp: number;
  status: BeastStatus;
  /** Epoch ms when a vanished beast respawns; null while alive. */
  respawnAtMs: number | null;
  /** Epoch ms of the last victory; null if never defeated. */
  lastDefeatedAtMs: number | null;
}

/** Currently spawned monster selection (0–3 entries, one roll per difficulty). */
export interface MonsterSpawnState {
  /** Snapshot of spawned catalogue entries (empty = "No monsters right now"). */
  spawned: MonsterDef[];
  /** Epoch ms of the last spawn roll (modal-open refresh + interval refresh). */
  lastRefreshMs: number;
}

/** Every modal from interface.md §3. `null` = no modal open. */
export type ModalKind =
  | "egg-spin"
  | "not-enough-coins"
  | "train"
  | "train-result"
  | "sell"
  | "monster-select"
  | "monster-fight"
  | "beast-intro"
  | "beast-fight"
  | "coin-summary"
  | null;

/** Swipeable screens: main hub + one detail screen per dragon/egg. */
export type ScreenRef =
  | { kind: "main" }
  | { kind: "dragon"; dragonId: string };

/** One auto-resolved fight-log line shown in locked fight modals. */
export interface FightLogEntry {
  turnIndex: number;
  dragonId: string;
  text: string;
  damage: number;
  beastHpAfter?: number;
  dragonEnergyAfter?: number;
}

/** Transient UI slice (not persisted across sessions, except selection). */
export interface UiState {
  currentScreen: ScreenRef;
  activeModal: ModalKind;
  /** Dragon whose detail screen / modal action is focused. */
  selectedDragonId: string | null;
  /** Monster picked in the selection modal (fight target). */
  selectedMonsterId: string | null;
  /** Turn log for the open fight modal (locked until outcome). */
  fightLog: FightLogEntry[];
}

/**
 * Current global game state: the single root object a session loads, ticks,
 * renders, and saves.
 *
 * - `player`: persistent profile (coins, dragons w/ per-dragon energy).
 * - `beast` / `monsterSpawn`: global boss + spawn runtime.
 * - `ui`: transient screens / modals / selection.
 * - `nowMs` / `lastTickMs`: clock anchors for coin accrual, energy recovery,
 *   age ticks, hatch checks, and spawn/beast timers.
 */
export interface GameState {
  /** Schema version (mirrors `CONFIG.meta.configVersion`). */
  version: number;
  player: Player;
  beast: BeastState;
  monsterSpawn: MonsterSpawnState;
  ui: UiState;
  /** Current game clock (epoch ms). Advanced by the tick loop. */
  nowMs: number;
  /** Epoch ms of the last processed tick. */
  lastTickMs: number;
}

/** Params needed to boot a fresh session. */
export interface NewGameStateParams {
  playerId: string;
  nowMs: number;
  configVersion: number;
  beastMaxHp: number;
}
