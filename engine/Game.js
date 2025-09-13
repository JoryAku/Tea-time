const Player = require("./Player");
const Card = require("./Card");
const cardsData = require("../data/Cards.json");
const weatherData = require("../data/weather.json");

class Game {
  // Wait action: uses up one action, triggers weather, does not skip to next season
  waitAction() {
    if (this.player.actionsLeft > 0) {
      this.player.actionsLeft--;
      this.triggerWeather();
      console.log(`⏳ Waited. Actions left this season: ${this.player.actionsLeft}`);
      if (this.player.actionsLeft === 0) {
        this.endSeasonProcessing();
      }
      return true;
    } else {
      console.log('❌ No actions left this season.');
      return false;
    }
  }
  // Harvest seeds from a plant in the garden (by index)
  harvestSeedFromGarden(idx) {
    const card = this.player.garden[idx];
    if (!card) {
      console.log('❌ No plant at that garden index.');
      return false;
    }
    const stageDef = card.definition.states[card.state];
    if (!stageDef || !stageDef.actions || !stageDef.actions.harvest_seed) {
      console.log('❌ This plant cannot be harvested for seeds at this stage.');
      return false;
    }
    // Add a new tea_plant card at seed stage to hand (or shed)
    const newSeed = this.createCard('tea_plant', 'seed');
    this.player.addCardToLocation(newSeed, 'hand');
    console.log('🌱 Harvested a tea plant seed and added to hand.');
    return true;
  }
  // Plant a seed from any zone (hand or shed) into the garden, preferring compost locations
  plantSeedFromZone(zone, idx) {
    const seedCard = this.player[zone][idx];
    if (!seedCard || seedCard.state !== 'seed' || seedCard.definition.id !== 'tea_plant') {
      console.log('❌ Selected card is not a plantable seed.');
      return false;
    }
    // Only allow planting in compost
    const compostIdx = this.player.garden.findIndex(card => card.state === 'compost');
    if (compostIdx !== -1) {
      // Mark compost card for planting
      this.player.garden[compostIdx].justPlantedSeed = true;
      this.player.removeCardFromCurrentLocation(seedCard);
      console.log('🌱 Planted seed into compost.');
      return true;
    } else {
      console.log('❌ You can only plant seeds in compost.');
      return false;
    }
  }
  constructor() {
    this.player = new Player();
    this.cards = cardsData;
    this.weather = weatherData;

    this.seasons = ["spring", "summer", "autumn", "winter"];
    this.seasonIndex = 0;
    this.currentSeason = this.seasons[this.seasonIndex];

    this.actionsPerSeason = 3;
    this.player.actionsLeft = this.actionsPerSeason;

    // create a small starting hand (4 seedlings)
    this.initStartingDeck();
  }

  initStartingDeck() {
  // Start with only one tea_plant seedling in the garden
  const c = this.createCard("tea_plant", "seedling");
  this.player.garden.push(c);
  }

  // create a Card instance from an id in data/Cards.json
  createCard(cardId, state = null) {
    const all = [...this.cards.plants, ...this.cards.ingredients, ...this.cards.teas];
    const def = all.find((c) => c.id === cardId);
    if (!def) throw new Error(`Card definition not found: ${cardId}`);
    return new Card(def, state);
  }

  // pick a weather event from the current season's distribution
  pickWeatherEvent() {
    const table = this.weather[this.currentSeason];
    const r = Math.random() * 100;
    let acc = 0;
    for (const row of table) {
      acc += row.pct;
      if (r < acc) return row.event;
    }
    return table[table.length - 1].event;
  }

  // applied after each player action
  triggerWeather() {
    const event = this.pickWeatherEvent();
    console.log(`\n🌦 Weather event: ${event}`);
    this.applyWeather(event);
    // Progress oxidation on tea leaves
    this.progressOxidation();
    // Check for tea processing failures
    this.checkTeaProcessingFailures(event);
    // After weather, tick down all active conditions on all plants
    this.player.garden.forEach(card => card.tickActiveConditions && card.tickActiveConditions());
  }

  // small helper to show a peek (for Green Tea)
  peekWeather(n = 1) {
    console.log("🔎 Peeking at the next weather event(s):");
    for (let i = 0; i < n; i++) {
      console.log("  -", this.pickWeatherEvent());
    }
  }

