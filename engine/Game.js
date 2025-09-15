const TeaTimeEngine = require("./engine");
const cardsData = require("../data/Cards.json");
const weatherData = require("../data/weather.json");

// Game class now delegates to the new modular engine
class Game {
  constructor() {
    // Initialize the new modular engine
    this.engine = new TeaTimeEngine(cardsData, weatherData);
    
    // Expose commonly used properties for backward compatibility
    this.player = this.engine.player;
    this.cards = this.engine.cardsData;
    this.weather = this.engine.weatherData;
    this.actionsPerSeason = this.engine.getActionsPerSeason();
  }

  // Delegate to engine for current season
  get currentSeason() {
    return this.engine.getCurrentSeason();
  }

  // Delegate methods to engine
  waitAction() {
    return this.engine.waitAction();
  }

  harvestSeedFromGarden(idx) {
    return this.engine.harvestSeedFromGarden(idx);
  }

  plantSeedFromZone(zone, idx) {
    return this.engine.plantSeedFromZone(zone, idx);
  }

  triggerWeather() {
    return this.engine.triggerWeather();
  }

  endSeasonProcessing() {
    return this.engine.endSeasonProcessing();
  }

  peekWeather(n = 1) {
    return this.engine.peekWeather(n);
  }

  // For backward compatibility
  createCard(cardId, state = null) {
    return this.engine.createCard(cardId, state);
  }

  // Expose internal methods for testing
  applyWeather(event) {
    return this.engine.applyWeather(event);
  }

  // Delegate Green Tea prediction method for easier access
  simulatePlantFuture(plantCard, actionsToSimulate = 48) {
    return this.engine.simulatePlantFuture(plantCard, actionsToSimulate);
  }

  // Delegate Green Tea consumption method
  consumeGreenTeaWithPlantSelection(teaCard, plantIndex) {
    return this.engine.consumeGreenTeaWithPlantSelection(teaCard, plantIndex);
  }

  // Delegate Oolong Tea consumption method
  consumeOolongTeaWithPlantSelection(teaCard, plantIndex) {
    return this.engine.consumeOolongTeaWithPlantSelection(teaCard, plantIndex);
  }

  // === Timeline System Methods ===

  // Create a comprehensive timeline for all garden plants
  createTimeline(actionsToSimulate = 48) {
    return this.engine.createTimeline(actionsToSimulate);
  }

  // Get detailed forecast with timeline data
  getDetailedForecast(actionsToSimulate = 12) {
    return this.engine.getDetailedForecast(actionsToSimulate);
  }

  // Peek at weather using timeline system
  peekTimelineWeather(n = 1) {
    return this.engine.peekTimelineWeather(n);
  }
}

module.exports = Game;
