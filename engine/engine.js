// Main engine orchestrator that coordinates all subsystems

const TimeManager = require('./time/TimeManager');
const WeatherSystem = require('./weather/WeatherSystem');
const PlantManager = require('./plants/PlantManager');
const ActionManager = require('./actions/ActionManager');
const Player = require('./Player');
const Card = require('./Card');

class TeaTimeEngine {
  constructor(cardsData, weatherData) {
    this.cardsData = cardsData;
    this.weatherData = weatherData;
    
    // Initialize subsystems
    this.timeManager = new TimeManager();
    this.weatherSystem = new WeatherSystem(weatherData);
    this.plantManager = new PlantManager(cardsData);
    this.actionManager = new ActionManager(cardsData);
    
    // Initialize player
    this.player = new Player();
    this.player.actionsLeft = this.timeManager.getActionsPerSeason();
    
    // Initialize starting deck
    this.initStartingDeck();
  }

  // Create a Card instance from an id in data/Cards.json
  createCard(cardId, state = null) {
    const all = [...this.cardsData.plants, ...this.cardsData.ingredients, ...this.cardsData.teas];
    const def = all.find((c) => c.id === cardId);
    if (!def) throw new Error(`Card definition not found: ${cardId}`);
    return new Card(def, state);
  }

  initStartingDeck() {
    // Start with only one tea_plant seedling in the garden
    const startSeedling = this.createCard("tea_plant", "seedling");
    this.player.garden.push(startSeedling);
    const startGreenTea = this.createCard("tea_leaf_green");
    this.player.kitchen.push(startGreenTea);
    console.log("🌱 Starting garden with a tea plant seedling.");
    console.log("🫖 Starting kitchen with a green tea leaf.");
  }

  // Get current game state info
  getCurrentSeason() {
    return this.timeManager.getCurrentSeason();
  }

  getActionsPerSeason() {
    return this.timeManager.getActionsPerSeason();
  }

  // Wait action: uses up one action, triggers weather
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

  // Trigger weather event after each action
  triggerWeather() {
    const event = this.weatherSystem.pickWeatherEvent(this.getCurrentSeason());
    console.log(`\n🌦 Weather event: ${event}`);
    this.applyWeather(event);
    this.progressOxidation();
    this.checkTeaProcessingFailures(event);
    // Progress locked predictions from Green Tea
    this.progressLockedPredictions();
    // After weather, tick down all active conditions on all plants
    this.player.garden.forEach(card => card.tickActiveConditions && card.tickActiveConditions());
  }

  // Apply weather event to all garden plants
  applyWeather(event) {
    const conditions = this.weatherSystem.getEventConditions(this.getCurrentSeason(), event);
    
    // Apply weather to each plant in garden
    this.player.garden.forEach((card) => {
      this.plantManager.applyWeatherToPlant(card, event, conditions);
    });
  }

  // Progress oxidation on tea leaves in kitchen
  progressOxidation() {
    this.player.kitchen.forEach((card, idx) => {
      const result = this.actionManager.processTeaOxidation(card);
      if (result === 'overoxidized') {
        const deadCard = this.createCard('dead_leaves');
        this.player.kitchen[idx] = deadCard;
        console.log(`💀 ${card.name} overoxidized and became dead leaves.`);
      }
    });
  }

  // Check for tea processing failures based on weather
  checkTeaProcessingFailures(event) {
    this.player.kitchen.forEach((card, idx) => {
      const result = this.actionManager.checkTeaProcessingFailures(card, event);
      if (result === 'failed' || result === 'burned') {
        const deadCard = this.createCard('dead_leaves');
        this.player.kitchen[idx] = deadCard;
        console.log(`💀 ${card.name} ${result === 'burned' ? 'burned' : 'rotted'} due to ${event} and became dead leaves.`);
      }
    });
  }

