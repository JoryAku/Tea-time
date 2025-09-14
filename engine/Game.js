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

    // Track timeline predictions for Green Tea effects
    this.plantPredictions = new Map(); // plantId -> prediction

    // create a small starting hand (4 seedlings)
    this.initStartingDeck();
  }

  initStartingDeck() {
    // Start with only one tea_plant seedling in the garden
    const startSeedling = this.createCard("tea_plant", "seedling");
    this.player.garden.push(startSeedling);
    const startGreenTea = this.createCard("green_tea");
    this.player.cafe.push(startGreenTea);
    console.log("🌱 Starting garden with a tea plant seedling.");
    console.log("🫖 Starting cafe with a green tea.");
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
    // Check if any predictions should be enforced
    this.checkPredictionEnforcement();
  }

  // Handle Green Tea plant foresight
  handlePlantForesight(actionsToSimulate, teaCard) {
    console.log("\n🔮 You consumed Green Tea! Select a plant to see its future:");
    
    // Show available plants in garden
    const plants = this.player.garden.filter(card => card.definition.id === 'tea_plant');
    if (plants.length === 0) {
      console.log("❌ No tea plants in garden to preview.");
      return false;
    }
    
    plants.forEach((plant, idx) => {
      console.log(`  ${idx}: ${plant.name} [${plant.state}]`);
    });
    
    // For terminal version, select the first plant automatically
    // In a real UI, this would be an interactive selection
    const selectedPlant = plants[0];
    console.log(`\n🔮 Previewing future for: ${selectedPlant.name} [${selectedPlant.state}]`);
    
    // Simulate the plant's future
    const prediction = this.simulatePlantFuture(selectedPlant, actionsToSimulate);
    
    // Store the prediction for this plant to enforce later
    this.plantPredictions.set(selectedPlant.id, {
      actionsRemaining: actionsToSimulate,
      prediction: prediction,
      originalActions: this.player.actionsLeft + (this.actionsPerSeason * Math.floor(actionsToSimulate / this.actionsPerSeason)),
      protectiveActions: new Set() // Track what protective actions have been taken
    });
    
    // Display the prediction
    console.log("\n🔮 VISION OF THE FUTURE (4 years from now):");
    if (prediction.alive) {
      console.log(`✅ Plant will survive and be in state: ${prediction.finalState}`);
      console.log(`🎂 Plant will be ${prediction.age} years old`);
    } else {
      console.log(`💀 Plant will die from: ${prediction.deathCause}`);
      console.log(`📅 Death will occur in: ${prediction.deathSeason}`);
      console.log(`⏰ After ${prediction.deathAction} actions from now`);
      console.log("\n💡 Take protective actions now to change this fate!");
      
      if (prediction.deathCause === 'drought') {
        console.log("   💧 Use WATER action to protect against drought");
      } else if (prediction.deathCause === 'frost') {
        console.log("   🏠 Use SHELTER action to protect against frost");
      }
    }
    
    return true;
  }

  // Check if predicted timeline should be enforced
  checkPredictionEnforcement() {
    for (const [plantId, predictionData] of this.plantPredictions.entries()) {
      predictionData.actionsRemaining--;
      
      // Find the actual plant in garden
      const plant = this.player.garden.find(p => p.id === plantId);
      if (!plant) {
        // Plant no longer exists, remove prediction
        this.plantPredictions.delete(plantId);
        continue;
      }
      
      // If 48 actions have passed, enforce the prediction
      if (predictionData.actionsRemaining <= 0) {
        const prediction = predictionData.prediction;
        
        // Check if protective actions have been taken to alter the outcome
        let protectionApplied = false;
        
        if (!prediction.alive) {
          // Check if protective actions were applied during the danger period
          if (prediction.deathCause === 'drought' && predictionData.protectiveActions.has('water')) {
            protectionApplied = true;
          } else if (prediction.deathCause === 'frost' && predictionData.protectiveActions.has('shelter')) {
            protectionApplied = true;
          }
        }
        
        if (!protectionApplied && !prediction.alive) {
          // Enforce the death prediction
          plant.state = 'dead';
          console.log(`\n⚰️ PROPHECY FULFILLED: ${plant.name} died from ${prediction.deathCause} as foreseen by Green Tea!`);
        } else if (protectionApplied) {
          console.log(`\n🛡️ FATE CHANGED: ${plant.name} survived due to protective actions taken after the Green Tea vision!`);
        }
        
        // Remove the prediction as it's been enforced
        this.plantPredictions.delete(plantId);
      }
    }
  }

  // Track protective actions for timeline alteration
  trackProtectiveAction(plant, actionType) {
    const predictionData = this.plantPredictions.get(plant.id);
    if (predictionData) {
      predictionData.protectiveActions.add(actionType);
      console.log(`🛡️ Protective action (${actionType}) recorded for timeline alteration.`);
    }
  }

  // simulate future for a specific plant (for Green Tea)
  simulatePlantFuture(plant, actionsToSimulate) {
    // Create a deep copy of the game state for simulation
    const originalSeasonIndex = this.seasonIndex;
    const originalCurrentSeason = this.currentSeason;
    const originalActionsLeft = this.player.actionsLeft;
    
    // Create a copy of the plant with the same state and properties
    const plantCopy = JSON.parse(JSON.stringify({
      state: plant.state,
      stateProgress: plant.stateProgress || 0,
      age: plant.age || 0,
      lifespan: plant.lifespan,
      resourcesThisSeason: Array.from(plant.resourcesThisSeason || []),
      activeConditions: { ...plant.activeConditions },
      _seasonCounter: plant._seasonCounter || 0,
      _transitionThreshold: plant._transitionThreshold,
      _deadCounter: plant._deadCounter || 0
    }));
    
    // Recreate the plant object with definition
    const simulatedPlant = this.createCard(plant.definition.id, plantCopy.state);
    Object.assign(simulatedPlant, plantCopy);
    simulatedPlant.resourcesThisSeason = new Set(plantCopy.resourcesThisSeason);
    
    let simActionsLeft = originalActionsLeft;
    let simSeasonIndex = originalSeasonIndex;
    let simCurrentSeason = originalCurrentSeason;
    let deathCause = null;
    let deathSeason = null;
    let deathAction = null;
    
    for (let action = 0; action < actionsToSimulate; action++) {
      // If no actions left, advance season
      if (simActionsLeft === 0) {
        // End season processing for the plant
        this.simulateEndSeasonProcessing(simulatedPlant, simCurrentSeason);
        
        // Advance season
        simSeasonIndex = (simSeasonIndex + 1) % this.seasons.length;
        simCurrentSeason = this.seasons[simSeasonIndex];
        simActionsLeft = this.actionsPerSeason;
      }
      
      // Simulate weather event
      const originalSeason = this.currentSeason;
      this.currentSeason = simCurrentSeason;
      const event = this.pickWeatherEvent();
      this.currentSeason = originalSeason;
      
      // Apply weather to the plant
      this.simulateWeatherOnPlant(simulatedPlant, event, simCurrentSeason);
      
      // Check if plant died
      if (simulatedPlant.state === 'dead' && !deathCause) {
        deathCause = event;
        deathSeason = simCurrentSeason;
        deathAction = action + 1;
        break;
      }
      
      // Tick down active conditions
      simulatedPlant.tickActiveConditions && simulatedPlant.tickActiveConditions();
      
      simActionsLeft--;
    }
    
    // Return the future state
    return {
      alive: simulatedPlant.state !== 'dead',
      finalState: simulatedPlant.state,
      deathCause,
      deathSeason,
      deathAction,
      age: simulatedPlant.age
    };
  }

  // Helper method to simulate weather effects on a single plant
  simulateWeatherOnPlant(plant, event, season) {
    // Find the full event object for the season
    const seasonEvents = this.weather[season];
    const eventObj = seasonEvents.find(e => e.event === event);
    const conditions = (eventObj && eventObj.conditions) ? eventObj.conditions : [];

    const stageDef = plant.definition.states[plant.state];
    if (!stageDef) return;

    // Add/refresh event conditions for 2 actions
    for (const cond of conditions) {
      plant.activeConditions[cond] = 2;
    }

    // Check vulnerabilities first (immediate)
    const vulns = stageDef.vulnerabilities || [];
    for (const v of vulns) {
      if (v.event === event) {
        // IMMUNITY: If plant has 'water' condition, immune to 'drought' vulnerability
        if (event === 'drought' && plant.activeConditions['water']) {
          continue;
        }
        // IMMUNITY: If plant has 'sunlight' condition, immune to 'frost' vulnerability
        if (event === 'frost' && plant.activeConditions['sunlight']) {
          continue;
        }
        // Any vulnerability met should send plant to 'dead' state
        plant.state = "dead";
        return;
      }
    }

    // If event fulfills a needed resource for current stage, record it
    const needs = stageDef.needs || {};
    const reqResources = needs.resources || [];
    for (const cond of Object.keys(plant.activeConditions)) {
      if (reqResources.includes(cond)) {
        plant.resourcesThisSeason.add(cond);
      }
    }
  }

  // Helper method to simulate end-of-season processing for a plant
  simulateEndSeasonProcessing(plant, season) {
    const stageDef = plant.definition.states[plant.state];
    if (!stageDef) return;

    // Age tracking: increment age at the end of winter
    if (!plant._seasonCounter) plant._seasonCounter = 0;
    plant._seasonCounter++;
    if (plant._seasonCounter >= 4) {
      plant._seasonCounter = 0;
      plant.age = (plant.age || 0) + 1;
      // Check lifespan
      if (plant.lifespan && plant.age >= plant.lifespan && plant.state !== 'dead') {
        plant.state = 'dead';
        plant.resetStateProgress && plant.resetStateProgress();
        plant._deadCounter = 0;
        return;
      }
    }

    // Dead state compost logic
    if (plant.state === 'dead') {
      plant._deadCounter = (plant._deadCounter || 0) + 1;
      const deadNeeds = stageDef.needs || {};
      const requiredResources = deadNeeds.resources || [];
      const haveAll = requiredResources.every((r) => plant.resourcesThisSeason && plant.resourcesThisSeason.has(r));
      
      const deadTransitions = stageDef.transitions || [];
      let deadThreshold = 1;
      if (deadTransitions.length > 0) {
        const t = deadTransitions[0];
        deadThreshold = (t.actions.min === t.actions.max) ? t.actions.min : (Math.floor(Math.random() * (t.actions.max - t.actions.min + 1)) + t.actions.min);
      }
      
      if (plant._deadCounter >= deadThreshold && (haveAll || requiredResources.length === 0)) {
        plant.state = 'compost';
        plant._deadCounter = 0;
        plant.resetStateProgress && plant.resetStateProgress();
      }
      plant.resetSeasonResources && plant.resetSeasonResources();
      return;
    }

    const needs = stageDef.needs || {};
    const seasonsAllowed = needs.season || [];
    
    // If this stage can progress in this season:
    if (seasonsAllowed.includes(season)) {
      const requiredResources = needs.resources || [];
      const haveAll = requiredResources.every((r) => plant.resourcesThisSeason.has(r));
      if (haveAll) {
        // Increment state progress
        plant.stateProgress = (plant.stateProgress || 0) + 1;
        // Check transitions from JSON
        const transitions = stageDef.transitions || [];
        if (transitions.length > 0) {
          const t = transitions[0];
          const min = t.actions.min;
          const max = t.actions.max;
          // If min==max, use that; if not, store a random threshold on plant
          if (plant._transitionThreshold === undefined) {
            plant._transitionThreshold = (min === max) ? min : (Math.floor(Math.random() * (max - min + 1)) + min);
          }
          if (plant.stateProgress >= plant._transitionThreshold) {
            plant.state = t.to;
            plant.resetStateProgress && plant.resetStateProgress();
            delete plant._transitionThreshold;
          }
        }
      }
    }
    // Reset resource record for next season
    plant.resetSeasonResources && plant.resetSeasonResources();
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
