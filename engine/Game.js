const TeaTimeEngine = require("./engine");
const weatherData = require("../data/weather.json");

// Game class now delegates to the new modular engine
class Game {
  constructor() {
    // Initialize the new modular engine
    this.engine = new TeaTimeEngine(weatherData);
    
    // Expose commonly used properties for backward compatibility
    this.player = this.engine.player;
    this.weather = this.engine.weatherData;
  }

  // Delegate to engine for current month
  get currentMonth() {
    return this.engine.getCurrentMonth();
  }

  // Delegate methods to engine
  waitAction() {
    return this.engine.waitAction();
  }

  triggerWeather() {
    return this.engine.triggerWeather();
  }

  // Expose internal methods for testing
  applyWeather(event) {
    return this.engine.applyWeather(event);
  }
}

module.exports = Game;
