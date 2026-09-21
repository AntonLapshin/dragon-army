// GENERATED from engine/engine.ts — do not edit by hand.
// Regenerate with: npm run build:engine
// (zeus build only bundles .js; the .ts sources are for vitest.)
import {
  CONFIG,
  ageDaysForDragonInstance,
  applyEnergyDrain,
  breedForDragon,
  breedForIndex,
  canAffordEgg,
  canTrainDragon,
  collectibleCoins,
  drawBreedIndex,
  dragonStage,
  isBeastEligible,
  isDragonHatched,
  isDragonInstanceExpired,
  isHatchDue,
  levelForDragon,
  liveEnergyForDragon,
  remainingLifespanForDragon,
  resolveBeastTurn,
  resolveMonsterFight,
  rollBaseStrength,
  rollBeastReward,
  rollBeastWinStrengthGain,
  rollHatchMs,
  rollSpawnedMonsters,
  rollTrainingGain,
  sellPriceForDragon,
  trainingCostForDragon,
  trainingEnergyCost
} from "./config.js";
import {
  advanceCollectAnchor,
  beastTurnLogText,
  createDragonId,
  createEggDragon,
  hatchDragonInstance,
  monsterFightLogText,
  screensForRoster,
  withEnergyAnchor
} from "./utils.js";
function createNewGameState(params) {
  const { playerId, nowMs, configVersion, beastMaxHp } = params;
  const beast = {
    currentHp: beastMaxHp,
    maxHp: beastMaxHp,
    status: "alive",
    respawnAtMs: null,
    lastDefeatedAtMs: null
  };
  return {
    version: configVersion,
    player: {
      id: playerId,
      coins: CONFIG.economy.startingCoins,
      dragons: [],
      createdAtMs: nowMs,
      lastSeenMs: nowMs,
      lastCoinCollectMs: nowMs,
      totalCoinsEarned: 0,
      totalEggsBought: 0,
      totalEggsHatched: 0,
      totalTrainings: 0,
      totalMonsterWins: 0,
      totalMonsterLosses: 0,
      totalBeastsDefeated: 0,
      totalDragonsSold: 0
    },
    beast,
    monsterSpawn: { spawned: [], lastRefreshMs: 0 },
    ui: {
      currentScreen: { kind: "main" },
      activeModal: null,
      selectedDragonId: null,
      selectedMonsterId: null,
      fightLog: []
    },
    nowMs,
    lastTickMs: nowMs
  };
}
function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
function isLoadedState(value) {
  if (typeof value !== "object" || value === null) return false;
  const s = value;
  return Array.isArray(s.player?.dragons) && typeof s.player?.coins === "number" && typeof s.beast?.currentHp === "number";
}
function createGameEngine(deps) {
  const storage = deps.storage;
  const getTime = deps.getTime;
  const rand = deps.rand01 ?? Math.random;
  const generateId = deps.generateId ?? createDragonId;
  const playerId = deps.playerId ?? "player-1";
  let state = null;
  let fightLocked = false;
  function now() {
    return getTime();
  }
  function requireState() {
    if (!state) throw new Error("engine not initialised \u2014 call init() first");
    return state;
  }
  function findDragon(dragonId) {
    return requireState().player.dragons.find((d) => d.id === dragonId);
  }
  function replaceDragon(updated) {
    const s = requireState();
    s.player.dragons = s.player.dragons.map(
      (d) => d.id === updated.id ? updated : d
    );
  }
  function removeDragons(ids) {
    const s = requireState();
    if (ids.size === 0) return;
    s.player.dragons = s.player.dragons.filter((d) => !ids.has(d.id));
    if (s.ui.selectedDragonId && ids.has(s.ui.selectedDragonId)) {
      s.ui.selectedDragonId = null;
      s.ui.currentScreen = { kind: "main" };
    }
  }
  function hatchDueEggs(atMs) {
    const s = requireState();
    for (const dragon of s.player.dragons) {
      if (dragon.hatchedAtMs !== null) continue;
      if (!isHatchDue(dragon.hatchAtMs, atMs)) continue;
      const breed = breedForDragon(dragon);
      const strength = rollBaseStrength(breed, rand());
      replaceDragon(hatchDragonInstance(dragon, atMs, strength));
      s.player.totalEggsHatched += 1;
    }
  }
  function removeExpiredDragons(atMs) {
    const s = requireState();
    const expired = s.player.dragons.filter(
      (d) => isDragonInstanceExpired(d, atMs)
    );
    if (expired.length > 0) {
      removeDragons(new Set(expired.map((d) => d.id)));
    }
  }
  function respawnBeastIfDue(atMs) {
    const s = requireState();
    if (s.beast.status === "vanished" && s.beast.respawnAtMs !== null && atMs >= s.beast.respawnAtMs) {
      s.beast.status = "alive";
      s.beast.currentHp = s.beast.maxHp;
      s.beast.respawnAtMs = null;
    }
  }
  function refreshSpawnIfStale(atMs) {
    const s = requireState();
    if (atMs - s.monsterSpawn.lastRefreshMs >= CONFIG.monsterSpawn.refreshIntervalMs) {
      s.monsterSpawn.spawned = rollSpawnedMonsters(rand);
      s.monsterSpawn.lastRefreshMs = atMs;
    }
  }
  function tick(atMs = now()) {
    const s = requireState();
    s.nowMs = atMs;
    hatchDueEggs(atMs);
    removeExpiredDragons(atMs);
    respawnBeastIfDue(atMs);
    refreshSpawnIfStale(atMs);
    s.player.lastSeenMs = atMs;
    s.lastTickMs = atMs;
    return s;
  }
  function save() {
    const s = requireState();
    s.nowMs = now();
    storage.save(cloneState(s));
  }
  function init() {
    const saved = storage.load();
    if (saved && isLoadedState(saved)) {
      state = saved;
      if (!state.ui) {
        state.ui = {
          currentScreen: { kind: "main" },
          activeModal: null,
          selectedDragonId: null,
          selectedMonsterId: null,
          fightLog: []
        };
      }
      if (!state.monsterSpawn) {
        state.monsterSpawn = { spawned: [], lastRefreshMs: 0 };
      }
    } else {
      const atMs = now();
      state = createNewGameState({
        playerId,
        nowMs: atMs,
        configVersion: CONFIG.meta.configVersion,
        beastMaxHp: CONFIG.beast.hp
      });
    }
    tick(now());
    save();
    return cloneState(requireState());
  }
  function resume() {
    tick(now());
    save();
    return cloneState(requireState());
  }
  function getState() {
    return cloneState(requireState());
  }
  function reset() {
    const atMs = now();
    state = createNewGameState({
      playerId,
      nowMs: atMs,
      configVersion: CONFIG.meta.configVersion,
      beastMaxHp: CONFIG.beast.hp
    });
    tick(atMs);
    save();
    return cloneState(state);
  }
  function rosterFull() {
    const s = requireState();
    const eggs = s.player.dragons.filter(
      (d) => !isDragonHatched(d)
    ).length;
    return s.player.dragons.length >= CONFIG.limits.maxRoster || eggs >= CONFIG.limits.maxEggsPending;
  }
  function spinEggPreview() {
    const s = requireState();
    if (!canAffordEgg(s.player.coins)) {
      return { ok: false, reason: "not-enough-coins" };
    }
    if (rosterFull()) return { ok: false, reason: "roster-full" };
    const breedIndex = drawBreedIndex(rand());
    return { ok: true, breedIndex, breed: breedForIndex(breedIndex) };
  }
  function confirmEggPurchase(breedIndex, hatchRand01) {
    const s = requireState();
    const atMs = now();
    if (!canAffordEgg(s.player.coins)) {
      return { ok: false, reason: "not-enough-coins" };
    }
    if (rosterFull()) return { ok: false, reason: "roster-full" };
    const breed = breedForIndex(breedIndex);
    s.player.coins -= CONFIG.egg.price;
    const egg = createEggDragon({
      id: generateId(rand(), atMs),
      breedId: breed.id,
      nowMs: atMs,
      hatchDelayMs: rollHatchMs(hatchRand01 ?? rand())
    });
    s.player.dragons.push(egg);
    s.player.totalEggsBought += 1;
    s.ui.selectedDragonId = egg.id;
    s.ui.currentScreen = { kind: "dragon", dragonId: egg.id };
    save();
    return { ok: true, dragon: { ...egg } };
  }
  function collectibleAmount(atMs = now()) {
    const s = requireState();
    return collectibleCoins(Math.max(0, atMs - s.player.lastCoinCollectMs));
  }
  function hasCollectible(atMs = now()) {
    return collectibleAmount(atMs) > 0;
  }
  function getEconomyView(atMs = now()) {
    const s = requireState();
    const collectible = collectibleAmount(atMs);
    return {
      coins: s.player.coins,
      collectible,
      hasCollectible: collectible > 0,
      canAffordEgg: canAffordEgg(s.player.coins)
    };
  }
  function collectCoins() {
    const s = requireState();
    const atMs = now();
    const advanced = advanceCollectAnchor(s.player.lastCoinCollectMs, atMs);
    if (advanced.collected > 0) {
      s.player.coins += advanced.collected;
      s.player.totalCoinsEarned += advanced.collected;
      s.player.lastCoinCollectMs = advanced.newLastCollectMs;
      save();
    }
    return { collected: advanced.collected };
  }
  function getDragonView(dragonId, atMs = now()) {
    const dragon = findDragon(dragonId);
    if (!dragon) return null;
    const s = requireState();
    const breed = breedForDragon(dragon);
    const energy = liveEnergyForDragon(dragon, atMs);
    return {
      dragon: { ...dragon },
      breed,
      stage: dragonStage(dragon.hatchedAtMs),
      level: levelForDragon(dragon),
      ageDays: ageDaysForDragonInstance(dragon, atMs),
      energy,
      strength: dragon.strength,
      sellPrice: sellPriceForDragon(dragon, atMs),
      remainingLifespanDays: remainingLifespanForDragon(dragon, atMs),
      expired: isDragonInstanceExpired(dragon, atMs),
      canTrain: canTrainDragon(dragon, s.player.coins, atMs),
      canFight: isBeastEligible(dragon, atMs)
    };
  }
  function listDragonViews(atMs = now()) {
    const s = requireState();
    const views = [];
    for (const dragon of s.player.dragons) {
      const view = getDragonView(dragon.id, atMs);
      if (view) views.push(view);
    }
    return views;
  }
  function hatchedCount() {
    return requireState().player.dragons.filter(
      (d) => isDragonHatched(d)
    ).length;
  }
  function getScreens() {
    return screensForRoster(
      requireState().player.dragons.map((d) => d.id)
    );
  }
  function trainPreview(dragonId) {
    const s = requireState();
    const dragon = findDragon(dragonId);
    if (!dragon) {
      return { canTrain: false, cost: 0, reason: "unknown-dragon" };
    }
    const cost = trainingCostForDragon(dragon);
    if (!isDragonHatched(dragon)) {
      return { canTrain: false, cost, reason: "egg" };
    }
    if (liveEnergyForDragon(dragon, now()) <= CONFIG.training.requiresEnergyAbove) {
      return { canTrain: false, cost, reason: "no-energy" };
    }
    if (s.player.coins < cost) {
      return { canTrain: false, cost, reason: "not-enough-coins" };
    }
    return { canTrain: true, cost, reason: null };
  }
  function trainDragon(dragonId, gainRand01) {
    const s = requireState();
    const atMs = now();
    const preview = trainPreview(dragonId);
    if (!preview.canTrain) return { ok: false, reason: preview.reason };
    const dragon = findDragon(dragonId);
    if (!dragon) return { ok: false, reason: "unknown-dragon" };
    const levelBefore = levelForDragon(dragon);
    const gain = rollTrainingGain(gainRand01 ?? rand());
    const energyCost = trainingEnergyCost();
    const liveEnergy = liveEnergyForDragon(dragon, atMs);
    const energyAfter = applyEnergyDrain(liveEnergy, energyCost);
    s.player.coins -= preview.cost;
    replaceDragon({
      ...dragon,
      strength: dragon.strength + gain,
      energy: energyAfter,
      lastEnergyUpdateMs: atMs
    });
    s.player.totalTrainings += 1;
    const after = findDragon(dragonId);
    const strengthAfter = after?.strength ?? dragon.strength + gain;
    save();
    return {
      ok: true,
      cost: preview.cost,
      gain,
      strengthAfter,
      levelBefore,
      levelAfter: levelForDragon({ ...dragon, strength: strengthAfter }),
      energyCost,
      energyAfter
    };
  }
  function sellPreview(dragonId, atMs = now()) {
    const dragon = findDragon(dragonId);
    if (!dragon || !isDragonHatched(dragon)) return null;
    return sellPriceForDragon(dragon, atMs);
  }
  function sellDragon(dragonId) {
    const s = requireState();
    const atMs = now();
    const dragon = findDragon(dragonId);
    if (!dragon) return { ok: false, reason: "unknown-dragon" };
    if (!isDragonHatched(dragon)) return { ok: false, reason: "egg" };
    const price = sellPriceForDragon(dragon, atMs);
    removeDragons(/* @__PURE__ */ new Set([dragonId]));
    s.player.coins += price;
    s.player.totalCoinsEarned += price;
    s.player.totalDragonsSold += 1;
    save();
    return { ok: true, price };
  }
  function refreshMonsterSpawn(force = false) {
    const s = requireState();
    const atMs = now();
    if (force || atMs - s.monsterSpawn.lastRefreshMs >= CONFIG.monsterSpawn.refreshIntervalMs) {
      s.monsterSpawn.spawned = rollSpawnedMonsters(rand);
      s.monsterSpawn.lastRefreshMs = atMs;
      save();
    }
    return s.monsterSpawn.spawned.map((m) => ({ ...m }));
  }
  function getSpawnedMonsters() {
    return requireState().monsterSpawn.spawned.map((m) => ({ ...m }));
  }
  function openMonsterSelect(dragonId) {
    const s = requireState();
    const dragon = findDragon(dragonId);
    if (!dragon) return { ok: false, reason: "unknown-dragon" };
    if (!isDragonHatched(dragon)) return { ok: false, reason: "egg" };
    if (!isBeastEligible(dragon, now())) {
      return { ok: false, reason: "no-energy" };
    }
    const spawned = refreshMonsterSpawn(true);
    s.ui.selectedDragonId = dragonId;
    s.ui.selectedMonsterId = null;
    s.ui.activeModal = "monster-select";
    save();
    return { ok: true, spawned };
  }
  function fightMonster(dragonId, monsterId, rolls) {
    const s = requireState();
    const atMs = now();
    const dragon = findDragon(dragonId);
    if (!dragon) return { ok: false, reason: "unknown-dragon" };
    if (!isDragonHatched(dragon)) return { ok: false, reason: "egg" };
    const liveEnergy = liveEnergyForDragon(dragon, atMs);
    if (!isBeastEligible(dragon, atMs)) {
      return { ok: false, reason: "no-energy" };
    }
    const target = s.monsterSpawn.spawned.find(
      (m) => m.id === monsterId
    );
    if (!target) {
      return { ok: false, reason: "monster-not-spawned" };
    }
    fightLocked = true;
    try {
      const result = resolveMonsterFight(
        dragon.strength,
        liveEnergy,
        target,
        rolls?.bonusRand01 ?? rand(),
        rolls?.rewardRand01 ?? rand(),
        rolls?.energyRand01 ?? rand(),
        rolls?.strengthRand01 ?? rand()
      );
      const strengthAfter = dragon.strength + result.strengthGain;
      replaceDragon({
        ...dragon,
        strength: strengthAfter,
        energy: result.energyAfter,
        lastEnergyUpdateMs: atMs
      });
      if (result.won) {
        s.player.coins += result.coinReward;
        s.player.totalCoinsEarned += result.coinReward;
        s.player.totalMonsterWins += 1;
      } else {
        s.player.totalMonsterLosses += 1;
      }
      const breed = breedForDragon(dragon);
      const logText = monsterFightLogText(
        breed.name,
        target.name,
        result.rawDamage,
        result.won
      );
      s.ui.selectedDragonId = dragonId;
      s.ui.selectedMonsterId = monsterId;
      s.ui.activeModal = "monster-fight";
      s.ui.fightLog = [
        {
          turnIndex: 0,
          dragonId,
          text: logText,
          damage: result.rawDamage,
          dragonEnergyAfter: result.energyAfter
        }
      ];
      save();
      return {
        ok: true,
        won: result.won,
        rawDamage: result.rawDamage,
        coinReward: result.coinReward,
        energyLoss: result.energyLoss,
        energyAfter: result.energyAfter,
        strengthGain: result.strengthGain,
        strengthAfter,
        logText
      };
    } finally {
      fightLocked = false;
    }
  }
  function getBeastParticipants(atMs = now()) {
    return requireState().player.dragons.filter((d) => isBeastEligible(d, atMs)).map((d) => ({ ...d }));
  }
  function canFightBeast(atMs = now()) {
    const s = requireState();
    if (s.beast.status !== "alive") return { ok: false, reason: "beast-vanished" };
    if (getBeastParticipants(atMs).length === 0) {
      return { ok: false, reason: "no-participants" };
    }
    return { ok: true };
  }
  function openBeastIntro() {
    const s = requireState();
    s.ui.activeModal = "beast-intro";
    save();
  }
  function fightBeast() {
    tick(now());
    const s = requireState();
    const atMs = now();
    if (s.beast.status !== "alive") {
      return { ok: false, reason: "beast-vanished" };
    }
    const lineup = s.player.dragons.filter((d) => isBeastEligible(d, atMs));
    if (lineup.length === 0) {
      return { ok: false, reason: "no-participants" };
    }
    fightLocked = true;
    try {
      let hp = s.beast.currentHp;
      const turns = [];
      const removedIds = /* @__PURE__ */ new Set();
      const finalEnergies = /* @__PURE__ */ new Map();
      let turnIndex = 0;
      let defeated = false;
      s.ui.activeModal = "beast-fight";
      s.ui.fightLog = [];
      for (const participant of lineup) {
        let energy = liveEnergyForDragon(participant, atMs);
        finalEnergies.set(participant.id, energy);
        while (energy > 0 && !defeated) {
          const turn = resolveBeastTurn(
            participant.strength,
            energy,
            hp,
            rand(),
            rand()
          );
          hp = turn.beastHpAfter;
          energy = turn.dragonEnergyAfter;
          finalEnergies.set(participant.id, energy);
          const breed = breedForDragon(participant);
          turns.push({
            turnIndex: turnIndex++,
            dragonId: participant.id,
            text: beastTurnLogText(
              breed.name,
              turn.rawDamage,
              turn.counterDamage
            ),
            damage: turn.rawDamage,
            beastHpAfter: hp,
            dragonEnergyAfter: energy
          });
          if (turn.beastDefeated) {
            defeated = true;
            break;
          }
          if (turn.dragonRemoved) {
            removedIds.add(participant.id);
            break;
          }
        }
        if (defeated) break;
      }
      let reward = 0;
      const strengthGains = {};
      if (defeated) {
        reward = rollBeastReward(rand());
        s.player.coins += reward;
        s.player.totalCoinsEarned += reward;
        s.player.totalBeastsDefeated += 1;
        s.beast.currentHp = 0;
        s.beast.status = "vanished";
        s.beast.respawnAtMs = atMs + CONFIG.beast.respawnAfterWinMs;
        s.beast.lastDefeatedAtMs = atMs;
      } else {
        s.beast.currentHp = hp;
      }
      for (const [id, energy] of finalEnergies) {
        if (removedIds.has(id)) continue;
        const current = s.player.dragons.find((d) => d.id === id);
        if (!current) continue;
        if (defeated) {
          const gain = rollBeastWinStrengthGain(rand());
          strengthGains[id] = gain;
          replaceDragon({
            ...current,
            strength: current.strength + gain,
            energy,
            lastEnergyUpdateMs: atMs
          });
        } else {
          replaceDragon(withEnergyAnchor(current, energy, atMs));
        }
      }
      removeDragons(removedIds);
      s.ui.fightLog = turns;
      save();
      return {
        ok: true,
        won: defeated,
        turns,
        beastHpAfter: defeated ? 0 : hp,
        reward,
        removedDragonIds: [...removedIds],
        strengthGains
      };
    } finally {
      fightLocked = false;
    }
  }
  function openModal(kind) {
    requireState().ui.activeModal = kind;
    save();
  }
  function closeModal() {
    if (fightLocked) return { ok: false, reason: "fight-locked" };
    requireState().ui.activeModal = null;
    save();
    return { ok: true };
  }
  function isFightLocked() {
    return fightLocked;
  }
  function setScreen(screen) {
    const s = requireState();
    s.ui.currentScreen = screen;
    if (screen.kind === "dragon") s.ui.selectedDragonId = screen.dragonId;
    save();
  }
  function selectDragon(dragonId) {
    const dragon = findDragon(dragonId);
    if (!dragon) return false;
    const s = requireState();
    s.ui.selectedDragonId = dragonId;
    s.ui.currentScreen = { kind: "dragon", dragonId };
    save();
    return true;
  }
  return {
    // lifecycle (koala-style)
    init,
    resume,
    getState,
    save,
    reset,
    tick,
    // egg flow (spin-then-pay)
    spinEggPreview,
    confirmEggPurchase,
    canBuyEgg: () => canAffordEgg(requireState().player.coins) && !rosterFull(),
    // coins (tap-to-collect)
    collectibleAmount,
    hasCollectible,
    getEconomyView,
    collectCoins,
    // dragons
    getDragonView,
    listDragonViews,
    hatchedCount,
    getScreens,
    // training / selling
    trainPreview,
    trainDragon,
    sellPreview,
    sellDragon,
    // monsters
    refreshMonsterSpawn,
    getSpawnedMonsters,
    openMonsterSelect,
    fightMonster,
    // beast
    getBeastParticipants,
    canFightBeast,
    openBeastIntro,
    fightBeast,
    // ui
    openModal,
    closeModal,
    isFightLocked,
    setScreen,
    selectDragon
  };
}
export {
  createGameEngine,
  createNewGameState
};