  // Process season end
  endSeasonProcessing() {
    console.log("\n--- Season end: checking plant progression ---");
    const currentSeason = this.getCurrentSeason();
    
    this.player.garden.forEach((card, idx) => {
      // Handle compost planting first
      if (card.state === 'compost' && card.justPlantedSeed) {
        const newSeedling = this.plantManager.processCompostPlanting(card, this.player, card.definition.id);
        if (newSeedling) {
          this.player.garden[idx] = newSeedling;
          console.log(`🌱 A seed was planted in compost and is now a seedling.`);
          return;
        }
      }

      // Process normal plant progression
      this.plantManager.processPlantProgression(card, currentSeason);
      
      // Handle fertilizer creation from dead plants
      if (card.state === 'compost' && card.definition.states.dead && 
          card.definition.states.dead.actions && card.definition.states.dead.actions.compost) {
        this.player.addCardToLocation(this.createCard('fertilizer_token'), 'shed');
        console.log(`🌱 ${card.name} decomposed into compost.`);
      }
    });

    // Advance season
    const newSeason = this.timeManager.advanceSeason();
    this.player.actionsLeft = this.timeManager.getActionsPerSeason();
    
    // Apply seasonal weather effect at start of new season
    const seasonalWeather = this.weatherSystem.getRandomSeasonalWeather(newSeason);
    if (seasonalWeather && seasonalWeather.conditions) {
      this.player.garden.forEach(card => {
        seasonalWeather.conditions.forEach(cond => {
          card.activeConditions[cond] = 2;
        });
      });
      console.log(`\n🌱 Seasonal effect: ${seasonalWeather.event} (${seasonalWeather.conditions.join(", ")}) applied to all plants.`);
    }
    
    console.log(`\n>>> ${newSeason.toUpperCase()} begins.`);
  }

  // Delegate plant-related actions to ActionManager
  harvestSeedFromGarden(idx) {
    return this.actionManager.harvestSeedFromGarden(this.player, idx, this.createCard.bind(this));
  }

  plantSeedFromZone(zone, idx) {
    return this.actionManager.plantSeedFromZone(this.player, zone, idx, this.createCard.bind(this));
  }

  // Handle Green Tea consumption with plant selection
  consumeGreenTeaWithPlantSelection(teaCard, plantIndex) {
    const plant = this.player.garden[plantIndex];
    if (!plant) {
      console.log('❌ No plant at that garden index.');
      return false;
    }

    console.log(`🔮 Drinking Green Tea to see the future of ${plant.name} [${plant.state}]...`);
    
    // Simulate 48 actions (4 years) into the future
    const prediction = this.simulatePlantFuture(plant, 48);
    
    // Display the prediction
    this.displayFuturePrediction(plant, prediction);
    
    // Remove the consumed Green Tea
    this.player.removeCardFromCurrentLocation(teaCard);
    
    return true;
  }

  // Display the future prediction to the player
  displayFuturePrediction(plant, prediction) {
    console.log('\n🔮 === FUTURE VISION ===');
    console.log(`Plant: ${plant.name} [${plant.state}]`);
    console.log('Time simulated: 48 actions (4 years)');
    
    if (prediction.alive) {
      console.log('✨ PREDICTION: This plant will SURVIVE the next 4 years!');
      console.log(`   Final state: ${prediction.finalState}`);
      if (prediction.finalAge > (plant.age || 0)) {
        console.log(`   Age after 4 years: ${prediction.finalAge} years old`);
      }
    } else {
      const death = prediction.deathInfo;
      const actionInMonths = Math.ceil(death.action / 3); // 3 actions per season ≈ 1 month per action
      const actionInSeasons = Math.ceil(death.action / 3);
      
      console.log('💀 PREDICTION: This plant will DIE!');
      console.log(`   Time: Action ${death.action} (~${actionInMonths} months from now)`);
      console.log(`   Season: ${death.season}`);
      console.log(`   Cause: ${death.cause}`);
      console.log(`   Detail: ${death.description}`);
      console.log('\n💡 PROTECTION ADVICE:');
      
      if (death.cause === 'drought') {
        console.log('   → Use WATER action to protect against drought');
        console.log('   → Water protection lasts 6 actions (6 months)');
      } else if (death.cause === 'frost') {
        console.log('   → Use SHELTER action to protect against frost');
        console.log('   → Shelter protection lasts 6 actions (6 months)');
      } else {
        console.log(`   → No known protection against ${death.cause}`);
      }
    }
    
    console.log('\n⚠️  WARNING: This prediction is now LOCKED.');
    console.log('   If you take no protective action, this outcome WILL occur!');
    console.log('========================\n');
  }

  // Small helper to show a peek (for Green Tea)
  peekWeather(n = 1) {
    console.log("🔎 Peeking at the next weather event(s):");
    for (let i = 0; i < n; i++) {
      console.log("  -", this.weatherSystem.pickWeatherEvent(this.getCurrentSeason()));
    }
  }

