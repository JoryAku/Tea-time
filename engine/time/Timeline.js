// Comprehensive Timeline system that simulates weather events and plant states up to 4 years

class Timeline {
  constructor(engine, startingSeason, startingActionsLeft) {
    this.engine = engine;
    this.startingSeason = startingSeason;
    this.startingActionsLeft = startingActionsLeft;
    
    // Timeline storage
    this.events = []; // Array of daily events with { action, season, weather, plantStates }
    this.plantStates = new Map(); // Map of plantId -> array of state changes
    this.isLocked = false;
    this.maxActions = 48; // 4 years = 48 actions
    
    // Outcome tracking
    this.plantOutcomes = new Map(); // Map of plantId -> survival outcome
    this.interventions = new Map(); // Map of action -> intervention details
  }

  /**
   * Generate a complete timeline from present conditions for specified actions
   * @param {Array} plants - Current plants to simulate
   * @param {number} actionsToSimulate - Number of actions to simulate (default 48)
   * @returns {Object} Complete timeline with events and outcomes
   */
  generateTimeline(plants, actionsToSimulate = 48) {
    this.maxActions = Math.min(actionsToSimulate, 48);
    this.events = [];
    this.plantStates.clear();
    this.plantOutcomes.clear();
    
    // Generate consistent plant IDs
    this.plantIds = plants.map((plant, index) => this._generatePlantId(plant, index));
    
    // Phase 1: Determine survival outcomes for all plants using probability
    plants.forEach((plant, index) => {
      const plantId = this.plantIds[index];
      const outcome = this._determinePlantSurvivalOutcome(plant, actionsToSimulate);
      this.plantOutcomes.set(plantId, outcome);
      this.plantStates.set(plantId, []);
    });
    
    // Phase 2: Generate weather events ensuring outcomes are met
    const weatherForecast = this._generateTimelineWeatherEvents(plants, actionsToSimulate);
    
    // Phase 3: Simulate daily progression and record state changes
    this._simulateTimelineProgression(plants, weatherForecast, actionsToSimulate);
    
    // Lock the timeline
    this.isLocked = true;
    
    return {
      events: this.events,
      plantOutcomes: Object.fromEntries(this.plantOutcomes),
      plantStates: Object.fromEntries(this.plantStates),
      isLocked: this.isLocked,
      totalActions: actionsToSimulate
    };
  }

  /**
   * Apply a player intervention that can modify the locked timeline
   * @param {number} actionNumber - Which action the intervention occurs on
   * @param {string} interventionType - Type of intervention (e.g., 'shelter', 'water')
   * @param {string} plantId - Which plant the intervention affects
   * @returns {boolean} Whether intervention was successfully applied
   */
  applyIntervention(actionNumber, interventionType, plantId) {
    if (!this.isLocked) {
      throw new Error('Cannot apply interventions to unlocked timeline');
    }
    
    if (actionNumber < 1 || actionNumber > this.events.length) {
      return false;
    }
    
    // Record the intervention
    this.interventions.set(actionNumber, {
      type: interventionType,
      plantId: plantId,
      timestamp: Date.now()
    });
    
    // Modify timeline from intervention point forward
    return this._recalculateTimelineFromAction(actionNumber, interventionType, plantId);
  }

  /**
   * Get the current state of a plant at a specific action
   * @param {string} plantId - Plant identifier
   * @param {number} actionNumber - Action number to check
   * @returns {Object} Plant state at that action
   */
  getPlantStateAtAction(plantId, actionNumber) {
    if (!this.plantStates.has(plantId)) {
      return null;
    }
    
    const stateHistory = this.plantStates.get(plantId);
    // Find the most recent state change before or at the action
    let currentState = null;
    for (const stateChange of stateHistory) {
      if (stateChange.action <= actionNumber) {
        currentState = stateChange;
      } else {
        break;
      }
    }
    
    return currentState;
  }

  /**
   * Get weather event for a specific action
   * @param {number} actionNumber - Action number (1-indexed)
   * @returns {Object} Weather event details
   */
  getWeatherAtAction(actionNumber) {
    if (actionNumber < 1 || actionNumber > this.events.length) {
      return null;
    }
    
    return this.events[actionNumber - 1];
  }

