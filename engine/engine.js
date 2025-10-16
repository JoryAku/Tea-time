const TimeManager = require('./time/TimeManager');
const WeatherSystem = require('./weather/WeatherSystem');
const weatherVane = require('./weather/weatherVane');
const Player = require('./Player');
const Timeline = require('./time/Timeline');
const PlantManager = require('./plants/PlantManager');
const cardsData = require('../data/Cards.json');

class TeaTimeEngine {
  constructor(weatherData, calendarData) {
    this.weatherData = weatherData;
    
    // Initialize subsystems
    this.timeManager = new TimeManager();
    // If calendar data provides a starting month index, initialize TimeManager to it
    if (calendarData && calendarData.startingMonth && typeof calendarData.startingMonth.index === 'number') {
      this.timeManager.monthIndex = calendarData.startingMonth.index;
      this.timeManager.currentMonth = this.timeManager.months[this.timeManager.monthIndex];
    }
    this.weatherSystem = new WeatherSystem(weatherData);
    this.calendar = calendarData;
    // Initialize weather for the starting month if possible
    try {
      const startMonth = this.timeManager.getCurrentMonth();
      if (this.weatherSystem && typeof this.weatherSystem.updateForMonth === 'function') {
        this.weatherSystem.updateForMonth(startMonth, this.weatherData);
      }
    } catch (err) {
      console.warn('Warning: failed to initialize weather for starting month', err.message);
    }
    // Initialize player
    this.player = new Player();
    // Populate initial weatherVane interpretation so UI has a value at startup
    try {
      const interpStart = weatherVane.interpretFromWeatherSystem(this.weatherSystem);
      this.player.weatherVane = interpStart;
    } catch (e) {
      this.player.weatherVane = null;
    }
    // Initialize plant manager with card definitions
    try {
      this.plantManager = new PlantManager(cardsData);
    } catch (e) {
      // if PlantManager fails to initialize, continue without plants
      this.plantManager = null;
    }
    this.months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  }

  // Create and generate a timeline for given number of actions (months)
  createTimeline(months = 12) {
    const timeline = new Timeline(this, this.timeManager.getCurrentMonth());
    // Provide starting actions left (for simplicity, 1 action per month)
    timeline.startingActionsLeft = this.timeManager.getActionsPerMonth();
    timeline.startingMonth = this.timeManager.getCurrentMonth();
    // Initialize plant state maps used by Timeline
    timeline.plantStates = new Map();
    timeline.plantOutcomes = new Map();
    // Generate timeline
    return timeline.generateTimeline(months);
  }

  // Get current game state info
  getCurrentMonth() {
    return this.timeManager.getCurrentMonth();
  }

  // Wait action: uses up one action, triggers weather
  waitAction() {
    // Advance to the next month in the TimeManager
    const newMonth = this.timeManager.advanceMonth();

    // Update weather system for the new month
    try {
      if (this.weatherSystem && typeof this.weatherSystem.updateForMonth === 'function') {
        this.weatherSystem.updateForMonth(newMonth, this.weatherData);
      }
    } catch (err) {
      // swallow errors for now to keep tests focused
      console.error('Warning: failed to update weather for month', newMonth, err.message);
    }

    console.log(`\n⏭ Advanced month -> ${newMonth}`);
    console.log(`🌦 Weather: ${this.weatherSystem ? this.weatherSystem.toString() : 'unknown'}`);

    // Update the player's weatherVane (human readable interpretation)
    try {
      // can pass options here later (e.g. configurable threshold)
      const interp = weatherVane.interpretFromWeatherSystem(this.weatherSystem);
      this.player.weatherVane = interp;
    } catch (e) {
      // ignore
    }

    // Update plants in the player's garden with the new monthly weather
    try {
      if (this.plantManager && Array.isArray(this.player.garden) && this.player.garden.length > 0) {
        const weatherVector = {
          light: this.weatherSystem ? this.weatherSystem.light : 0.5,
          temp: this.weatherSystem ? this.weatherSystem.temp : 0.5,
          humidity: this.weatherSystem ? this.weatherSystem.humidity : 0.5,
          // use wind magnitude as the scalar wind component expected by PlantManager
          wind: this.weatherSystem && this.weatherSystem.windVector ? this.weatherSystem.windVector.magnitude : 0
        };

        this.player.garden.forEach((plant) => {
          try {
            this.plantManager.updatePlant(plant, weatherVector);
          } catch (err) {
            // don't let a single plant failure break the loop
            console.error('Warning: plant update failed', err && err.message);
          }
        });
      }
    } catch (err) {
      // ignore whole-plant update errors for now
    }

    return newMonth;
  }

  // Trigger weather event after each action
  triggerWeather() {
    const currentMonth = this.getCurrentMonth();
    if (this.weatherSystem && this.weatherSystem.month !== currentMonth) {
      this.weatherSystem.updateForMonth(currentMonth, this.weatherData);
    }
    try {
      const interp = weatherVane.interpretFromWeatherSystem(this.weatherSystem);
      this.player.weatherVane = interp;
    } catch (e) {
      // ignore
    }

    console.log(`\n🌦 Weather: ${this.weatherSystem.toString()}`);
  }

  // Helper method to get next month in cycle
  getNextMonth(currentMonth) {
    const currentIndex = this.months.indexOf(currentMonth);
    return this.months[(currentIndex + 1) % this.months.length];
  }
}

module.exports = TeaTimeEngine;