  // apply event to garden plants (affects each plant's resourcesThisSeason or triggers vulnerabilities)
  applyWeather(event) {
    // Find the full event object for the current season
    const seasonEvents = this.weather[this.currentSeason];
    const eventObj = seasonEvents.find(e => e.event === event);
    const conditions = (eventObj && eventObj.conditions) ? eventObj.conditions : [];

    // for each plant in garden, update resourcesThisSeason and check vulnerabilities
    this.player.garden.forEach((card) => {
      const stageDef = card.definition.states[card.state];
      if (!stageDef) return;

      // Add/refresh event conditions for 2 actions
      for (const cond of conditions) {
        card.activeConditions[cond] = 2;
      }

      // check vulnerabilities first (immediate)
      const vulns = stageDef.vulnerabilities || [];
      for (const v of vulns) {
        if (v.event === event) {
          // IMMUNITY: If plant has 'water' condition, immune to 'drought' vulnerability
          if (event === 'drought' && card.activeConditions['water']) {
            console.log(`💧 ${card.name} is immune to drought due to water condition.`);
            continue;
          }
          // IMMUNITY: If plant has 'sunlight' condition, immune to 'frost' vulnerability
          if (event === 'frost' && card.activeConditions['sunlight']) {
            console.log(`☀️ ${card.name} is immune to frost due to sunlight condition.`);
            continue;
          }
          // Any vulnerability met should send plant to 'dead' state
          card.state = "dead";
          console.log(`☠️ ${card.name} died (was ${stageDef.name || card.state}) due to ${event} (vulnerability met).`);
          return; // stop processing this card
        }
      }

      // if event fulfills a needed resource for current stage, record it
      const needs = stageDef.needs || {};
      const reqResources = needs.resources || [];
      for (const cond of Object.keys(card.activeConditions)) {
        if (reqResources.includes(cond)) {
          card.resourcesThisSeason.add(cond);
        }
      }
      // (we just record; final progression happens at season end)
    });
  }

  // called when season ends (player.actionsLeft <= 0)
  endSeasonProcessing() {
    console.log("\n--- Season end: checking plant progression ---");
    const current = this.currentSeason;
    this.player.garden.forEach((card, idx) => {
      const stageDef = card.definition.states[card.state];
      if (!stageDef) return;

      // Age tracking: increment age at the end of winter (1 year = 4 seasons)
      if (!card._seasonCounter) card._seasonCounter = 0;
      card._seasonCounter++;
      if (card._seasonCounter >= 4) {
        card._seasonCounter = 0;
        card.age = (card.age || 0) + 1;
        // Check lifespan
        if (card.lifespan && card.age >= card.lifespan && card.state !== 'dead') {
          card.state = 'dead';
          card.resetStateProgress && card.resetStateProgress();
          card._deadCounter = 0; // Track how long in dead state
          return;
        }
      }

      // Dead state compost/seed logic
      if (card.state === 'dead') {
        card._deadCounter = (card._deadCounter || 0) + 1;
        // Check if needs are met (use dead state's needs if any, else always compost)
        const deadNeeds = stageDef.needs || {};
        const seasonsAllowed = deadNeeds.season || this.seasons; // Default: any season
        const requiredResources = deadNeeds.resources || [];
        const haveAll = requiredResources.every((r) => card.resourcesThisSeason && card.resourcesThisSeason.has(r));
        // Get transition threshold from Cards.json
        const deadTransitions = stageDef.transitions || [];
        let deadThreshold = 1;
        if (deadTransitions.length > 0) {
          const t = deadTransitions[0];
          deadThreshold = (t.actions.min === t.actions.max) ? t.actions.min : (Math.floor(Math.random() * (t.actions.max - t.actions.min + 1)) + t.actions.min);
        }
        if (card._deadCounter >= deadThreshold && (haveAll || requiredResources.length === 0)) {
          // Transition to compost state
          card.state = 'compost';
          card._deadCounter = 0;
          card.resetStateProgress && card.resetStateProgress();
          // Optionally add fertilizer token
          if (card.definition.states.dead && card.definition.states.dead.actions && card.definition.states.dead.actions.compost) {
            this.player.addCardToLocation(this.createCard('fertilizer_token'), 'shed');
            console.log(`🌱 ${card.name} decomposed into compost.`);
          }
          // Compost stays in garden, can be planted into
          console.log(`🌱 ${card.name} is now compost and can be planted into.`);
        }
        // Always reset resources for next season
        card.resetSeasonResources && card.resetSeasonResources();
        return;
      }
      // Allow planting seeds in compost
      if (card.state === 'compost' && card.justPlantedSeed) {
        // Replace compost with a new seedling and remove the compost
        this.player.garden[idx] = this.createCard(card.definition.id, 'seedling');
        console.log(`🌱 A seed was planted in compost and is now a seedling.`);
        // Optionally, compost could be removed instead of replaced
        // delete card.justPlantedSeed; // Clean up flag
        return;
      }

      const needs = stageDef.needs || {};
      const seasonsAllowed = needs.season || [];
      // if this stage can progress in this season:
      if (seasonsAllowed.includes(current)) {
        const requiredResources = needs.resources || [];
        const haveAll = requiredResources.every((r) => card.resourcesThisSeason.has(r));
        if (haveAll) {
          // increment state progress
          card.stateProgress = (card.stateProgress || 0) + 1;
          // check transitions from JSON
          const transitions = stageDef.transitions || [];
          if (transitions.length > 0) {
            // For now, use the first transition (could be extended for multiple)
            const t = transitions[0];
            const min = t.actions.min;
            const max = t.actions.max;
            // If min==max, use that; if not, store a random threshold on card
            if (card._transitionThreshold === undefined) {
              card._transitionThreshold = (min === max) ? min : (Math.floor(Math.random() * (max - min + 1)) + min);
            }
            if (card.stateProgress >= card._transitionThreshold) {
              card.state = t.to;
              card.resetStateProgress();
              delete card._transitionThreshold;
              console.log(`➡️ ${card.name} advanced to ${card.state}`);
            }
          }
        } else {
          // didn't get needs: no automatic growth; could handle penalties here
        }
      }
      // reset resource record for next season
      card.resetSeasonResources();
    });

    // advance season
    this.seasonIndex = (this.seasonIndex + 1) % this.seasons.length;
    this.currentSeason = this.seasons[this.seasonIndex];
    this.player.actionsLeft = this.actionsPerSeason;
    // At the start of the season, add a random condition from the season's weather list to all plants
    const seasonWeather = this.weather[this.currentSeason];
    if (seasonWeather && seasonWeather.length > 0) {
      // Pick a random event from the season
      const idx = Math.floor(Math.random() * seasonWeather.length);
      const event = seasonWeather[idx];
      if (event && event.conditions) {
        this.player.garden.forEach(card => {
          event.conditions.forEach(cond => {
            // Add the condition for 2 actions, like weather events
            card.activeConditions[cond] = 2;
          });
        });
        console.log(`\n🌱 Seasonal effect: ${event.event} (${event.conditions.join(", ")}) applied to all plants.`);
      }
    }
    console.log(`\n>>> ${this.currentSeason.toUpperCase()} begins.`);
  }