  /**
   * Check if any plants are predicted to die and when
   * @returns {Array} Array of death predictions
   */
  getDeathPredictions() {
    const deaths = [];
    
    this.plantOutcomes.forEach((outcome, plantId) => {
      if (!outcome.willSurvive) {
        // Get the actual weather event that will cause death
        const deathEvent = this.getWeatherAtAction(outcome.deathAction);
        const actualCause = deathEvent ? deathEvent.weather : outcome.deathCause;
        
        deaths.push({
          plantId: plantId,
          deathAction: outcome.deathAction,
          cause: actualCause, // Use actual weather event
          season: this._getSeasonForAction(outcome.deathAction)
        });
      }
    });
    
    return deaths.sort((a, b) => a.deathAction - b.deathAction);
  }

  /**
   * Get the plant ID for a given plant (public accessor for engine)
   * @param {Object} plant - Plant card object
   * @param {number} index - Plant index
   * @returns {string} Plant ID
   */
  getPlantId(plant, index) {
    return this._generatePlantId(plant, index);
  }

  /**
   * Generate unique identifier for a plant
   * @private
   */
  _generatePlantId(plant, index) {
    // Use consistent seed based on plant properties, not timestamp
    return `${plant.definition.id}_${plant.state}_${index}_${plant.age || 0}_${plant.stateProgress || 0}`;
  }