  // Future simulation for Green Tea effect (simulates 48 actions = 4 years)
  simulatePlantFuture(plantCard, actionsToSimulate = 48) {
    // Create a deep copy of the plant for simulation
    const Card = require('./Card');
    const simulatedPlant = new Card(plantCard.definition, plantCard.state);
    
    // Copy current state
    simulatedPlant.stateProgress = plantCard.stateProgress || 0;
    simulatedPlant.age = plantCard.age || 0;
    simulatedPlant.lifespan = plantCard.lifespan;
    simulatedPlant._seasonCounter = plantCard._seasonCounter || 0;
    simulatedPlant._transitionThreshold = plantCard._transitionThreshold;
    
    // Track active protections during simulation
    const simulatedProtections = { ...plantCard.activeConditions };
    
    // Track simulation state
    let currentSimSeason = this.getCurrentSeason();
    let seasonActionCounter = this.player.actionsLeft;
    let deathInfo = null;
    
    // Store locked prediction for later enforcement
    if (!this.lockedPredictions) this.lockedPredictions = new Map();
    
    for (let action = 1; action <= actionsToSimulate; action++) {
      // Advance season when actions are used up
      if (seasonActionCounter <= 0) {
        currentSimSeason = this.getNextSeason(currentSimSeason);
        seasonActionCounter = this.timeManager.getActionsPerSeason();
        
        // Reset resource tracking for new season
        simulatedPlant.resetSeasonResources();
        
        // Process plant progression at season end
        this.simulateSeasonEndProgression(simulatedPlant, currentSimSeason);
      }
      
      seasonActionCounter--;
      
      // Tick down protection conditions
      Object.keys(simulatedProtections).forEach(condition => {
        simulatedProtections[condition]--;
        if (simulatedProtections[condition] <= 0) {
          delete simulatedProtections[condition];
        }
      });
      
      // Generate weather event for this action
      const weatherEvent = this.weatherSystem.pickWeatherEvent(currentSimSeason);
      const conditions = this.weatherSystem.getEventConditions(currentSimSeason, weatherEvent);
      
      // Check if plant dies from this weather event
      const vulnerability = this.checkPlantVulnerability(simulatedPlant, weatherEvent, simulatedProtections);
      if (vulnerability.dies) {
        deathInfo = {
          action: action,
          season: currentSimSeason,
          cause: weatherEvent,
          description: vulnerability.description
        };
        break;
      }
      
      // Add resource fulfillment
      const stageDef = simulatedPlant.definition.states[simulatedPlant.state];
      if (stageDef && stageDef.needs && stageDef.needs.resources) {
        conditions.forEach(condition => {
          if (stageDef.needs.resources.includes(condition) || simulatedProtections[condition]) {
            simulatedPlant.resourcesThisSeason.add(condition);
          }
        });
      }
    }
    
    // Store the locked prediction for this plant
    const plantKey = this.storePlantPrediction(plantCard, deathInfo, actionsToSimulate);
    
    return {
      alive: !deathInfo,
      deathInfo: deathInfo,
      finalState: simulatedPlant.state,
      finalAge: simulatedPlant.age,
      predictionKey: plantKey
    };
  }

  // Helper method to get next season in cycle
  getNextSeason(currentSeason) {
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentIndex = seasons.indexOf(currentSeason);
    return seasons[(currentIndex + 1) % seasons.length];
  }

