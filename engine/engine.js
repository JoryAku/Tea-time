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
    
    // Timeline storage for consistency across tea powers
    this.plantTimelines = new Map(); // Map of plantId -> cached timeline
    this.nextPlantId = 1; // Counter for unique plant IDs
    
    // Weather forecast management for predictions
    this.currentActionNumber = 0; // Track current action in the game
    this.weatherForecastLocked = false; // Whether weather is predetermined
    
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

  // === Plant ID Management ===
  
  /**
   * Assign a unique ID to a plant if it doesn't have one
   * @param {Card} plant - Plant card to assign ID to
   * @returns {string} The assigned plant ID
   */
  assignPlantId(plant) {
    if (!plant.uniqueId) {
      plant.uniqueId = `plant_${this.nextPlantId++}`;
    }
    return plant.uniqueId;
  }

  /**
   * Get or create timeline for a specific plant
   * @param {Card} plant - Plant to get timeline for
   * @param {number} actionsToSimulate - Actions to simulate (default 48)
   * @param {boolean} forceUpdate - Force timeline regeneration
   * @returns {Timeline} Timeline object for the plant
   */
  getOrCreatePlantTimeline(plant, actionsToSimulate = 48, forceUpdate = false) {
    const plantId = this.assignPlantId(plant);
    
    // Check if timeline exists and is still valid
    if (!forceUpdate && this.plantTimelines.has(plantId)) {
      const cachedTimeline = this.plantTimelines.get(plantId);
      // Check if the cached timeline covers enough actions
      if (cachedTimeline.maxActions >= actionsToSimulate) {
        return cachedTimeline;
      }
    }
    
    // Create new timeline
    const timeline = new Timeline(
      this,
      this.getCurrentSeason(),
      this.player.actionsLeft
    );
    
    // Generate timeline for the specific plant (and others for context)
    timeline.generateTimeline(this.player.garden, actionsToSimulate);
    
    // Cache the timeline
    this.plantTimelines.set(plantId, timeline);
    
    return timeline;
  }

  /**
   * Invalidate timeline for a plant (called when plant state changes significantly)
   * @param {Card} plant - Plant whose timeline should be invalidated
   */
  invalidatePlantTimeline(plant) {
    if (plant.uniqueId && this.plantTimelines.has(plant.uniqueId)) {
      this.plantTimelines.delete(plant.uniqueId);
    }
  }

  /**
   * Clear all cached timelines (called when major game state changes)
   */
  clearAllTimelines() {
    this.plantTimelines.clear();
  }

  initStartingDeck() {
    // Start with only one tea_plant seedling in the garden
    const startSeedling = this.createCard("tea_plant", "seedling");
    // Assign unique ID to starting plant
    this.assignPlantId(startSeedling);
    this.player.garden.push(startSeedling);
    const startGreenTea = this.createCard("tea_leaf_green");
    const startOolongTea = this.createCard("tea_leaf_oolong");
    const startBlackTea = this.createCard("tea_leaf_black");
    this.player.kitchen.push(startGreenTea);
    this.player.kitchen.push(startOolongTea);
    this.player.kitchen.push(startBlackTea);
    // Initialize harvest readiness for any mature plants based on current season
    this.player.garden.forEach(card => {
      if (card.state === 'mature') {
        card.harvestReady = (this.getCurrentSeason() === 'spring');
      }
    });
    
    console.log("🌱 Starting garden with a tea plant seedling.");
    console.log("🫖 Starting kitchen with green, oolong, and black tea leaves.");
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
    this.currentActionNumber++;
    const event = this.weatherSystem.pickWeatherEvent(this.getCurrentSeason(), this.currentActionNumber);
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
      
      // Invalidate timeline if plant state changes significantly
      if (card.state === 'dead') {
        this.invalidatePlantTimeline(card);
      }
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
      const originalState = card.state;
      
      // Handle compost planting first
      if (card.state === 'compost' && card.justPlantedSeed) {
        const newSeedling = this.plantManager.processCompostPlanting(card, this.player, card.definition.id);
        if (newSeedling) {
          // Assign ID to new seedling and invalidate old timeline
          this.assignPlantId(newSeedling);
          this.invalidatePlantTimeline(card);
          this.player.garden[idx] = newSeedling;
          console.log(`🌱 A seed was planted in compost and is now a seedling.`);
          return;
        }
      }

      // Process normal plant progression
      this.plantManager.processPlantProgression(card, currentSeason);
      
      // Invalidate timeline if state changed
      if (card.state !== originalState) {
        this.invalidatePlantTimeline(card);
      }
      
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
    
    // Generate predetermined weather forecast for next 48 actions
    if (!this.weatherForecastLocked) {
      const forecast = this.weatherSystem.getPredeterminedForecast(
        this.getCurrentSeason(),
        this.player.actionsLeft,
        48
      );
      this.weatherSystem.setPredeterminedForecast(forecast);
      this.weatherForecastLocked = true;
      console.log('\n🔒 Weather forecast LOCKED for next 48 actions based on Green Tea vision.');
    }
    
    // Ensure plant has unique ID and get/create consistent timeline
    this.assignPlantId(plant);
    
    // Force timeline regeneration if plant has active protection conditions
    // to ensure the updated protection is properly reflected
    const hasActiveProtections = plant.activeConditions && Object.keys(plant.activeConditions).length > 0;
    const timeline = this.getOrCreatePlantTimeline(plant, 48, hasActiveProtections);
    
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
    // Generate predetermined weather forecast if not already done
    if (!this.weatherForecastLocked) {
      const forecast = this.weatherSystem.getPredeterminedForecast(
        this.getCurrentSeason(),
        this.player.actionsLeft,
        actionsToSimulate
      );
      this.weatherSystem.setPredeterminedForecast(forecast);
      this.weatherForecastLocked = true;
    }
    
    // Create timeline for the plant
    const timeline = this.createTimeline(actionsToSimulate);
    
    // Get plant ID and check for death predictions
    const plantIndex = this.player.garden.indexOf(plantCard);
    const plantId = timeline.getPlantId(plantCard, plantIndex);
    const deathPredictions = timeline.getDeathPredictions();
    const plantDeath = deathPredictions.find(death => death.plantId === plantId);
    
    if (plantDeath) {
      return {
        alive: false,
        deathInfo: {
          action: plantDeath.deathAction,
          season: plantDeath.season,
          cause: plantDeath.cause,
          description: `Plant will die from ${plantDeath.cause} vulnerability`
        },
        finalState: 'dead',
        finalAge: plantCard.age || 0,
        weatherForecast: this.weatherSystem.predeterminedForecast.slice(0, actionsToSimulate)
      };
    } else {
      return {
        alive: true,
        deathInfo: null,
        finalState: plantCard.state, // This could be updated to show final state from timeline
        finalAge: plantCard.age || 0,
        weatherForecast: this.weatherSystem.predeterminedForecast.slice(0, actionsToSimulate)
      };
    }
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
   * Simulate future harvest timeline for Oolong Tea effect (4-year view)
   * @param {Object} plantCard - Plant to simulate future harvest for
   * @returns {Object} Harvest simulation result with timeline opportunities
   */
  simulateFutureHarvestTimeline(plantCard) {
    console.log('\n🫖 === OOLONG TEA: 4-YEAR HARVEST TIMELINE ===');
    console.log(`Simulating 4-year harvest timeline for: ${plantCard.name} [${plantCard.state}]`);
    console.log('Each season and plant state will be shown, highlighting valid harvest opportunities.');
    
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

    // Use the same timeline system as Green Tea to ensure consistency
    // This ensures plant protections and cached timelines are properly considered
    this.assignPlantId(plantCard);
    const plantIndex = this.player.garden.indexOf(plantCard);
    const timeline = this.getOrCreatePlantTimeline(plantCard, 48);
    const plantId = timeline.getPlantId(plantCard, plantIndex);
    
    // Check if plant will survive
    const deathPredictions = timeline.getDeathPredictions();
    const plantDeath = deathPredictions.find(death => death.plantId === plantId);
    
    // Find ALL harvest opportunities in the timeline
    const harvestOpportunities = this._findAllHarvestOpportunities(plantCard, timeline, plantId, plantDeath);
    
    if (harvestOpportunities.length === 0) {
      console.log('💀 NO HARVEST OPPORTUNITIES: No future harvests found in 4-year timeline.');
      if (plantDeath) {
        console.log(`   Reason: Plant will die on action ${plantDeath.deathAction} from ${plantDeath.cause}`);
        console.log(`   Death occurs in ${plantDeath.season} before reaching harvestable state`);
        this._displayHarvestProtectionAdvice(plantDeath);
      } else {
        console.log('   Reason: Plant never reaches harvestable maturity within 4 years');
      }
      return { 
        success: false, 
        message: 'No harvest opportunities found',
        deathInfo: plantDeath,
        harvestOpportunities: []
      };
    }
    
    // Display the 4-year timeline with harvest opportunities
    this._displayFourYearHarvestTimeline(timeline, harvestOpportunities, plantDeath);
    
    return { 
      success: true, 
      message: 'Harvest timeline generated',
      harvestOpportunities: harvestOpportunities,
      deathInfo: plantDeath,
      timeline: timeline
    };
  }

  /**
   * Legacy method for backward compatibility
   * @param {Object} plantCard - Plant to simulate future harvest for
   * @returns {Object} Harvest simulation result
   */
  simulateFutureHarvest(plantCard) {
    return this.simulateFutureHarvestTimeline(plantCard);
  }

  /**
   * Find ALL harvest opportunities in the timeline (not just the first one)
   * Excludes harvests that have already been taken from the timeline
   * @private
   */
  _findAllHarvestOpportunities(plantCard, timeline, plantId, plantDeath) {
    const opportunities = [];
    const maxAction = plantDeath ? plantDeath.deathAction : timeline.events.length;
    
    // Look through timeline to find ALL times when plant is mature and in spring
    for (let action = 1; action <= maxAction; action++) {
      const plantState = timeline.getPlantStateAtAction(plantId, action);
      const weatherEvent = timeline.getWeatherAtAction(action);
      
      if (plantState && plantState.state === 'mature' && weatherEvent && weatherEvent.season === 'spring') {
        // Skip if this harvest has already been taken
        if (!this._isHarvestTaken(plantCard, action)) {
          opportunities.push({
            action: action,
            season: weatherEvent.season,
            plantState: plantState.state,
            weather: weatherEvent.weather,
            year: Math.ceil(action / 12),
            seasonInYear: this._getSeasonInYear(action)
          });
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Display the complete 4-year harvest timeline with opportunities
   * @private
   */
  _displayFourYearHarvestTimeline(timeline, harvestOpportunities, plantDeath) {
    console.log('\n🔮 === 4-YEAR HARVEST TIMELINE ===');
    console.log('Showing each season and plant state, highlighting harvest opportunities.');
    console.log('✨ Harvest opportunities only occur when plant is MATURE and season is SPRING.');
    
    if (plantDeath) {
      console.log(`💀 WARNING: Plant will die on action ${plantDeath.deathAction} (${plantDeath.season}) from ${plantDeath.cause}`);
    }
    
    console.log(`\n📅 AVAILABLE HARVEST OPPORTUNITIES (${harvestOpportunities.length} found):`);
    
    if (harvestOpportunities.length > 0) {
      harvestOpportunities.forEach((opportunity, index) => {
        const yearsFromNow = Math.ceil(opportunity.action / 12);
        const seasonsFromNow = Math.ceil(opportunity.action / 3);
        console.log(`   ${index}. Action ${opportunity.action} (Year ${yearsFromNow}, ${opportunity.season}) - Weather: ${opportunity.weather}`);
      });
      
      console.log('\n🌿 Each harvest yields one Tea Leaf (Raw)');
      console.log('🔮 Selecting a harvest will pull it into the present and mark it as taken in the timeline.');
      console.log('🔄 Future Oolong Tea uses will show updated timeline with taken harvests excluded.');
    } else {
      console.log('   None available (either plant dies early or all harvests already taken).');
    }
    
    // Display seasonal timeline summary
    this._displayFullSeasonalTimeline(timeline, harvestOpportunities, plantDeath);
    
    console.log('\n⚠️  This timeline is LOCKED and will occur unless you intervene with protective actions!');
    console.log('=========================================\n');
  }

  /**
   * Display the full seasonal timeline with harvest markers
   * @private
   */
  _displayFullSeasonalTimeline(timeline, harvestOpportunities, plantDeath) {
    console.log('\n📅 DETAILED TIMELINE:');
    let eventIndex = 0;
    const currentSeason = this.getCurrentSeason();
    const actionsPerSeason = this.timeManager.getActionsPerSeason();
    let remainingActionsInCurrentSeason = this.player.actionsLeft;
    
    // Create quick lookup for harvest actions
    const harvestActions = new Set(harvestOpportunities.map(h => h.action));
    const deathAction = plantDeath ? plantDeath.deathAction : null;
    
    for (let year = 1; year <= 4 && eventIndex < timeline.events.length; year++) {
      console.log(`\n   Year ${year}:`);
      
      const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
      let startSeasonIndex = year === 1 ? seasonOrder.indexOf(currentSeason) : 0;
      
      for (let i = 0; i < 4 && eventIndex < timeline.events.length; i++) {
        const seasonIndex = (startSeasonIndex + i) % 4;
        const season = seasonOrder[seasonIndex];
        const seasonEvents = [];
        let hasHarvestEvent = false;
        let hasDeathEvent = false;
        
        const actionsThisSeason = (year === 1 && i === 0) ? remainingActionsInCurrentSeason : actionsPerSeason;
        
        for (let j = 0; j < actionsThisSeason && eventIndex < timeline.events.length; j++) {
          const currentAction = eventIndex + 1;
          const event = timeline.events[eventIndex];
          
          if (event) {
            seasonEvents.push(event.weather);
            
            if (harvestActions.has(currentAction)) {
              hasHarvestEvent = true;
            }
            
            if (deathAction === currentAction) {
              hasDeathEvent = true;
            }
          }
          eventIndex++;
        }
        
        if (seasonEvents.length > 0) {
          let seasonLine = `     ${season}: ${seasonEvents.join(', ')}`;
          if (hasHarvestEvent) {
            seasonLine += ' 🌿 HARVEST AVAILABLE!';
          }
          if (hasDeathEvent) {
            seasonLine += ' ⚠️  DEATH EVENT!';
          }
          console.log(seasonLine);
        }
      }
    }
  }

  /**
   * Helper to get season name within a year for a given action
   * @private
   */
  _getSeasonInYear(action) {
    const currentSeason = this.getCurrentSeason();
    const actionsPerSeason = this.timeManager.getActionsPerSeason();
    const currentSeasonActionsLeft = this.player.actionsLeft;
    
    // Calculate which season this action falls into
    const actionsUntilNextSeason = currentSeasonActionsLeft;
    
    if (action <= actionsUntilNextSeason) {
      return currentSeason;
    }
    
    const actionsAfterCurrentSeason = action - actionsUntilNextSeason;
    const seasonsAhead = Math.floor((actionsAfterCurrentSeason - 1) / actionsPerSeason) + 1;
    
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentIndex = seasons.indexOf(currentSeason);
    const targetIndex = (currentIndex + seasonsAhead) % seasons.length;
    
    return seasons[targetIndex];
  }

  /**
   * Execute a selected harvest from the future timeline
   * @param {Object} plantCard - Plant being harvested from
   * @param {Object} selectedOpportunity - The harvest opportunity selected by player
   * @returns {Object} Result of the harvest execution
   */
  executeSelectedHarvest(plantCard, selectedOpportunity) {
    console.log('\n🍃 === EXECUTING SELECTED HARVEST ===');
    console.log(`Pulling harvest from Action ${selectedOpportunity.action} (Year ${selectedOpportunity.year}, ${selectedOpportunity.season})`);
    console.log(`Weather during harvest: ${selectedOpportunity.weather}`);
    
    // Add harvested leaves to kitchen
    const harvestedLeaves = this.createCard("tea_leaf_raw");
    this.player.addCardToLocation(harvestedLeaves, "kitchen");
    
    console.log('🌿 Added Tea Leaf (Raw) to kitchen from future harvest!');
    
    // Mark this harvest as taken in the plant's timeline
    this._markHarvestAsTaken(plantCard, selectedOpportunity);
    
    console.log('🔮 The plant\'s timeline has been updated: this harvest is now marked as taken.');
    console.log('🔄 Future timeline views will reflect this change.');
    console.log('===============================================\n');
    
    return { 
      success: true, 
      message: 'Selected harvest executed successfully',
      harvestInfo: selectedOpportunity
    };
  }

  /**
   * Mark a harvest as taken in the plant's timeline for future consistency
   * @private
   */
  _markHarvestAsTaken(plantCard, harvestOpportunity) {
    // Initialize taken harvests tracking if not exists
    if (!plantCard.takenHarvests) {
      plantCard.takenHarvests = new Set();
    }
    
    // Mark this specific action as harvested
    plantCard.takenHarvests.add(harvestOpportunity.action);
    
    console.log(`📝 Marked Action ${harvestOpportunity.action} as harvested for ${plantCard.name}`);
  }

  /**
   * Check if a harvest has been taken from the timeline
   * @private
   */
  _isHarvestTaken(plantCard, action) {
    return plantCard.takenHarvests && plantCard.takenHarvests.has(action);
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
   * Consume Oolong Tea with plant selection for future harvest timeline
   * @param {Object} teaCard - The Oolong Tea card being consumed
   * @param {number} plantIndex - Index of plant in garden to harvest from future
   * @param {number} harvestChoice - Optional: which harvest opportunity to select (0-based index)
   * @param {Object} cachedTimeline - Optional: previously generated timeline to avoid regeneration
   * @returns {Object} Result of consumption with harvest opportunities
   */
  consumeOolongTeaWithPlantSelection(teaCard, plantIndex, harvestChoice = null, cachedTimeline = null) {
    const selectedPlant = this.player.garden[plantIndex];
    if (!selectedPlant) {
      console.log('❌ No plant found at that garden index.');
      return { success: false, message: 'No plant found' };
    }

    console.log(`🫖 Consuming ${teaCard.name} to view future harvest timeline from ${selectedPlant.name}...`);
    
    // Use cached timeline if provided, otherwise generate new one
    let timelineResult;
    if (cachedTimeline && cachedTimeline.success) {
      timelineResult = cachedTimeline;
    } else {
      // Generate the 4-year harvest timeline
      timelineResult = this.simulateFutureHarvestTimeline(selectedPlant);
      
      if (!timelineResult.success) {
        console.log(`❌ Future harvest timeline failed: ${timelineResult.message}`);
        // Don't consume the tea if timeline generation failed
        return timelineResult;
      }
    }
    
    // If no harvest choice specified, return the timeline for selection
    if (harvestChoice === null) {
      console.log('\n🎯 Select which harvest to pull into the present:');
      console.log('   (This choice will be handled by the interface)');
      return {
        success: true,
        requiresSelection: true,
        message: 'Harvest selection required',
        harvestOpportunities: timelineResult.harvestOpportunities,
        deathInfo: timelineResult.deathInfo,
        timeline: timelineResult.timeline,
        teaCard: teaCard,
        plantIndex: plantIndex
      };
    }
    
    // If harvest choice is specified, execute it
    const opportunities = timelineResult.harvestOpportunities;
    if (harvestChoice < 0 || harvestChoice >= opportunities.length) {
      console.log('❌ Invalid harvest selection.');
      return { success: false, message: 'Invalid harvest selection' };
    }
    
    const selectedOpportunity = opportunities[harvestChoice];
    
    // Check if this harvest has already been taken
    if (this._isHarvestTaken(selectedPlant, selectedOpportunity.action)) {
      console.log('❌ This harvest has already been taken from the timeline!');
      return { success: false, message: 'Harvest already taken' };
    }
    
    // Execute the selected harvest
    const harvestResult = this.executeSelectedHarvest(selectedPlant, selectedOpportunity);
    
    if (harvestResult.success) {
      // Remove the consumed tea
      this.player.removeCardFromCurrentLocation(teaCard);
      console.log(`🫖 ${teaCard.name} consumed successfully.`);
      
      return {
        success: true,
        message: 'Future harvest successful',
        harvestInfo: selectedOpportunity,
        deathInfo: timelineResult.deathInfo
      };
    } else {
      return harvestResult;
    }
  }

  // === Black Tea Consumption: Timeline Viewer and State Replacement ===

  /**
   * Handle Black Tea consumption with plant selection and timeline manipulation
   * @param {Card} teaCard - The Black Tea card being consumed
   * @param {number} plantIndex - Index of the plant in garden
   * @param {number} targetAction - Which future action to replace plant with (null for timeline display only)
   * @returns {Object} Result of the consumption
   */
  consumeBlackTeaWithPlantSelection(teaCard, plantIndex, targetAction = null) {
    const plant = this.player.garden[plantIndex];
    if (!plant) {
      console.log('❌ No plant at that garden index.');
      return { success: false, message: 'No plant found' };
    }

    console.log(`⚫ Drinking Black Tea to view the 4-year timeline of ${plant.name} [${plant.state}]...`);
    
    // Ensure plant has unique ID and get/create timeline
    this.assignPlantId(plant);
    const timeline = this.getOrCreatePlantTimeline(plant, 48);
    
    // Display the timeline first
    this.displayBlackTeaTimeline(plant, timeline, plantIndex);
    
    // If no target action specified, return timeline data for selection
    if (targetAction === null) {
      const timelineStates = this.getSelectableStatesFromTimeline(plant, timeline);
      return {
        success: true,
        requiresSelection: true,
        message: 'Select a future state to replace the present plant',
        timelineStates: timelineStates,
        timeline: timeline,
        teaCard: teaCard,
        plantIndex: plantIndex
      };
    }
    
    // Execute state replacement if target action specified
    const replacementResult = this.replaceWithFutureState(plant, plantIndex, timeline, targetAction);
    
    if (replacementResult.success) {
      // Remove the consumed tea
      this.player.removeCardFromCurrentLocation(teaCard);
      console.log(`⚫ ${teaCard.name} consumed successfully.`);
      
      // Invalidate timeline since plant has changed
      this.invalidatePlantTimeline(plant);
      
      return {
        success: true,
        message: 'Plant replaced with future state',
        replacementInfo: replacementResult,
        newPlantState: plant.state
      };
    } else {
      return replacementResult;
    }
  }

  /**
   * Display Black Tea timeline with all future states
   * @param {Card} plant - The plant being analyzed
   * @param {Timeline} timeline - The generated timeline
   * @param {number} plantIndex - Garden index of the plant
   */
  displayBlackTeaTimeline(plant, timeline, plantIndex) {
    console.log('\n⚫ === BLACK TEA: 4-YEAR TIMELINE VIEWER ===');
    console.log(`Plant: ${plant.name} [${plant.state}] (Garden index: ${plantIndex})`);
    console.log('Timeline locked and consistent across all tea powers');
    console.log('Select any future state to replace the present plant');
    
    // Get plant-specific data from timeline
    const plantId = plant.uniqueId || timeline.getPlantId(plant, plantIndex);
    const plantStates = timeline.plantStates.get(plantId) || [];
    
    // Get death predictions
    const deathPredictions = timeline.getDeathPredictions();
    const plantDeath = deathPredictions.find(death => death.plantId === plantId);
    
    console.log('\n📊 SELECTABLE FUTURE STATES:');
    
    if (plantStates.length === 0) {
      console.log('   No state changes predicted - plant remains in current state');
      console.log(`   Action 48: ${plant.state} (end of timeline)`);
      return;
    }
    
    // Display current state
    console.log(`   Action 0: ${plant.state} (current state)`);
    
    // Display each state change with harvestability and yields
    plantStates.forEach((stateChange, index) => {
      const harvestInfo = this.getHarvestInfoForState(plant, stateChange, timeline);
      const deathWarning = plantDeath && stateChange.action >= plantDeath.deathAction ? ' ⚠️ DEAD' : '';
      
      console.log(`   Action ${stateChange.action}: ${stateChange.state}${deathWarning}`);
      
      if (harvestInfo.isHarvestable) {
        console.log(`      🌾 Harvestable: ${harvestInfo.yields.join(', ')}`);
        console.log(`      📈 Expected yields: ${harvestInfo.yieldCount} items`);
      }
    });
    
    // Show death information if applicable
    if (plantDeath) {
      console.log(`\n💀 Plant dies at action ${plantDeath.deathAction} due to ${plantDeath.cause}`);
      console.log('   States after death are not recommended');
    }
    
    console.log('\n🔄 REPLACEMENT RULES:');
    console.log('   • Select any action number to replace plant with that state');
    console.log('   • Harvest potential transfers to the new state');
    console.log('   • Timelines remain consistent across Green, Oolong, and Black tea');
    console.log('   • Invalid selections (death states, out of range) will be rejected');
  }

  /**
   * Get selectable states from timeline for interface
   * @param {Card} plant - The plant being analyzed
   * @param {Timeline} timeline - The generated timeline
   * @returns {Array} Array of selectable state objects
   */
  getSelectableStatesFromTimeline(plant, timeline) {
    const plantId = plant.uniqueId || timeline.getPlantId(plant, 0);
    const plantStates = timeline.plantStates.get(plantId) || [];
    const deathPredictions = timeline.getDeathPredictions();
    const plantDeath = deathPredictions.find(death => death.plantId === plantId);
    
    const selectableStates = [];
    
    // Add current state
    selectableStates.push({
      action: 0,
      state: plant.state,
      age: plant.age || 0,
      isValid: true,
      isCurrent: true,
      harvestInfo: this.getHarvestInfoForState(plant, { state: plant.state, age: plant.age || 0 }, timeline)
    });
    
    // Add future states
    plantStates.forEach(stateChange => {
      const isValid = !plantDeath || stateChange.action < plantDeath.deathAction;
      const harvestInfo = this.getHarvestInfoForState(plant, stateChange, timeline);
      
      selectableStates.push({
        action: stateChange.action,
        state: stateChange.state,
        age: stateChange.age,
        isValid: isValid,
        isCurrent: false,
        isDead: stateChange.state === 'dead',
        harvestInfo: harvestInfo
      });
    });
    
    return selectableStates;
  }

  /**
   * Get harvest information for a specific plant state
   * @param {Card} plant - The original plant
   * @param {Object} stateInfo - State information (state, age, etc.)
   * @param {Timeline} timeline - The timeline for context
   * @returns {Object} Harvest information
   */
  getHarvestInfoForState(plant, stateInfo, timeline) {
    // Check if state is harvestable
    const stageDef = plant.definition.states[stateInfo.state];
    const isHarvestable = stageDef && stageDef.actions && stageDef.actions.harvest;
    
    if (!isHarvestable) {
      return { isHarvestable: false, yields: [], yieldCount: 0 };
    }
    
    // Determine harvest yields based on state and age
    const harvestAction = stageDef.actions.harvest;
    const yieldTarget = harvestAction.target;
    const baseYieldCount = 1; // Base yield from harvest action
    
    // Age bonus for mature plants
    const ageBonusYields = Math.floor((stateInfo.age || 0) / 5); // Bonus yield every 5 years
    const totalYields = baseYieldCount + ageBonusYields;
    
    const yields = Array(totalYields).fill(yieldTarget);
    
    return {
      isHarvestable: true,
      yields: yields,
      yieldCount: totalYields,
      baseTarget: yieldTarget
    };
  }

  /**
   * Replace plant with its future state from timeline
   * @param {Card} plant - The plant to replace
   * @param {number} plantIndex - Garden index of the plant
   * @param {Timeline} timeline - The timeline containing future states
   * @param {number} targetAction - Which action state to use
   * @returns {Object} Result of the replacement
   */
  replaceWithFutureState(plant, plantIndex, timeline, targetAction) {
    const plantId = plant.uniqueId || timeline.getPlantId(plant, plantIndex);
    const plantStates = timeline.plantStates.get(plantId) || [];
    
    // Validate target action
    if (targetAction < 0 || targetAction > 48) {
      return { success: false, message: 'Target action out of range (0-48)' };
    }
    
    // Check for death
    const deathPredictions = timeline.getDeathPredictions();
    const plantDeath = deathPredictions.find(death => death.plantId === plantId);
    if (plantDeath && targetAction >= plantDeath.deathAction) {
      return { success: false, message: 'Cannot replace with dead state' };
    }
    
    // Find the state at target action
    let targetState = null;
    if (targetAction === 0) {
      // Current state
      targetState = {
        state: plant.state,
        age: plant.age || 0,
        stateProgress: plant.stateProgress || 0,
        conditions: plant.activeConditions || {}
      };
    } else {
      // Find most recent state change before or at target action
      for (const stateChange of plantStates) {
        if (stateChange.action <= targetAction) {
          targetState = stateChange;
        } else {
          break;
        }
      }
      
      if (!targetState) {
        // No state changes, use current state
        targetState = {
          state: plant.state,
          age: plant.age || 0,
          stateProgress: plant.stateProgress || 0,
          conditions: plant.activeConditions || {}
        };
      }
    }
    
    if (!targetState) {
      return { success: false, message: 'No valid state found for target action' };
    }
    
    // Store original state for reporting
    const originalState = {
      state: plant.state,
      age: plant.age || 0,
      stateProgress: plant.stateProgress || 0
    };
    
    // Apply the future state to the plant
    plant.state = targetState.state;
    plant.age = targetState.age;
    plant.stateProgress = targetState.stateProgress;
    plant.activeConditions = targetState.conditions ? {...targetState.conditions} : {};
    
    // Update harvest readiness if applicable
    if (plant.state === 'mature') {
      plant.harvestReady = (this.getCurrentSeason() === 'spring');
    }
    
    console.log(`\n🔄 PLANT REPLACEMENT SUCCESSFUL!`);
    console.log(`   ${plant.name} [${originalState.state}] → [${plant.state}]`);
    console.log(`   Age: ${originalState.age} → ${plant.age}`);
    console.log(`   State Progress: ${originalState.stateProgress} → ${plant.stateProgress}`);
    
    if (Object.keys(plant.activeConditions).length > 0) {
      console.log(`   Active Conditions: ${Object.entries(plant.activeConditions).map(([k,v]) => `${k}(${v})`).join(', ')}`);
    }
    
    return {
      success: true,
      message: 'Plant state replaced successfully',
      originalState: originalState,
      newState: {
        state: plant.state,
        age: plant.age,
        stateProgress: plant.stateProgress
      },
      targetAction: targetAction
    };
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
    
    // For green tea predictions, protection should last the full 4 years (48 actions)
    // to clear all risks as per the green tea power description
    const isGreenTeaPredictionActive = this.weatherForecastLocked;
    const duration = isGreenTeaPredictionActive ? 48 : (actionDef.duration || 6);
    
    plant.activeConditions = plant.activeConditions || {};
    plant.activeConditions[condition] = duration;

    // Invalidate any cached timeline for this plant to ensure fresh calculation
    this.invalidatePlantTimeline(plant);

    console.log(`🛡️ Applied ${condition} protection to ${plant.name} for ${duration} actions.`);
    if (isGreenTeaPredictionActive) {
      console.log(`   ✨ Green Tea power: Protection extended to clear all risks for 4 years!`);
    }

    // Regenerate timeline with the new protection using the invalidated cache
    const newTimeline = this.getOrCreatePlantTimeline(plant, 48, true);
    
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