  /**
<<<<<<< HEAD
   * Determine survival outcome using percentage-based probabilities
   * @private
   */
  _determinePlantSurvivalOutcome(plant, actionsToSimulate) {
=======
   * Determine survival outcome based on predetermined weather forecast
   * @private
   */
  _determinePlantSurvivalOutcome(plant, actionsToSimulate) {
    // If engine has predetermined forecast, use that for accurate prediction
    if (this.engine.weatherForecastLocked && this.engine.weatherSystem.predeterminedForecast) {
      return this._determineOutcomeFromForecast(plant, actionsToSimulate);
    }
    
    // Fallback: use probability-based prediction (legacy behavior)
>>>>>>> bbe9e832edb95afd1bc6e342517513951739660d
    const stageDef = plant.definition.states[plant.state];
    const vulnerabilities = (stageDef && stageDef.vulnerabilities) ? stageDef.vulnerabilities : [];
    
    // Check initial active protections
    const activeProtections = plant.activeConditions || {};
    
    // Calculate base survival probability - balanced for interesting outcomes
    let survivalChance = 75; // Balanced at 75%
    
    // Reduce survival chance based on unprotected vulnerabilities
    let protectedVulnerabilities = 0;
    vulnerabilities.forEach(vulnerability => {
      // Check if this vulnerability is currently protected
      let isProtected = false;
      if (vulnerability.event === 'drought' && activeProtections['water']) {
        isProtected = true;
        protectedVulnerabilities++;
      } else if (vulnerability.event === 'frost' && activeProtections['sunlight']) {
        isProtected = true;
        protectedVulnerabilities++;
      }
      
      // Only count unprotected vulnerabilities against survival
      if (!isProtected) {
        const seasonalRisk = this._calculateSeasonalVulnerabilityRisk(vulnerability);
        survivalChance -= seasonalRisk;
      }
    });
    
    // Bonus for having protections (but only if they're long-lasting enough)
    if (protectedVulnerabilities > 0) {
      // Calculate average protection duration
      const totalProtectionDuration = Object.values(activeProtections).reduce((sum, duration) => sum + duration, 0);
      const avgProtectionDuration = totalProtectionDuration / Object.keys(activeProtections).length;
      
      // Only give full bonus if protection lasts at least 30% of the simulation
      const protectionRatio = Math.min(1.0, avgProtectionDuration / (actionsToSimulate * 0.3));
      const protectionBonus = protectedVulnerabilities * 15 * protectionRatio;
      survivalChance += protectionBonus;
    }
    
    // Adjust for plant age if it has lifespan
    if (plant.lifespan) {
      const currentAge = plant.age || 0;
      const ageRatio = currentAge / plant.lifespan;
      if (ageRatio > 0.8) {
        survivalChance -= 20; // Penalty for elderly plants
      }
    }
    
    // Ensure survival chance is within bounds - reasonable range
    survivalChance = Math.max(20, Math.min(95, survivalChance)); // 20% minimum, 95% maximum
    
    // Use deterministic but plant-specific random seed
    const plantStateHash = this._calculatePlantStateHash(plant);
    const survivalRoll = (plantStateHash % 100);
    
    const willSurvive = survivalRoll < survivalChance;
    
    // If plant has protections, we need to check if they last long enough
    let deathAction = null;
    let deathCause = null;
    
    if (!willSurvive) {
      deathAction = this._calculateDeathAction(plant, actionsToSimulate, plantStateHash);
      deathCause = this._selectDeathCause(plant, deathAction);
      
      // Check if the death cause is protected and protection lasts until death action
      // Protection duration is counted from action 1, so protection expires at action X+1
      const protectionDuration = activeProtections[deathCause === 'drought' ? 'water' : 'sunlight'] || 0;
      
      if (deathCause === 'drought' && activeProtections['water'] && protectionDuration >= deathAction) {
        // Protection lasts long enough, plant survives
        return { willSurvive: true, deathAction: null, deathCause: null, protectedBy: 'water' };
      } else if (deathCause === 'frost' && activeProtections['sunlight'] && protectionDuration >= deathAction) {
        // Protection lasts long enough, plant survives  
        return { willSurvive: true, deathAction: null, deathCause: null, protectedBy: 'sunlight' };
      }
      
      // Protection doesn't last long enough, but may delay death
      if ((deathCause === 'drought' && activeProtections['water']) || 
          (deathCause === 'frost' && activeProtections['sunlight'])) {
        // Death is delayed until after protection expires
        const delayedDeathAction = Math.max(deathAction, protectionDuration + 1);
        if (delayedDeathAction <= actionsToSimulate) {
          deathAction = delayedDeathAction;
        } else {
          // Protection lasts the entire simulation, plant survives
          return { willSurvive: true, deathAction: null, deathCause: null, protectedBy: deathCause === 'drought' ? 'water' : 'sunlight' };
        }
      }
    }
    
    return {
      willSurvive: willSurvive,
      survivalChance: survivalChance,
      deathAction: deathAction,
      deathCause: deathCause,
      protectedVulnerabilities: protectedVulnerabilities
    };
  }

  /**
<<<<<<< HEAD
=======
   * Determine outcome based on predetermined weather forecast
   * @private
   */
  _determineOutcomeFromForecast(plant, actionsToSimulate) {
    const stageDef = plant.definition.states[plant.state];
    const vulnerabilities = (stageDef && stageDef.vulnerabilities) ? stageDef.vulnerabilities : [];
    const vulnerableEvents = vulnerabilities.map(v => v.event);
    const activeProtections = plant.activeConditions || {};
    
    // Simulate protection durations
    const protectionState = { ...activeProtections };
    
    // Check each action in the forecast for death conditions
    for (let action = 1; action <= actionsToSimulate; action++) {
      // Tick down protections
      Object.keys(protectionState).forEach(condition => {
        protectionState[condition]--;
        if (protectionState[condition] <= 0) {
          delete protectionState[condition];
        }
      });
      
      // Get weather event for this action
      const weatherEvent = this.engine.weatherSystem.predeterminedForecast[action - 1];
      
      // Check if this weather event is vulnerable for the plant
      if (vulnerableEvents.includes(weatherEvent)) {
        // Check if plant is protected against this vulnerability
        let isProtected = false;
        if (weatherEvent === 'drought' && protectionState['water']) {
          isProtected = true;
        } else if (weatherEvent === 'frost' && protectionState['sunlight']) {
          isProtected = true;
        }
        
        if (!isProtected) {
          // Plant will die on this action
          return {
            willSurvive: false,
            deathAction: action,
            deathCause: weatherEvent,
            protectedVulnerabilities: 0
          };
        }
      }
    }
    
    // Plant survives the entire forecast
    return {
      willSurvive: true,
      deathAction: null,
      deathCause: null,
      protectedVulnerabilities: Object.keys(activeProtections).length
    };
  }

  /**
>>>>>>> bbe9e832edb95afd1bc6e342517513951739660d
   * Calculate seasonal vulnerability risk percentage
   * @private
   */
  _calculateSeasonalVulnerabilityRisk(vulnerability) {
    const event = vulnerability.event;
    let totalRisk = 0;
    
    // Check probability across all seasons
    Object.values(this.engine.weatherData).forEach(seasonEvents => {
      const eventData = seasonEvents.find(e => e.event === event);
      if (eventData) {
        totalRisk += eventData.pct / 4; // Average across seasons
      }
    });
    
    // Convert to risk reduction (higher probability = higher risk)
    // Balanced multiplier for reasonable risk
    return Math.min(25, totalRisk * 1.0); // Reduced from 1.5 to 1.0, cap at 25%
  }

  /**
   * Calculate plant-specific hash for deterministic randomness
   * @private
   */
  _calculatePlantStateHash(plant) {
    let hash = 0;
    const stateString = `${plant.definition.id}_${plant.state}_${plant.age || 0}_${plant.stateProgress || 0}`;
    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calculate when plant should die (if destined to die)
   * @private
   */
  _calculateDeathAction(plant, actionsToSimulate, plantStateHash) {
    const stageDef = plant.definition.states[plant.state];
    const vulnerabilities = (stageDef && stageDef.vulnerabilities) ? stageDef.vulnerabilities : [];
    
    if (vulnerabilities.length === 0) {
      // No vulnerabilities, plant dies of old age late in timeline
      return Math.floor(actionsToSimulate * 0.9);
    }
    
    // Find seasons where vulnerability events can occur
    const vulnerabilitySeasons = new Map();
    vulnerabilities.forEach(vuln => {
      Object.entries(this.engine.weatherData).forEach(([season, events]) => {
        if (events.some(event => event.event === vuln.event)) {
          if (!vulnerabilitySeasons.has(vuln.event)) {
            vulnerabilitySeasons.set(vuln.event, []);
          }
          vulnerabilitySeasons.get(vuln.event).push(season);
        }
      });
    });
    
    // Generate possible death actions that align with vulnerability seasons
    const possibleDeathActions = [];
    let currentSeasonIndex = this.engine.timeManager.seasons.indexOf(this.startingSeason);
    let actionsLeftInSeason = this.startingActionsLeft;
    
    for (let action = 1; action <= actionsToSimulate; action++) {
      if (actionsLeftInSeason <= 0) {
        currentSeasonIndex = (currentSeasonIndex + 1) % 4;
        actionsLeftInSeason = this.engine.timeManager.getActionsPerSeason();
      }
      actionsLeftInSeason--;
      
      const actionSeason = this.engine.timeManager.seasons[currentSeasonIndex];
      
      // Check if any vulnerability can occur in this season
      for (const [vulnEvent, seasons] of vulnerabilitySeasons) {
        if (seasons.includes(actionSeason) && action >= Math.floor(actionsToSimulate * 0.3)) {
          possibleDeathActions.push({ action, season: actionSeason, vulnerability: vulnEvent });
        }
      }
    }
    
    if (possibleDeathActions.length === 0) {
      // No suitable death actions found, die late in timeline
      return Math.floor(actionsToSimulate * 0.9);
    }
    
    // Select a death action based on plant hash for consistency
    const deathIndex = plantStateHash % possibleDeathActions.length;
    return possibleDeathActions[deathIndex].action;
  }

  /**
   * Select which vulnerability will cause death based on death action season
   * @private
   */
  _selectDeathCause(plant, deathAction = null) {
    const stageDef = plant.definition.states[plant.state];
    const vulnerabilities = (stageDef && stageDef.vulnerabilities) ? stageDef.vulnerabilities : [];
    
    if (vulnerabilities.length === 0) {
      return 'age'; // Default death cause
    }
    
    // If we have a death action, determine which vulnerability can occur in that season
    if (deathAction) {
      const deathSeason = this._getSeasonForAction(deathAction);
      const seasonWeather = this.engine.weatherData[deathSeason];
      const availableVulnerabilities = vulnerabilities.filter(vuln => 
        seasonWeather.some(weather => weather.event === vuln.event)
      );
      
      if (availableVulnerabilities.length > 0) {
        // Select based on plant hash to ensure consistency
        const hash = this._calculatePlantStateHash(plant);
        return availableVulnerabilities[hash % availableVulnerabilities.length].event;
      }
    }
    
    // Fallback: select based on plant hash from all vulnerabilities
    const hash = this._calculatePlantStateHash(plant);
    return vulnerabilities[hash % vulnerabilities.length].event;
  }

  /**
<<<<<<< HEAD
   * Generate weather events ensuring plant outcomes are achieved
   * @private
   */
  _generateTimelineWeatherEvents(plants, actionsToSimulate) {
=======
   * Generate weather events using predetermined forecast from engine
   * @private
   */
  _generateTimelineWeatherEvents(plants, actionsToSimulate) {
    // Use predetermined forecast from engine if available
    if (this.engine.weatherForecastLocked && this.engine.weatherSystem.predeterminedForecast) {
      const forecast = this.engine.weatherSystem.predeterminedForecast.slice(0, actionsToSimulate);
      console.log(`📋 Using predetermined weather forecast (${forecast.length} actions)`);
      return forecast;
    }
    
    // Fallback: generate outcome-driven forecast (legacy behavior)
>>>>>>> bbe9e832edb95afd1bc6e342517513951739660d
    const forecast = [];
    
    for (let action = 1; action <= actionsToSimulate; action++) {
      const season = this._getSeasonForAction(action);
      const seasonWeather = this.engine.weatherData[season];
      
      // Collect constraints from all plant outcomes
      let availableEvents = [...seasonWeather];
      
      plants.forEach((plant, index) => {
        const plantId = this.plantIds[index];
        const outcome = this.plantOutcomes.get(plantId);
        const stageDef = plant.definition.states[plant.state];
        const vulnerabilities = (stageDef && stageDef.vulnerabilities) ? stageDef.vulnerabilities : [];
        const vulnerableEvents = vulnerabilities.map(v => v.event);
        
        if (outcome && outcome.willSurvive) {
          // Filter out vulnerability events for surviving plants
          availableEvents = availableEvents.filter(weather => 
            !vulnerableEvents.includes(weather.event)
          );
        } else if (outcome && !outcome.willSurvive && outcome.deathAction === action) {
          // Ensure death-causing event is available for dying plants
          const deathEvent = seasonWeather.find(weather => weather.event === outcome.deathCause);
          if (deathEvent) {
            availableEvents = [deathEvent]; // Force death event
          } else {
            // Death cause not available this season, try other vulnerability events
            const vulnerableEventsThisSeason = seasonWeather.filter(weather => 
              vulnerableEvents.includes(weather.event)
            );
            if (vulnerableEventsThisSeason.length > 0) {
              availableEvents = [vulnerableEventsThisSeason[0]]; // Pick first available vulnerability
            }
          }
        } else if (outcome && !outcome.willSurvive) {
          // Before death, avoid vulnerability events
          availableEvents = availableEvents.filter(weather => 
            !vulnerableEvents.includes(weather.event)
          );
        }
      });
      
      // Fallback if no events available
      if (availableEvents.length === 0) {
        availableEvents = seasonWeather;
      }
      
      // Select event using weighted probability
      const selectedEvent = this._selectWeatherFromAvailable(availableEvents);
      forecast.push(selectedEvent);
    }
    
    return forecast;
  }

  /**
   * Simulate progression and record all state changes
   * @private
   */
  _simulateTimelineProgression(plants, weatherForecast, actionsToSimulate) {
    // Create simulation copies of all plants
    const simulatedPlants = plants.map(plant => this._createPlantCopy(plant));
    
    let currentSeason = this.startingSeason;
    let seasonActionCounter = this.startingActionsLeft;
    
    for (let action = 1; action <= actionsToSimulate; action++) {
      // Handle season transitions
      if (seasonActionCounter <= 0) {
        currentSeason = this._getNextSeason(currentSeason);
        seasonActionCounter = this.engine.timeManager.getActionsPerSeason();
        
        // Process season-end progression for all plants
        simulatedPlants.forEach((plant, index) => {
          this._simulateSeasonEndProgression(plant, currentSeason);
          this._recordPlantStateChange(plant, index, action, 'season_end');
        });
      }
      
      seasonActionCounter--;
      
      // Apply weather event
      const weatherEvent = weatherForecast[action - 1];
      const conditions = this.engine.weatherSystem.getEventConditions(currentSeason, weatherEvent);
      
      // Apply weather to all plants and record changes
      simulatedPlants.forEach((plant, index) => {
        const previousState = { state: plant.state, age: plant.age };
        
        // Apply weather effects
        this.engine.plantManager.applyWeatherToPlant(plant, weatherEvent, conditions, true); // Suppress logging during simulation
        
        // Check for death
        const plantId = this.plantIds[index];
        const outcome = this.plantOutcomes.get(plantId);
        if (outcome && !outcome.willSurvive && outcome.deathAction === action) {
          plant.state = 'dead';
          plant.deathCause = outcome.deathCause; // Use the predicted vulnerability cause, not the actual weather event
        }
        
        // Record state change if significant
        if (plant.state !== previousState.state || plant.age !== previousState.age) {
          this._recordPlantStateChange(plant, index, action, 'weather_effect');
        }
      });
      
      // Record the daily event
      this.events.push({
        action: action,
        season: currentSeason,
        weather: weatherEvent,
        conditions: conditions,
        plantCount: simulatedPlants.length,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Record a plant state change
   * @private
   */
  _recordPlantStateChange(plant, plantIndex, action, changeType) {
    const plantId = this.plantIds[plantIndex];
    
    if (!this.plantStates.has(plantId)) {
      this.plantStates.set(plantId, []);
    }
    
    this.plantStates.get(plantId).push({
      action: action,
      state: plant.state,
      age: plant.age || 0,
      stateProgress: plant.stateProgress || 0,
      changeType: changeType,
      conditions: plant.activeConditions ? {...plant.activeConditions} : {},
      timestamp: Date.now()
    });
  }

  /**
   * Create a deep copy of a plant for simulation
   * @private
   */
  _createPlantCopy(plant) {
    const Card = require('../Card');
    const copy = new Card(plant.definition, plant.state);
    copy.stateProgress = plant.stateProgress || 0;
    copy.age = plant.age || 0;
    copy.lifespan = plant.lifespan;
    copy._seasonCounter = plant._seasonCounter || 0;
    copy._transitionThreshold = plant._transitionThreshold;
    copy.activeConditions = plant.activeConditions ? {...plant.activeConditions} : {};
    return copy;
  }

  /**
   * Get season for a specific action number
   * @private
   */
  _getSeasonForAction(actionNumber) {
    const actionsPerSeason = this.engine.timeManager.getActionsPerSeason();
    const currentSeasonActionsLeft = this.startingActionsLeft;
    
    if (actionNumber <= currentSeasonActionsLeft) {
      return this.startingSeason;
    }
    
    const actionsAfterCurrentSeason = actionNumber - currentSeasonActionsLeft;
    const seasonsAhead = Math.floor((actionsAfterCurrentSeason - 1) / actionsPerSeason) + 1;
    
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentIndex = seasons.indexOf(this.startingSeason);
    const targetIndex = (currentIndex + seasonsAhead) % seasons.length;
    
    return seasons[targetIndex];
  }

  /**
   * Get next season in cycle
   * @private
   */
  _getNextSeason(currentSeason) {
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentIndex = seasons.indexOf(currentSeason);
    return seasons[(currentIndex + 1) % seasons.length];
  }

  /**
   * Select weather event from available options using weighted probability
   * @private
   */
  _selectWeatherFromAvailable(availableEvents) {
    if (availableEvents.length === 1) {
      return availableEvents[0].event;
    }
    
    const totalWeight = availableEvents.reduce((sum, event) => sum + event.pct, 0);
    const randomValue = Math.random() * totalWeight;
    let accumulator = 0;
    
    for (const event of availableEvents) {
      accumulator += event.pct;
      if (randomValue <= accumulator) {
        return event.event;
      }
    }
    
    return availableEvents[availableEvents.length - 1].event;
  }

  /**
   * Simulate season-end progression for a plant
   * @private
   */
  _simulateSeasonEndProgression(plant, season) {
    if (this.engine.plantManager && this.engine.plantManager.processPlantProgression) {
      this.engine.plantManager.processPlantProgression(plant, season);
    }
  }

  /**
   * Recalculate timeline from intervention point forward
   * @private
   */
  _recalculateTimelineFromAction(actionNumber, interventionType, plantId) {
    // This is a simplified implementation - full intervention system would be more complex
    console.log(`Timeline intervention applied: ${interventionType} on ${plantId} at action ${actionNumber}`);
    
    // For now, just record the intervention without full recalculation
    // A full implementation would re-simulate from the intervention point
    return true;
  }
}

module.exports = Timeline;