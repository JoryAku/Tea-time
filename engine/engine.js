const TimeManager = require('./time/TimeManager');
const WeatherSystem = require('./weather/WeatherSystem');
const Player = require('./Player');

class TeaTimeEngine {
  constructor(weatherData) {
    this.weatherData = weatherData;
    
    // Initialize subsystems
    this.timeManager = new TimeManager();
    this.weatherSystem = new WeatherSystem(weatherData);
    // Initialize player
    this.player = new Player();
    this.months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  }

  // Get current game state info
  getCurrentMonth() {
    return this.timeManager.getCurrentMonth();
  }

  // Wait action: uses up one action, triggers weather
  waitAction() {
    this.triggerWeather();
    return true;
  }

  // Trigger weather event after each action
  triggerWeather() {
    const currentMonth = this.getCurrentMonth(); // e.g., "jan"

    if (this.weatherSystem.month !== currentMonth) {
      this.weatherSystem.updateForMonth(currentMonth, this.boundsData);
    }
    console.log(`\n🌦 Weather: ${this.weatherSystem.toString()}`);
  }

  // Helper method to get next month in cycle
  getNextMonth(currentMonth) {
    const currentIndex = months.indexOf(currentMonth);
    return months[(currentIndex + 1) % months.length];
  }
}

module.exports = TeaTimeEngine;