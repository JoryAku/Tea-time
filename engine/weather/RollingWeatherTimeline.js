// Rolling Weather Timeline system that maintains a 4-year rolling window
// Each turn, consumes the earliest event and generates a new one at the end

class RollingWeatherTimeline {
  constructor(weatherSystem, timeManager, startingSeason, startingActionsLeft) {
    this.weatherSystem = weatherSystem;
    this.timeManager = timeManager;
    this.currentTurn = 0; // Tracks absolute turn number since game start
    
    // Rolling window of weather events (48 events = 4 years)
    this.weatherEvents = [];
    this.timelineLength = 48; // 4 years * 4 seasons * 3 actions per season
    
    // Season tracking for weather generation
    this.currentSeason = startingSeason;
    this.currentActionsLeft = startingActionsLeft;
    
    // Generate initial 4-year timeline
    this.generateInitialTimeline();
  }

  /**
   * Generate the initial 4-year weather timeline
   */
  generateInitialTimeline() {
    this.weatherEvents = [];
    
    // Track season progression for weather generation
    let season = this.currentSeason;
    let actionsLeft = this.currentActionsLeft;
    
    for (let i = 0; i < this.timelineLength; i++) {
      // Generate weather event for current season
      const weatherEvent = this.weatherSystem.pickWeatherEvent(season);
      const conditions = this.weatherSystem.getEventConditions(season, weatherEvent);
      
      this.weatherEvents.push({
        turn: this.currentTurn + i + 1, // Future turn number
        season: season,
        weather: weatherEvent,
        conditions: conditions,
        generatedAt: Date.now()
      });
      
      // Advance season tracking
      actionsLeft--;
      if (actionsLeft <= 0) {
        season = this.getNextSeason(season);
        actionsLeft = this.timeManager.getActionsPerSeason();
      }
    }
  }

  /**
   * Consume the next weather event and advance the timeline
   * Called each turn/action to advance the rolling window
   * @returns {Object} The current weather event
   */
  advanceTimeline() {
    if (this.weatherEvents.length === 0) {
      throw new Error('Weather timeline is empty - cannot advance');
    }
    
    // Consume the first (current) weather event
    const currentWeatherEvent = this.weatherEvents.shift();
    
    // Update turn tracking
    this.currentTurn++;
    
    // Update season tracking
    this.currentActionsLeft--;
    if (this.currentActionsLeft <= 0) {
      this.currentSeason = this.getNextSeason(this.currentSeason);
      this.currentActionsLeft = this.timeManager.getActionsPerSeason();
    }
    
    // Generate a new weather event for the end of the timeline (4 years ahead)
    const futureTurn = this.currentTurn + this.timelineLength;
    const futureSeason = this.getSeasonForTurn(futureTurn);
    const futureWeather = this.weatherSystem.pickWeatherEvent(futureSeason);
    const futureConditions = this.weatherSystem.getEventConditions(futureSeason, futureWeather);
    
    // Add new event to the end
    this.weatherEvents.push({
      turn: futureTurn,
      season: futureSeason,
      weather: futureWeather,
      conditions: futureConditions,
      generatedAt: Date.now()
    });
    
    return currentWeatherEvent;
  }

  /**
   * Get weather event for a specific turn (1-indexed from current turn)
   * @param {number} turnsAhead - How many turns ahead to look (1 = next turn, 2 = turn after next, etc.)
   * @returns {Object|null} Weather event or null if out of range
   */
  getWeatherAtTurn(turnsAhead) {
    if (turnsAhead < 1 || turnsAhead > this.timelineLength) {
      return null;
    }
    
    const index = turnsAhead - 1; // Convert to 0-indexed
    return this.weatherEvents[index] || null;
  }

  /**
   * Get the current weather event (next event to be applied)
   * @returns {Object} Current weather event
   */
  getCurrentWeatherEvent() {
    return this.getWeatherAtTurn(1);
  }

  /**
   * Get multiple weather events ahead
   * @param {number} count - Number of events to retrieve
   * @returns {Array} Array of weather events
   */
  getWeatherForecast(count = 12) {
    const forecast = [];
    for (let i = 1; i <= Math.min(count, this.timelineLength); i++) {
      const event = this.getWeatherAtTurn(i);
      if (event) {
        forecast.push(event);
      }
    }
    return forecast;
  }

  /**
   * Get the full 4-year timeline (for Oolong Tea power)
   * @returns {Array} Complete timeline of weather events
   */
  getFullTimeline() {
    return [...this.weatherEvents]; // Return a copy to prevent external modification
  }

  /**
   * Get weather events for specific seasons within the timeline
   * @param {string} season - Season to filter for
   * @returns {Array} Weather events for the specified season
   */
  getWeatherForSeason(season) {
    return this.weatherEvents.filter(event => event.season === season);
  }

  /**
   * Get the season for a specific turn
   * @param {number} turn - Absolute turn number
   * @returns {string} Season name
   */
  getSeasonForTurn(turn) {
    // Calculate how many actions from the starting point
    const actionsFromStart = turn - this.currentTurn;
    
    // Account for remaining actions in current season
    let totalActions = this.currentActionsLeft + actionsFromStart - 1;
    
    // Calculate which season this falls into
    const actionsPerSeason = this.timeManager.getActionsPerSeason();
    const seasonsAhead = Math.floor(totalActions / actionsPerSeason);
    
    const seasons = this.timeManager.getAllSeasons();
    const currentSeasonIndex = seasons.indexOf(this.currentSeason);
    const targetSeasonIndex = (currentSeasonIndex + seasonsAhead) % seasons.length;
    
    return seasons[targetSeasonIndex];
  }

  /**
   * Get next season in the cycle
   * @param {string} currentSeason - Current season
   * @returns {string} Next season
   */
  getNextSeason(currentSeason) {
    const seasons = this.timeManager.getAllSeasons();
    const currentIndex = seasons.indexOf(currentSeason);
    return seasons[(currentIndex + 1) % seasons.length];
  }

  /**
   * Get debugging information about the timeline
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      currentTurn: this.currentTurn,
      currentSeason: this.currentSeason,
      currentActionsLeft: this.currentActionsLeft,
      timelineLength: this.timelineLength,
      eventsInTimeline: this.weatherEvents.length,
      nextWeatherEvent: this.getCurrentWeatherEvent(),
      lastGeneratedEvent: this.weatherEvents[this.weatherEvents.length - 1]
    };
  }

  /**
   * Reset the timeline (for testing or special scenarios)
   */
  reset() {
    this.currentTurn = 0;
    this.weatherEvents = [];
    this.generateInitialTimeline();
  }
}

module.exports = RollingWeatherTimeline;