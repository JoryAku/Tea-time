// Main engine orchestrator that coordinates all subsystems

const TimeManager = require('./time/TimeManager');
const Timeline = require('./time/Timeline');
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
    
    // Initialize harvest readiness for any mature plants based on current season
    this.player.garden.forEach(card => {
      if (card.state === 'mature') {
        card.harvestReady = (this.getCurrentSeason() === 'spring');
      }
    });
    
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
    
    // Generate comprehensive timeline for 48 actions (4 years)
    const timeline = this.createTimeline(48);
    
    // Display the comprehensive timeline prediction
    this.displayTimelinePrediction(plant, timeline, plantIndex);
    
    // Remove the consumed Green Tea
    this.player.removeCardFromCurrentLocation(teaCard);
    
    return true;
  }

  // Display comprehensive timeline prediction for Green Tea consumption
  displayTimelinePrediction(plant, timeline, plantIndex) {
    console.log('\n🔮 === 4-YEAR FUTURE TIMELINE ===');
    console.log(`Plant: ${plant.name} [${plant.state}] (Garden index: ${plantIndex})`);
    console.log('Time simulated: 48 actions (4 years)');
    console.log('Timeline locked with probabilistic weather + vulnerability outcomes');
    
    // Get plant-specific data from timeline using the same ID generation as Timeline class
    const plantId = timeline.getPlantId(plant, plantIndex);
    
    // Get death predictions
    const deathPredictions = timeline.getDeathPredictions();
    const plantDeath = deathPredictions.find(death => death.plantId === plantId);
    
    if (plantDeath) {
      console.log('\n💀 OUTCOME: This plant will DIE!');
      console.log(`   Death Action: ${plantDeath.deathAction} (${plantDeath.season})`);
      console.log(`   Exact Cause: ${plantDeath.cause}`);
      
      // Show the exact weather event that causes death
      const deathEvent = timeline.getWeatherAtAction(plantDeath.deathAction);
      if (deathEvent) {
        console.log(`   Death Event: ${deathEvent.weather} in ${deathEvent.season}`);
        console.log(`   Conditions: ${deathEvent.conditions ? deathEvent.conditions.join(', ') : 'none'}`);
      }
      
      console.log('\n💡 PROTECTION OPTIONS:');
      if (plantDeath.cause === 'drought') {
        console.log('   → Apply WATER action before the drought');
        console.log('   → Water protection lasts 6 actions');
        console.log(`   → Apply by action ${Math.max(1, plantDeath.deathAction - 6)} to be safe`);
      } else if (plantDeath.cause === 'frost') {
        console.log('   → Apply SHELTER action before the frost');
        console.log('   → Shelter protection lasts 6 actions');
        console.log(`   → Apply by action ${Math.max(1, plantDeath.deathAction - 6)} to be safe`);
      } else {
        console.log(`   → No known protection against ${plantDeath.cause}`);
      }
    } else {
      console.log('\n✨ OUTCOME: This plant will SURVIVE the next 4 years!');
      console.log('   No fatal weather events will affect this plant');
    }
    
    // Show timeline summary by seasons/years
    console.log('\n📅 TIMELINE SUMMARY:');
    this._displayTimelineWeatherSummary(timeline);
    
    console.log('\n🔄 INTERVENTION SYSTEM:');
    console.log('   If you apply protective actions in the present, this timeline');
    console.log('   will be regenerated to show the new outcome.');
    console.log('   Weather events and history remain the same except for the');
    console.log('   effect of your intervention.');
    
    console.log('\n⚠️  This prediction is now LOCKED and will occur unless you intervene!');
    console.log('========================================\n');
  }

  // Helper method to display weather summary organized by years and seasons
  _displayTimelineWeatherSummary(timeline) {
    let eventIndex = 0;
    const currentSeason = this.getCurrentSeason();
    const actionsPerSeason = this.timeManager.getActionsPerSeason();
    let remainingActionsInCurrentSeason = this.player.actionsLeft;
    
    for (let year = 1; year <= 4; year++) {
      console.log(`\n   Year ${year}:`);
      
      // Start with current season in year 1, then cycle through seasons
      const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
      let startSeasonIndex = year === 1 ? seasonOrder.indexOf(currentSeason) : 0;
      
      for (let i = 0; i < 4; i++) {
        const seasonIndex = (startSeasonIndex + i) % 4;
        const season = seasonOrder[seasonIndex];
        const seasonEvents = [];
        let hasDeathEvent = false;
        
        // Determine how many actions this season should have
        const actionsThisSeason = (year === 1 && i === 0) ? remainingActionsInCurrentSeason : actionsPerSeason;
        
        // Collect events for this season
        for (let j = 0; j < actionsThisSeason && eventIndex < timeline.events.length; j++) {
          const event = timeline.events[eventIndex];
          seasonEvents.push(event.weather);
          
          // Check if this is a death event
          const deathPredictions = timeline.getDeathPredictions();
          if (deathPredictions.some(death => death.deathAction === eventIndex + 1)) {
            hasDeathEvent = true;
          }
          
          eventIndex++;
        }
        
        if (seasonEvents.length > 0) {
          let seasonLine = `     ${season}: ${seasonEvents.join(', ')}`;
          if (hasDeathEvent) {
            seasonLine += ' ⚠️  DEATH EVENT!';
          }
          console.log(seasonLine);
        }
      }
    }
  }

  // Display the future prediction to the player (kept for backward compatibility)
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
    
    // FIRST PASS: Determine if plant will survive or die and when
    const survivalOutcome = this.determinePlantSurvivalOutcome(plantCard, actionsToSimulate);
    
    // Generate weather forecast that ensures the survival outcome
    const weatherForecast = this.generateOutcomeDrivenWeatherForecast(
      plantCard, 
      actionsToSimulate, 
      survivalOutcome
    );
    
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
      
      // Use forecasted weather event instead of random
      const weatherEvent = weatherForecast[action - 1];
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
      predictionKey: plantKey,
      weatherForecast: weatherForecast // Add this for testing purposes
    };
  }

  // Helper method to get next season in cycle
  getNextSeason(currentSeason) {
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentIndex = seasons.indexOf(currentSeason);
    return seasons[(currentIndex + 1) % seasons.length];
  }

  // Determine whether a plant should survive or die during prediction
  determinePlantSurvivalOutcome(plantCard, actionsToSimulate) {
    // Use deterministic but varied logic to decide survival
    // This ensures consistent outcomes for the same plant state
    const plantStateHash = this.calculatePlantStateHash(plantCard);
    const survivalRoll = (plantStateHash % 100);
    
    // Base survival chance on plant maturity and vulnerabilities
    const stageDef = plantCard.definition.states[plantCard.state];
    const vulnerabilities = (stageDef && stageDef.vulnerabilities) ? stageDef.vulnerabilities : [];
    
    // Check if plant has active protections against its vulnerabilities
    const activeProtections = plantCard.activeConditions || {};
    let protectedVulnerabilities = 0;
    
    vulnerabilities.forEach(vuln => {
      if (vuln.event === 'drought' && activeProtections['water']) {
        protectedVulnerabilities++;
      } else if (vuln.event === 'frost' && activeProtections['sunlight']) {
        protectedVulnerabilities++;
      }
    });
    
    // Calculate effective vulnerability count (subtract protected ones)
    const effectiveVulnerabilityCount = Math.max(0, vulnerabilities.length - protectedVulnerabilities);
    
    // Calculate survival chance (more vulnerable plants have lower survival rates)
    let survivalChance = 85; // Base 85% survival rate (increased from 75%)
    survivalChance -= (effectiveVulnerabilityCount * 10); // -10% per unprotected vulnerability
    
    // Bonus for having protections
    if (protectedVulnerabilities > 0) {
      survivalChance += protectedVulnerabilities * 15; // +15% per protected vulnerability
    }
    
    // Adjust for plant age if it has lifespan
    if (plantCard.lifespan) {
      const currentAge = plantCard.age || 0;
      const ageRatio = currentAge / plantCard.lifespan;
      if (ageRatio > 0.8) {
        survivalChance -= 20; // Reduced from 30%
      }
    }
    
    // Ensure survival chance is within reasonable bounds
    survivalChance = Math.max(30, Math.min(95, survivalChance)); // Adjusted bounds
    
    const willSurvive = survivalRoll < survivalChance;
    let deathAction = null;
    
    if (!willSurvive) {
      deathAction = this.calculateDeathAction(plantCard, actionsToSimulate, plantStateHash);
      // If death action is null (due to long-lasting protection), plant survives
      if (deathAction === null) {
        return {
          willSurvive: true,
          deathAction: null,
          protectedVulnerabilities: protectedVulnerabilities,
          effectiveVulnerabilities: effectiveVulnerabilityCount
        };
      }
    }
    
    return {
      willSurvive: willSurvive,
      deathAction: deathAction,
      protectedVulnerabilities: protectedVulnerabilities,
      effectiveVulnerabilities: effectiveVulnerabilityCount
    };
  }

  // Calculate a consistent hash for plant state
  calculatePlantStateHash(plantCard) {
    let hash = 0;
    const stateString = `${plantCard.definition.id}_${plantCard.state}_${plantCard.age || 0}_${plantCard.stateProgress || 0}`;
    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Calculate when the plant should die (if it's destined to die)
  calculateDeathAction(plantCard, actionsToSimulate, plantStateHash) {
    // Check if plant has active protections
    const activeProtections = plantCard.activeConditions || {};
    let protectionExpiry = 0;
    
    // Find the longest lasting protection
    Object.values(activeProtections).forEach(duration => {
      if (duration > protectionExpiry) {
        protectionExpiry = duration;
      }
    });
    
    // Death should occur after protections expire
    const minDeathAction = Math.max(
      protectionExpiry + 1, // At least 1 action after protection expires
      Math.floor(actionsToSimulate * 0.6)
    );
    const maxDeathAction = Math.floor(actionsToSimulate * 0.95);
    
    // If protection lasts too long, plant survives
    if (minDeathAction >= maxDeathAction) {
      return null; // Plant survives
    }
    
    const deathRange = maxDeathAction - minDeathAction;
    
    return minDeathAction + (plantStateHash % deathRange);
  }

  // Generate weather forecast that ensures the desired survival outcome
  generateOutcomeDrivenWeatherForecast(plantCard, actionsToSimulate, survivalOutcome) {
    const forecast = [];
    const stageDef = plantCard.definition.states[plantCard.state];
    const vulnerabilities = (stageDef && stageDef.vulnerabilities) ? stageDef.vulnerabilities : [];
    
    // Get all possible vulnerable events for this plant
    const vulnerableEvents = vulnerabilities.map(v => v.event);
    
    for (let action = 1; action <= actionsToSimulate; action++) {
      // Determine season for this action
      const season = this.getSeasonForAction(action);
      const seasonWeather = this.weatherData[season];
      
      // Filter weather events based on survival outcome
      let availableEvents;
      
      if (survivalOutcome.willSurvive) {
        // ALIVE CASE: Exclude vulnerability-triggering events
        availableEvents = seasonWeather.filter(weather => !vulnerableEvents.includes(weather.event));
      } else {
        // DEAD CASE: Include vulnerability event at the death action
        if (action === survivalOutcome.deathAction) {
          // At death action, choose a vulnerability event that exists in this season
          const seasonVulnerableEvents = seasonWeather.filter(weather => vulnerableEvents.includes(weather.event));
          if (seasonVulnerableEvents.length > 0) {
            // Pick the first vulnerable event for this season
            availableEvents = [seasonVulnerableEvents[0]];
          } else {
            // No vulnerable events in this season, use normal events (plant won't die from non-vulnerable events)
            availableEvents = seasonWeather.filter(weather => !vulnerableEvents.includes(weather.event));
          }
        } else {
          // Before death action, exclude vulnerability events (let plant live until the designated death)
          availableEvents = seasonWeather.filter(weather => !vulnerableEvents.includes(weather.event));
        }
      }
      
      // If no events available (shouldn't happen), fall back to all season events
      if (availableEvents.length === 0) {
        availableEvents = seasonWeather;
      }
      
      // Select event using weighted random from available events
      const selectedEvent = this.selectWeatherFromAvailable(availableEvents);
      forecast.push(selectedEvent);
    }
    
    return forecast;
  }

  // Get season for a given action number
  getSeasonForAction(actionNumber) {
    const currentSeason = this.getCurrentSeason();
    const actionsPerSeason = this.timeManager.getActionsPerSeason();
    const currentSeasonActionsLeft = this.player.actionsLeft;
    
    // Calculate how many seasons ahead this action is
    const actionsUntilNextSeason = currentSeasonActionsLeft;
    
    if (actionNumber <= actionsUntilNextSeason) {
      return currentSeason;
    }
    
    const actionsAfterCurrentSeason = actionNumber - actionsUntilNextSeason;
    const seasonsAhead = Math.floor((actionsAfterCurrentSeason - 1) / actionsPerSeason) + 1;
    
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentIndex = seasons.indexOf(currentSeason);
    const targetIndex = (currentIndex + seasonsAhead) % seasons.length;
    
    return seasons[targetIndex];
  }

  // Select weather event from available events using their probability weights
  selectWeatherFromAvailable(availableEvents) {
    if (availableEvents.length === 1) {
      return availableEvents[0].event;
    }
    
    // Calculate total weight for available events
    const totalWeight = availableEvents.reduce((sum, event) => sum + event.pct, 0);
    
    // Normalize probabilities and select
    const randomValue = Math.random() * totalWeight;
    let accumulator = 0;
    
    for (const event of availableEvents) {
      accumulator += event.pct;
      if (randomValue <= accumulator) {
        return event.event;
      }
    }
    
    // Fallback to last event
    return availableEvents[availableEvents.length - 1].event;
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

  // === Oolong Tea Future Harvest System ===

  /**
   * Simulate future harvest for Oolong Tea effect
   * @param {Object} plantCard - Plant to simulate future harvest for
   * @returns {Object} Harvest simulation result
   */
  simulateFutureHarvest(plantCard) {
    console.log('\n🫖 === OOLONG TEA: FUTURE HARVEST SIMULATION ===');
    console.log(`Simulating future harvest timeline for: ${plantCard.name} [${plantCard.state}]`);
    
    // Check if plant is already harvestable
    if (plantCard.state === 'mature' && plantCard.harvestReady) {
      console.log('🌿 Plant is already ready to harvest in the present!');
      console.log('⚠️  No future simulation needed - you can harvest now.');
      return { 
        success: false, 
        message: 'Plant is already harvestable in present',
        canHarvestNow: true 
      };
    }

    // Create timeline to simulate plant's future
    const timeline = this.createTimeline(48); // 4 years simulation
    const plantIndex = this.player.garden.indexOf(plantCard);
    const plantId = timeline.getPlantId(plantCard, plantIndex);
    
    // Check if plant will survive
    const deathPredictions = timeline.getDeathPredictions();
    const plantDeath = deathPredictions.find(death => death.plantId === plantId);
    
    // Find the next harvest opportunity
    const harvestOpportunity = this._findNextHarvestOpportunity(plantCard, timeline, plantId);
    
    if (!harvestOpportunity) {
      console.log('💀 HARVEST FAILED: No future harvest opportunity found.');
      if (plantDeath) {
        console.log(`   Reason: Plant will die on action ${plantDeath.deathAction} from ${plantDeath.cause}`);
        console.log(`   Death occurs in ${plantDeath.season} before reaching harvestable state`);
        this._displayHarvestProtectionAdvice(plantDeath);
      } else {
        console.log('   Reason: Plant never reaches harvestable maturity within 4 years');
      }
      return { 
        success: false, 
        message: 'No harvest opportunity found',
        deathInfo: plantDeath 
      };
    }
    
    // Check if plant survives until harvest
    if (plantDeath && plantDeath.deathAction <= harvestOpportunity.action) {
      console.log('💀 HARVEST FAILED: Plant dies before harvest opportunity.');
      console.log(`   Plant death: Action ${plantDeath.deathAction} (${plantDeath.season}) from ${plantDeath.cause}`);
      console.log(`   Harvest would be: Action ${harvestOpportunity.action} (${harvestOpportunity.season})`);
      this._displayHarvestProtectionAdvice(plantDeath);
      return { 
        success: false, 
        message: 'Plant dies before harvest',
        deathInfo: plantDeath,
        harvestInfo: harvestOpportunity 
      };
    }
    
    // SUCCESS: Plant will survive until harvest
    console.log('✨ HARVEST SUCCESS: Future harvest possible!');
    console.log(`   Harvest opportunity: Action ${harvestOpportunity.action} (${harvestOpportunity.season})`);
    console.log(`   Plant state at harvest: ${harvestOpportunity.plantState}`);
    
    // Calculate time until harvest
    const yearsUntilHarvest = Math.ceil(harvestOpportunity.action / 12);
    const seasonsUntilHarvest = Math.ceil(harvestOpportunity.action / 3);
    console.log(`   Time until harvest: ~${yearsUntilHarvest} year(s), ${seasonsUntilHarvest} season(s)`);
    
    // Show timeline summary leading to harvest
    this._displayHarvestTimelineSummary(timeline, harvestOpportunity.action);
    
    console.log('\n🍃 PULLING FUTURE HARVEST INTO PRESENT...');
    
    // Add harvested leaves to kitchen
    const harvestedLeaves = this.createCard("tea_leaf_raw");
    this.player.addCardToLocation(harvestedLeaves, "kitchen");
    
    console.log('🌿 Added Tea Leaf (Raw) to kitchen from future harvest!');
    console.log('🔮 The timeline remains unchanged - only the harvest was pulled forward.');
    console.log('===============================================\n');
    
    return { 
      success: true, 
      message: 'Future harvest successful',
      harvestInfo: harvestOpportunity,
      deathInfo: plantDeath 
    };
  }

  /**
   * Find the next opportunity when the plant would be ready for harvest
   * @private
   */
  _findNextHarvestOpportunity(plantCard, timeline, plantId) {
    // Look through timeline to find when plant becomes mature and harvestReady
    for (let action = 1; action <= timeline.events.length; action++) {
      const plantState = timeline.getPlantStateAtAction(plantId, action);
      const weatherEvent = timeline.getWeatherAtAction(action);
      
      if (plantState && plantState.state === 'mature' && weatherEvent && weatherEvent.season === 'spring') {
        return {
          action: action,
          season: weatherEvent.season,
          plantState: plantState.state,
          weather: weatherEvent.weather
        };
      }
    }
    
    return null;
  }

  /**
   * Display protection advice for failed harvests
   * @private
   */
  _displayHarvestProtectionAdvice(plantDeath) {
    console.log('\n💡 PROTECTION OPTIONS TO ENABLE HARVEST:');
    if (plantDeath.cause === 'drought') {
      console.log('   → Apply WATER action before the drought');
      console.log('   → Water protection lasts 6 actions');
      console.log(`   → Apply by action ${Math.max(1, plantDeath.deathAction - 6)} to be safe`);
    } else if (plantDeath.cause === 'frost') {
      console.log('   → Apply SHELTER action before the frost');
      console.log('   → Shelter protection lasts 6 actions');
      console.log(`   → Apply by action ${Math.max(1, plantDeath.deathAction - 6)} to be safe`);
    } else {
      console.log(`   → No known protection against ${plantDeath.cause}`);
    }
    console.log('   → With protection, try Oolong Tea again for new prediction');
  }

  /**
   * Display timeline summary up to harvest point
   * @private
   */
  _displayHarvestTimelineSummary(timeline, harvestAction) {
    console.log('\n📅 TIMELINE TO HARVEST:');
    let eventIndex = 0;
    const currentSeason = this.getCurrentSeason();
    const actionsPerSeason = this.timeManager.getActionsPerSeason();
    let remainingActionsInCurrentSeason = this.player.actionsLeft;
    
    // Show timeline up to harvest action
    const maxActionsToShow = Math.min(harvestAction, 24); // Show up to 2 years
    
    for (let year = 1; year <= 2 && eventIndex < maxActionsToShow; year++) {
      console.log(`\n   Year ${year}:`);
      
      const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
      let startSeasonIndex = year === 1 ? seasonOrder.indexOf(currentSeason) : 0;
      
      for (let i = 0; i < 4 && eventIndex < maxActionsToShow; i++) {
        const seasonIndex = (startSeasonIndex + i) % 4;
        const season = seasonOrder[seasonIndex];
        const seasonEvents = [];
        let hasHarvestEvent = false;
        
        const actionsThisSeason = (year === 1 && i === 0) ? remainingActionsInCurrentSeason : actionsPerSeason;
        
        for (let j = 0; j < actionsThisSeason && eventIndex < maxActionsToShow && eventIndex < timeline.events.length; j++) {
          const event = timeline.events[eventIndex];
          if (event) {
            seasonEvents.push(event.weather);
            
            if (eventIndex + 1 === harvestAction) {
              hasHarvestEvent = true;
            }
          }
          eventIndex++;
        }
        
        if (seasonEvents.length > 0) {
          let seasonLine = `     ${season}: ${seasonEvents.join(', ')}`;
          if (hasHarvestEvent) {
            seasonLine += ' 🌿 HARVEST READY!';
          }
          console.log(seasonLine);
        }
      }
    }
    
    if (harvestAction > maxActionsToShow) {
      console.log(`   ... (${harvestAction - maxActionsToShow} more actions until harvest)`);
    }
  }

  /**
   * Consume Oolong Tea with plant selection for future harvest
   * @param {Object} teaCard - The Oolong Tea card being consumed
   * @param {number} plantIndex - Index of plant in garden to harvest from future
   * @returns {boolean} Whether consumption was successful
   */
  consumeOolongTeaWithPlantSelection(teaCard, plantIndex) {
    const selectedPlant = this.player.garden[plantIndex];
    if (!selectedPlant) {
      console.log('❌ No plant found at that garden index.');
      return false;
    }

    console.log(`🫖 Consuming ${teaCard.name} to harvest future leaves from ${selectedPlant.name}...`);
    
    // Simulate future harvest
    const harvestResult = this.simulateFutureHarvest(selectedPlant);
    
    if (harvestResult.success) {
      // Remove the consumed tea
      this.player.removeCardFromCurrentLocation(teaCard);
      console.log(`🫖 ${teaCard.name} consumed successfully.`);
      return true;
    } else {
      console.log(`❌ Future harvest failed: ${harvestResult.message}`);
      // Don't consume the tea if harvest failed
      return false;
    }
  }

  // === Timeline System ===

  /**
   * Apply a protective action to a plant and regenerate timeline showing the new outcome
   * @param {number} plantIndex - Index of plant in garden
   * @param {string} actionType - Type of protection ('water' or 'shelter')
   * @returns {Object} Result of the intervention
   */
  applyProtectiveIntervention(plantIndex, actionType) {
    const plant = this.player.garden[plantIndex];
    if (!plant) {
      return { success: false, message: 'No plant found at that index' };
    }

    // Apply the protective action immediately
    const actionDef = plant.getActions()[actionType];
    if (!actionDef) {
      return { success: false, message: `${actionType} action not available for this plant` };
    }

    // Apply protection condition
    const condition = actionDef.condition;
    const duration = actionDef.duration || 6;
    plant.activeConditions = plant.activeConditions || {};
    plant.activeConditions[condition] = duration;

    console.log(`🛡️ Applied ${condition} protection to ${plant.name} for ${duration} actions.`);

    // Regenerate timeline with the new protection
    const newTimeline = this.createTimeline(48);
    
    console.log('\n🔄 === TIMELINE REGENERATED WITH INTERVENTION ===');
    this.displayTimelinePrediction(plant, newTimeline, plantIndex);

    return { 
      success: true, 
      message: `Protection applied successfully`,
      timeline: newTimeline
    };
  }

  /**
   * Create a comprehensive timeline simulation for all garden plants
   * @param {number} actionsToSimulate - Number of actions to simulate (default 48 = 4 years)
   * @returns {Timeline} Timeline object with locked events and plant outcomes
   */
  createTimeline(actionsToSimulate = 48) {
    const timeline = new Timeline(
      this,
      this.getCurrentSeason(),
      this.player.actionsLeft
    );
    
    // Generate timeline for all plants in garden
    const timelineData = timeline.generateTimeline(this.player.garden, actionsToSimulate);
    
    return timeline;
  }

  /**
   * Peek at weather events for the next N actions using Timeline system
   * @param {number} n - Number of actions to peek ahead (default 1)
   * @returns {Array} Array of weather events with seasonal context
   */
  peekTimelineWeather(n = 1) {
    const timeline = this.createTimeline(n);
    const events = [];
    
    for (let i = 1; i <= n; i++) {
      const event = timeline.getWeatherAtAction(i);
      if (event) {
        events.push({
          action: i,
          season: event.season,
          weather: event.weather,
          conditions: event.conditions
        });
      }
    }
    
    return events;
  }

  /**
   * Get a detailed forecast of plant states and weather for visualization
   * @param {number} actionsToSimulate - How far to look ahead
   * @returns {Object} Detailed forecast data
   */
  getDetailedForecast(actionsToSimulate = 12) {
    const timeline = this.createTimeline(actionsToSimulate);
    
    return {
      timeline: timeline,
      weather: timeline.events.map(event => ({
        action: event.action,
        season: event.season,
        weather: event.weather,
        conditions: event.conditions
      })),
      plantOutcomes: timeline.plantOutcomes,
      deathPredictions: timeline.getDeathPredictions(),
      totalActions: actionsToSimulate,
      isLocked: timeline.isLocked
    };
  }
}

module.exports = TeaTimeEngine;