  // Helper to simulate plant progression at season end
  simulateSeasonEndProgression(simulatedPlant, currentSeason) {
    // Age tracking: increment age at the end of winter (1 year = 4 seasons)
    if (!simulatedPlant._seasonCounter) simulatedPlant._seasonCounter = 0;
    simulatedPlant._seasonCounter++;
    if (simulatedPlant._seasonCounter >= 4) {
      simulatedPlant._seasonCounter = 0;
      simulatedPlant.age = (simulatedPlant.age || 0) + 1;
      // Check lifespan
      if (simulatedPlant.lifespan && simulatedPlant.age >= simulatedPlant.lifespan && simulatedPlant.state !== 'dead') {
        simulatedPlant.state = 'dead';
        simulatedPlant.resetStateProgress && simulatedPlant.resetStateProgress();
        return;
      }
    }

    // Normal progression logic (simplified for simulation)
    const stageDef = simulatedPlant.definition.states[simulatedPlant.state];
    if (!stageDef) return;

    const needs = stageDef.needs || {};
    const seasonsAllowed = needs.season || [];
    
    if (seasonsAllowed.includes(currentSeason)) {
      const requiredResources = needs.resources || [];
      const haveAll = requiredResources.every((r) => simulatedPlant.resourcesThisSeason.has(r));
      if (haveAll) {
        simulatedPlant.stateProgress = (simulatedPlant.stateProgress || 0) + 1;
        
        const transitions = stageDef.transitions || [];
        if (transitions.length > 0) {
          const t = transitions[0];
          const min = t.actions.min;
          const max = t.actions.max;
          
          if (simulatedPlant._transitionThreshold === undefined) {
            simulatedPlant._transitionThreshold = (min === max) ? min : (Math.floor(Math.random() * (max - min + 1)) + min);
          }
          
          if (simulatedPlant.stateProgress >= simulatedPlant._transitionThreshold) {
            simulatedPlant.state = t.to;
            simulatedPlant.resetStateProgress && simulatedPlant.resetStateProgress();
            delete simulatedPlant._transitionThreshold;
          }
        }
      }
    }
  }

  // Check if plant would die from weather event (considering protections)
  checkPlantVulnerability(plant, weatherEvent, protections) {
    const stageDef = plant.definition.states[plant.state];
    if (!stageDef || !stageDef.vulnerabilities) {
      return { dies: false };
    }

    for (const vuln of stageDef.vulnerabilities) {
      if (vuln.event === weatherEvent) {
        // Check protections
        if (weatherEvent === 'drought' && protections['water']) {
          return { dies: false, isProtected: true };
        }
        if (weatherEvent === 'frost' && protections['sunlight']) {
          return { dies: false, isProtected: true };
        }
        
        return { 
          dies: true, 
          description: `${plant.name} would die from ${weatherEvent} vulnerability in ${plant.state} stage`
        };
      }
    }
    
    return { dies: false };
  }

  // Store locked prediction for this plant
  storePlantPrediction(plantCard, deathInfo, actionsSimulated) {
    if (!this.lockedPredictions) this.lockedPredictions = new Map();
    
    // Use a simple but more reliable tracking method
    const plantKey = `plant_${this.player.garden.indexOf(plantCard)}`;
    this.lockedPredictions.set(plantKey, {
      plantIndex: this.player.garden.indexOf(plantCard),
      deathInfo: deathInfo,
      actionsSimulated: actionsSimulated,
      currentAction: 0
    });
    
    return plantKey;
  }

  // Check and enforce locked predictions
  checkLockedPrediction(plantCard) {
    if (!this.lockedPredictions) return null;
    
    const plantKey = this.generatePlantKey(plantCard);
    return this.lockedPredictions.get(plantKey);
  }

  // Progress locked predictions and enforce death when predicted
  progressLockedPredictions() {
    if (!this.lockedPredictions) return;
    
    const plantsToRemove = [];
    
    this.lockedPredictions.forEach((prediction, plantKey) => {
      prediction.currentAction++;
      
      // If we've reached the predicted death action, check if plant is still vulnerable
      if (prediction.deathInfo && prediction.currentAction >= prediction.deathInfo.action) {
        // Get the specific plant by its index
        const plant = this.player.garden[prediction.plantIndex];
        
        if (plant) {
          // Check if plant has protective conditions that would prevent the predicted death
          let isProtected = false;
          if (prediction.deathInfo.cause === 'drought' && plant.activeConditions['water']) {
            isProtected = true;
            console.log(`💧 ${plant.name} survived the predicted drought due to water protection!`);
          } else if (prediction.deathInfo.cause === 'frost' && plant.activeConditions['sunlight']) {
            isProtected = true;
            console.log(`☀️ ${plant.name} survived the predicted frost due to shelter protection!`);
          }
          
          if (!isProtected) {
            plant.state = 'dead';
            console.log(`⚰️ LOCKED PREDICTION: ${plant.name} died from ${prediction.deathInfo.cause} as foreseen by Green Tea.`);
          } else {
            console.log(`🛡️ PROTECTION SUCCESSFUL: ${plant.name} was saved from the predicted ${prediction.deathInfo.cause}!`);
          }
        }
        
        // Mark prediction for removal
        plantsToRemove.push(plantKey);
      }
    });
    
    // Remove completed predictions
    plantsToRemove.forEach(key => this.lockedPredictions.delete(key));
  }
}

module.exports = TeaTimeEngine;