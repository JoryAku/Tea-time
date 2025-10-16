const TeaTimeEngine = require("./engine");
const weatherData = require("../data/weather.json");
const calendarData = require("../data/calendar.json");
const cards = require('../data/Cards.json');

// Game class now delegates to the new modular engine
class Game {
  constructor() {
    // Initialize the new modular engine
    this.engine = new TeaTimeEngine(weatherData, calendarData);
    
    // Expose commonly used properties for backward compatibility
    this.player = this.engine.player;
    this.weather = this.engine.weatherData;

    // Seed a default tea plant into the garden on game start
    try {
      const plantDefs = (cards && cards.plants) || [];
      const teaDef = plantDefs.find(p => p.id === 'tea_plant' || p.id === 'tea');
      if (teaDef) {
        // Try to pull an 'ideal' vector from the 'seed' state if available
        let idealVec = null;
        if (teaDef.states && teaDef.states.seed && Array.isArray(teaDef.states.seed.ideal)) {
          const arr = teaDef.states.seed.ideal;
          idealVec = { light: arr[0], temp: arr[1], humidity: arr[2], wind: arr[3] };
        }

        const starter = {
          id: teaDef.id || 'tea_plant',
          name: teaDef.name || 'Tea Plant',
          species: teaDef.species || null,
          ideal: idealVec || { light: 0.6, temp: 0.6, humidity: 0.7, wind: 0.1 },
          health: 0.6,
          growth: 0.0,
          stage: 'seed'
        };

        this.player.garden.push(starter);
      }
    } catch (e) {
      // ignore seeding errors to keep game initialization robust
    }
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
