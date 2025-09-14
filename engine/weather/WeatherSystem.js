// engine/weather/WeatherSystem.js
// Handles weather generation and conditional event triggers

class WeatherSystem {
  constructor(weatherData) {
    this.weatherData = weatherData;
  }

  // Pick a weather event from the current season's distribution
  pickWeatherEvent(season) {
    const table = this.weatherData[season];
    const r = Math.random() * 100;
    let acc = 0;
    for (const row of table) {
      acc += row.pct;
      if (r < acc) return row.event;
    }
    return table[table.length - 1].event;
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