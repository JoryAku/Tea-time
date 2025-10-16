const TeaTimeEngine = require("./engine");
const weatherData = require("../data/weather.json");
const calendarData = require("../data/calendar.json");

// Game class now delegates to the new modular engine
class Game {
  constructor() {
    // Initialize the new modular engine
    this.engine = new TeaTimeEngine(weatherData, calendarData);
    
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

  createTimeline(months) {
    return this.engine.createTimeline(months);
  }

  // Return a lightweight weather snapshot for UI/tests
  peekWeather() {
    if (!this.engine || !this.engine.weatherSystem) return null;
    const ws = this.engine.weatherSystem;
    return {
      month: ws.month,
      light: ws.light,
      temp: ws.temp,
      humidity: ws.humidity,
      pressureHpa: ws.getPressureHpa ? ws.getPressureHpa() : null,
      windVector: ws.windVector || null,
      toString: () => ws.toString(),
    };
  }
}

module.exports = Game;