  // Progress oxidation on tea leaves in kitchen
  progressOxidation() {
    this.player.kitchen.forEach((card, idx) => {
      if (card.definition.id === 'tea_leaf_oxidizing') {
        // Check for overoxidation first (too many actions spent oxidizing)
        if (card.oxidationProgress > 3) { // Overoxidation threshold
          const deadCard = this.createCard('dead_leaves');
          this.player.kitchen[idx] = deadCard;
          console.log(`💀 ${card.name} overoxidized and became dead leaves.`);
          return;
        }
        
        if (card.oxidationActionsLeft > 0) {
          card.oxidationActionsLeft--;
          console.log(`🫖 ${card.name} oxidation continues... ${card.oxidationActionsLeft} actions remaining.`);
          
          if (card.oxidationActionsLeft === 0) {
            console.log(`🫖 ${card.name} oxidation complete. Can now be dried or fixed.`);
          }
        }
      }
    });
  }

  // Check for tea processing failures based on weather
  checkTeaProcessingFailures(event) {
    this.player.kitchen.forEach((card, idx) => {
      // Check vulnerabilities for tea leaves
      if (card.definition.vulnerabilities) {
        card.definition.vulnerabilities.forEach(vuln => {
          if (vuln.event === event && vuln.outcome === 'dead') {
            const deadCard = this.createCard('dead_leaves');
            this.player.kitchen[idx] = deadCard;
            console.log(`💀 ${card.name} rotted due to ${event} and became dead leaves.`);
          }
        });
      }

      // Check burn risk for fix action during heat events
      if (event === 'heat' && card.definition.id === 'tea_leaf_raw') {
        // Check if player has shelter - for simplicity, assume no shelter in kitchen
        const deadCard = this.createCard('dead_leaves');
        this.player.kitchen[idx] = deadCard;
        console.log(`🔥 ${card.name} burned during heat event (no shelter in kitchen).`);
      }
    });
  }
}

module.exports = Game;
