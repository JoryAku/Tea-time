// engine/plants/PlantManager.js
// Handles plant lifecycle, genetics, vulnerabilities

class PlantManager {
  constructor(cardsData) {
    this.cardsData = cardsData;
  }

  // Apply weather event to a single plant
  applyWeatherToPlant(card, event, conditions, suppressLogging = false) {
    const stageDef = card.definition.states[card.state];
    if (!stageDef) return;

    // Add/refresh event conditions for 2 actions
    for (const cond of conditions) {
      card.activeConditions[cond] = 2;
    }

    // Check vulnerabilities first (immediate)
    const vulns = stageDef.vulnerabilities || [];
    for (const v of vulns) {
      if (v.event === event) {
        // IMMUNITY: If plant has 'water' condition, immune to 'drought' vulnerability
        if (event === 'drought' && card.activeConditions['water']) {
          if (!suppressLogging) {
            console.log(`💧 ${card.name} is immune to drought due to water condition.`);
          }
          continue;
        }
        // IMMUNITY: If plant has 'sunlight' condition, immune to 'frost' vulnerability
        if (event === 'frost' && card.activeConditions['sunlight']) {
          if (!suppressLogging) {
            console.log(`☀️ ${card.name} is immune to frost due to sunlight condition.`);
          }
          continue;
        }
        // Any vulnerability met should send plant to 'dead' state
        card.state = "dead";
        if (!suppressLogging) {
          console.log(`☠️ ${card.name} died (was ${stageDef.name || card.state}) due to ${event} (vulnerability met).`);
        }
        return; // stop processing this card
      }
    }

    // If event fulfills a needed resource for current stage, record it
    const needs = stageDef.needs || {};
    const reqResources = needs.resources || [];
    for (const cond of Object.keys(card.activeConditions)) {
      if (reqResources.includes(cond)) {
        card.resourcesThisSeason.add(cond);
      }
    }
  }

  // Process plant progression at season end
  processPlantProgression(card, currentSeason) {
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
      return this.processDeadPlant(card, stageDef);
    }

    // Normal progression logic
    const needs = stageDef.needs || {};
    const seasonsAllowed = needs.season || [];
    // If this stage can progress in this season:
    if (seasonsAllowed.includes(currentSeason)) {
      const requiredResources = needs.resources || [];
      const haveAll = requiredResources.every((r) => card.resourcesThisSeason.has(r));
      if (haveAll) {
        // Increment state progress
        card.stateProgress = (card.stateProgress || 0) + 1;
        // Check transitions from JSON
        const transitions = stageDef.transitions || [];
        if (transitions.length > 0) {
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
      }
    }
    // Reset resource record for next season
    card.resetSeasonResources();
  }

  processDeadPlant(card, stageDef) {
    card._deadCounter = (card._deadCounter || 0) + 1;
    // Check if needs are met (use dead state's needs if any, else always compost)
    const deadNeeds = stageDef.needs || {};
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
      console.log(`🌱 ${card.name} is now compost and can be planted into.`);
      return 'compost';
    }
    // Always reset resources for next season
    card.resetSeasonResources && card.resetSeasonResources();
    return 'dead';
  }

  // Handle compost planting
  processCompostPlanting(card, player, cardDefinitionId) {
    if (card.state === 'compost' && card.justPlantedSeed) {
      // Create new seedling to replace compost
      const Card = require('../Card');
      const all = [...this.cardsData.plants, ...this.cardsData.ingredients, ...this.cardsData.teas];
      const def = all.find((c) => c.id === cardDefinitionId);
      if (def) {
        const newSeedling = new Card(def, 'seedling');
        return newSeedling;
      }
    }
    return null;
  }
}

module.exports = PlantManager;