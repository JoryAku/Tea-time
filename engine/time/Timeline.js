// Comprehensive Timeline system that simulates weather events and plant states up to 4 years
class Timeline {
  constructor(engine, startingMonth) {
    this.engine = engine;
    this.startingMonth = startingMonth;
    
    // Timeline storage
    this.events = []; // Array of daily events with {weather}
    this.isLocked = false;
    this.maxActions = 48; // 4 years = 48 actions
    this.months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  }

  /**
   * Generate a complete timeline from present conditions for specified actions
   * @param {number} monthsToSimulate - Number of actions to simulate (default 48)
   * @returns {Object} Complete timeline with events and outcomes
   */
  generateTimeline(monthsToSimulate = 48) {
    this.maxActions = Math.min(monthsToSimulate, 48);
    this.events = [];
    this.plantStates.clear();
    this.plantOutcomes.clear();
    
    // Phase 2: Generate weather events ensuring outcomes are met
    const weatherForecast = this._generateTimelineWeatherEvents(monthsToSimulate);
    
    // Phase 3: Simulate daily progression and record state changes
    this._simulateTimelineProgression(weatherForecast, monthsToSimulate);

    // Lock the timeline
    this.isLocked = true;
    
    return {
      events: this.events,
      isLocked: this.isLocked,
      totalActions: monthsToSimulate
    };
  }

  /**
   * Get weather event for a specific action
   * @param {number} actionNumber - Action number (1-indexed)
   * @returns {Object} Weather event details
   */
  getWeatherAtAction(actionNumber) {
    if (actionNumber < 1 || actionNumber > this.events.length) {
      return null;
    }
    
    return this.events[actionNumber - 1];
  }

  /**
   * Generate weather events using predetermined forecast from engine
   * @private
   */
  _generateTimelineWeatherEvents(monthsToSimulate) {
    // Use predetermined forecast from engine if available
    if (this.engine.weatherForecastLocked && this.engine.weatherSystem.predeterminedForecast) {
      const forecast = this.engine.weatherSystem.predeterminedForecast.slice(0, monthsToSimulate);
      console.log(`📋 Using predetermined weather forecast (${forecast.length} months)`);
      return forecast;
    }
    
    // Fallback: generate outcome-driven forecast (legacy behavior)
    const forecast = [];
    
    for (let action = 1; action <= monthsToSimulate; action++) {
      const month = this._getMonthForAction(action);
      const seasonWeather = this.engine.weatherData[month];
      
      // Collect constraints from all plant outcomes
      let availableEvents = [...seasonWeather];

      // Fallback if no events available
      if (availableEvents.length === 0) {
        availableEvents = seasonWeather;
      }
      
      // Select event using weighted probability
      const selectedEvent = this._selectWeatherFromAvailable(availableEvents);
      forecast.push(selectedEvent);
    }
    
    return forecast;
  }

  /**
   * Simulate progression and record all state changes
   * @private
   */
  _simulateTimelineProgression(weatherForecast, monthsToSimulate) {    
    let currentMonth = this.startingMonth;
    let monthActionCounter = this.startingActionsLeft;

    for (let action = 1; action <= monthsToSimulate; action++) {
      // Handle month transitions
      if (monthActionCounter <= 0) {
        currentMonth = this._getNextMonth(currentMonth);
        monthActionCounter = this.engine.timeManager.getActionsPerMonth();
      }

      monthActionCounter--;

      // Apply weather event
      const weatherEvent = weatherForecast[action - 1];
      const conditions = this.engine.weatherSystem.getEventConditions(currentMonth, weatherEvent);

      // Record the daily event
      this.events.push({
        action: action,
        month: currentMonth,
        weather: weatherEvent,
        conditions: conditions,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get season for a specific action number
   * @private
   */
  _getMonthForAction(actionNumber) {
    const actionsPerMonth = this.engine.timeManager.getActionsPerMonth();
    const currentMonthActionsLeft = this.startingActionsLeft;

    if (actionNumber <= currentMonthActionsLeft) {
      return this.startingMonth;
    }

    const actionsAfterCurrentMonth = actionNumber - currentMonthActionsLeft;
    const monthsAhead = Math.floor((actionsAfterCurrentMonth - 1) / actionsPerMonth) + 1;

    const currentIndex = this.months.indexOf(this.startingMonth);
    const targetIndex = (currentIndex + monthsAhead) % this.months.length;

    return this.months[targetIndex];
  }

  /**
   * Get next month in cycle
   * @private
   */
  _getNextMonth(currentMonth) {
    const currentIndex = this.months.indexOf(currentMonth);
    return this.months[(currentIndex + 1) % this.months.length];
  }
}

module.exports = Timeline;