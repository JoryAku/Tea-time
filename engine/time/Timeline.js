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
}

module.exports = Timeline;