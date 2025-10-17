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

    // Seed a single default tea plant into the garden on game start.
    // Replace any existing starter plants so game always begins with only one starter.
    try {
      const plantDefs = (cards && cards.plants) || [];
      const teaDef = plantDefs.find(p => p.id === 'tea_plant' || p.id === 'tea');
      if (teaDef) {
        // clear any pre-existing garden entries
        this.player.garden = [];

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

        // If the engine has a gardenField, place the starter at the center of the field
        try {
          if (this.engine && this.engine.gardenField) {
            const gx = Math.floor(this.engine.gardenField.width / 2);
            const gy = Math.floor(this.engine.gardenField.height / 2);
            starter.x = gx;
            starter.y = gy;
          }
        } catch (e) {
          // ignore placement errors and fall back to non-spatial starter
        }

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
      interpretation: this.player && this.player.weatherVane ? this.player.weatherVane : null,
      toString: () => ws.toString(),
    };
  }

  // Return a lightweight garden snapshot for UI/tests
  peekGarden(options = {}) {
    const garden = (this.player && Array.isArray(this.player.garden)) ? this.player.garden : [];

    // Detailed plant objects if requested, otherwise a compact summary
    const plants = garden.map(p => {
      const base = (options.detailed) ? Object.assign({}, p) : {
        id: p.id || p.name || null,
        name: p.name || null,
        stage: p.stage || null,
        health: typeof p.health === 'number' ? p.health : null,
        growth: typeof p.growth === 'number' ? p.growth : null,
        x: (typeof p.x === 'number') ? p.x : null,
        y: (typeof p.y === 'number') ? p.y : null,
      };

      // add per-plant computed environment snapshot (merged local + weather) when engine available
      try {
        if (this.engine && this.engine.gardenField && this.engine.weatherSystem) {
          const gf = this.engine.gardenField;
          const cellX = (typeof p.x === 'number') ? p.x : null;
          const cellY = (typeof p.y === 'number') ? p.y : null;
          const cellIndex = (cellX === null || cellY === null) ? garden.indexOf(p) % (gf ? gf.size : 1) : null;
          const local = gf ? (cellIndex !== null ? gf.getPlantLocalByIndex(cellIndex, p) : gf.getPlantLocal(cellX, cellY, p)) : { light:0.5, temp:0.5, humidity:0.5, wind:0 };
          const weatherVec = { light: this.engine.weatherSystem.light, temp: this.engine.weatherSystem.temp, humidity: this.engine.weatherSystem.humidity, wind: this.engine.weatherSystem.windVector ? this.engine.weatherSystem.windVector.magnitude : 0 };
          const merged = { light: (weatherVec.light * 0.7) + (local.light * 0.3), temp: (weatherVec.temp * 0.7) + (local.temp * 0.3), humidity: (weatherVec.humidity * 0.7) + (local.humidity * 0.3), wind: (weatherVec.wind * 0.7) + (local.wind * 0.3) };
          base.plantEnv = merged;
        }
      } catch (e) {
        // ignore environment snapshot errors
      }

      return base;
    });

    // Basic field summary
    const fieldSummary = (this.engine && this.engine.gardenField) ? {
      width: this.engine.gardenField.width,
      height: this.engine.gardenField.height,
      size: this.engine.gardenField.size
    } : null;

    // If caller requested per-layer snapshot and the engine provides gardenField.snapshotLayers(), use it.
    let layers = null;
    if (options.layers && this.engine && this.engine.gardenField) {
      const gf = this.engine.gardenField;
      // Prefer a snapshotLayers API if present
      if (typeof gf.snapshotLayers === 'function') {
        try {
          layers = gf.snapshotLayers();
        } catch (e) {
          // fallback to building a manual snapshot
          layers = null;
        }
      }

      // Fallback: build a per-cell per-layer snapshot using available APIs
      if (!layers) {
        layers = [];
        try {
          for (let y = 0; gf && y < gf.height; y++) {
            const row = [];
            for (let x = 0; x < gf.width; x++) {
              const cell = gf.getCell ? gf.getCell(x, y) : null;
              if (cell) {
                // If the cell exposes a per-layer object, use it; otherwise use toObject()
                if (typeof cell.toLayerObject === 'function') {
                  row.push(cell.toLayerObject());
                } else if (typeof cell.toObject === 'function') {
                  // toObject may return an aggregated view; include it under a default layer
                  row.push({ aggregated: cell.toObject() });
                } else {
                  // best-effort: clone enumerable properties
                  const clone = {};
                  for (const k in cell) clone[k] = cell[k];
                  row.push(clone);
                }
              } else {
                row.push(null);
              }
            }
            layers.push(row);
          }
        } catch (e) {
          // if anything fails, set layers back to null
          layers = null;
        }
      }
    }

    return { plants, field: fieldSummary, layers };
  }
}

module.exports = Game;
