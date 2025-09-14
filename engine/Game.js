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
}

module.exports = Game;
