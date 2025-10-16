const TimeManager = require('./time/TimeManager');
const WeatherSystem = require('./weather/WeatherSystem');
const Player = require('./Player');
const Timeline = require('./time/Timeline');

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

    return newMonth;
  }

  // Trigger weather event after each action
  triggerWeather() {
    const currentMonth = this.getCurrentMonth();
    if (this.weatherSystem && this.weatherSystem.month !== currentMonth) {
      this.weatherSystem.updateForMonth(currentMonth, this.weatherData);
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