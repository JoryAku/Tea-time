const TimeManager = require('./time/TimeManager');
const WeatherSystem = require('./weather/WeatherSystem');
const weatherVane = require('./weather/weatherVane');
const Player = require('./Player');
const Timeline = require('./time/Timeline');
const PlantManager = require('./plants/PlantManager');
const GardenField = require('./garden/GardenField');
const cardsData = require('../data/Cards.json');
const EnvironmentMediator = require('./EnvironmentMediator');

class TeaTimeEngine {
  constructor(weatherData, calendarData) {
    this.weatherData = weatherData;

    this.timeManager = new TimeManager();
    if (calendarData && calendarData.startingMonth && typeof calendarData.startingMonth.index === 'number') {
      this.timeManager.monthIndex = calendarData.startingMonth.index;
      this.timeManager.currentMonth = this.timeManager.months[this.timeManager.monthIndex];
    }

    this.weatherSystem = new WeatherSystem(weatherData);
    this.calendar = calendarData;

    try {
      const startMonth = this.timeManager.getCurrentMonth();
      if (this.weatherSystem && typeof this.weatherSystem.updateForMonth === 'function') {
        this.weatherSystem.updateForMonth(startMonth, this.weatherData);
      }
    } catch (err) {
      console.warn('Warning: failed to initialize weather for starting month', err && err.message);
    }

    this.player = new Player();
    try {
      const interpStart = weatherVane.interpretFromWeatherSystem(this.weatherSystem);
      this.player.weatherVane = interpStart;
    } catch (e) {
      this.player.weatherVane = null;
    }

    try { this.plantManager = new PlantManager(cardsData); } catch (e) { this.plantManager = null; }

    try { this.gardenField = new GardenField(8, 6); } catch (e) { this.gardenField = null; }

    // Environment mediator centralizes interactions (preserve behavior by default)
    try {
      this.environmentMediator = new EnvironmentMediator({ timeManager: this.timeManager, weatherSystem: this.weatherSystem, gardenField: this.gardenField, plantManager: this.plantManager, player: this.player, weatherData: this.weatherData, rng: Math.random });
    } catch (e) {
      this.environmentMediator = null;
    }

    this.months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  }

  createTimeline(months = 12) {
    const timeline = new Timeline(this, this.timeManager.getCurrentMonth());
    timeline.startingActionsLeft = this.timeManager.getActionsPerMonth();
    timeline.startingMonth = this.timeManager.getCurrentMonth();
    timeline.plantStates = new Map();
    timeline.plantOutcomes = new Map();
    return timeline.generateTimeline(months);
  }

  getCurrentMonth() { return this.timeManager.getCurrentMonth(); }

  waitAction() {
    // Delegate all environment interaction phases to the mediator to preserve behavior.
    if (this.environmentMediator && typeof this.environmentMediator.tick === 'function') {
      const result = this.environmentMediator.tick();
      // mediator returns { month, trace }
      if (result && typeof result === 'object') {
        this.lastTrace = result.trace || null;
        return result.month || null;
      }
      return result;
    }
    // Fallback: if mediator missing, replicate previous behavior (shouldn't happen normally)
    const newMonth = this.timeManager.advanceMonth();
    try {
      if (this.weatherSystem && typeof this.weatherSystem.updateForMonth === 'function') this.weatherSystem.updateForMonth(newMonth, this.weatherData);
    } catch (e) {}
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