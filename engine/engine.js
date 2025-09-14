// engine/engine.js
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

  // Small helper to show a peek (for Green Tea)
  peekWeather(n = 1) {
    console.log("🔎 Peeking at the next weather event(s):");
    for (let i = 0; i < n; i++) {
      console.log("  -", this.weatherSystem.pickWeatherEvent(this.getCurrentSeason()));
    }
  }
}

module.exports = TeaTimeEngine;