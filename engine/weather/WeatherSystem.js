// engine/weather/WeatherSystem.js
// Handles weather generation and conditional event triggers

class WeatherSystem {
  constructor(weatherData) {
    this.weatherData = weatherData;
    this.gameStartTime = Date.now(); // Seed for deterministic weather
    this.predeterminedForecast = null; // Cached predetermined forecast
  }

  // Seeded random number generator for deterministic weather
  _seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Generate deterministic weather forecast for given number of actions
  getPredeterminedForecast(startingSeason, startingActionsLeft, totalActions) {
    // Use consistent seed based on game start time
    let seed = this.gameStartTime;
    const forecast = [];
    
    let currentSeason = startingSeason;
    let actionsLeftInSeason = startingActionsLeft;
    const actionsPerSeason = 3; // Standard actions per season
    
    for (let action = 1; action <= totalActions; action++) {
      // Handle season transitions
      if (actionsLeftInSeason <= 0) {
        currentSeason = this._getNextSeason(currentSeason);
        actionsLeftInSeason = actionsPerSeason;
      }
      actionsLeftInSeason--;
      
      // Get weather for this season using seeded random
      const seasonWeather = this.weatherData[currentSeason];
      const totalWeight = seasonWeather.reduce((sum, event) => sum + event.pct, 0);
      
      // Use seeded random to pick event
      const randomValue = this._seededRandom(seed) * totalWeight;
      let accumulator = 0;
      let selectedEvent = seasonWeather[seasonWeather.length - 1].event; // fallback
      
      for (const event of seasonWeather) {
        accumulator += event.pct;
        if (randomValue <= accumulator) {
          selectedEvent = event.event;
          break;
        }
      }
      
      forecast.push(selectedEvent);
      seed += 1; // Increment seed for next action
    }
    
    return forecast;
  }

  // Helper to get next season
  _getNextSeason(currentSeason) {
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentIndex = seasons.indexOf(currentSeason);
    return seasons[(currentIndex + 1) % seasons.length];
  }
  // Pick a weather event from the current season's distribution (use predetermined if available)
  pickWeatherEvent(season, actionNumber = null) {
    // If we have a predetermined forecast and action number, use that
    if (this.predeterminedForecast && actionNumber && actionNumber <= this.predeterminedForecast.length) {
      return this.predeterminedForecast[actionNumber - 1];
    }
    
    // Otherwise use random selection (legacy behavior)
    const table = this.weatherData[season];
    const r = Math.random() * 100;
    let acc = 0;
    for (const row of table) {
      acc += row.pct;
      if (r < acc) return row.event;
    }
    return table[table.length - 1].event;
  }

  // Set predetermined forecast for consistent predictions
  setPredeterminedForecast(forecast) {
    this.predeterminedForecast = forecast;
  }

  // Clear predetermined forecast to return to random behavior
  clearPredeterminedForecast() {
    this.predeterminedForecast = null;
  }

  // Get weather conditions for an event
  getEventConditions(season, event) {
    const seasonEvents = this.weatherData[season];
    const eventObj = seasonEvents.find(e => e.event === event);
    return (eventObj && eventObj.conditions) ? eventObj.conditions : [];
  }

  // Get random seasonal weather for season start
  getRandomSeasonalWeather(season) {
    const seasonWeather = this.weatherData[season];
    if (seasonWeather && seasonWeather.length > 0) {
      const idx = Math.floor(Math.random() * seasonWeather.length);
      return seasonWeather[idx];
    }
    return null;
  }
}

module.exports = WeatherSystem;