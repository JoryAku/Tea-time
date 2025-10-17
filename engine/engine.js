const TimeManager = require('./time/TimeManager');
const WeatherSystem = require('./weather/WeatherSystem');
const weatherVane = require('./weather/weatherVane');
const Player = require('./Player');
const Timeline = require('./time/Timeline');
const PlantManager = require('./plants/PlantManager');
const GardenField = require('./garden/GardenField');
const cardsData = require('../data/Cards.json');

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
    const newMonth = this.timeManager.advanceMonth();
    try {
      if (this.weatherSystem && typeof this.weatherSystem.updateForMonth === 'function') this.weatherSystem.updateForMonth(newMonth, this.weatherData);
    } catch (e) {
      console.error('Warning: failed to update weather for month', newMonth, e && e.message);
    }

    console.log(`\n⏭ Advanced month -> ${newMonth}`);
    console.log(`🌦 Weather: ${this.weatherSystem ? this.weatherSystem.toString() : 'unknown'}`);

    try {
      const interp = weatherVane.interpretFromWeatherSystem(this.weatherSystem);
      this.player.weatherVane = interp;
    } catch (e) {}

    // apply weather to garden
    try {
      if (this.gardenField) {
        const weatherVec = {
          light: this.weatherSystem ? this.weatherSystem.light : 0.5,
          temp: this.weatherSystem ? this.weatherSystem.temp : 0.5,
          humidity: this.weatherSystem ? this.weatherSystem.humidity : 0.5,
          wind: this.weatherSystem && this.weatherSystem.windVector ? this.weatherSystem.windVector.magnitude : 0
        };
        this.gardenField.applyWeather(weatherVec, 0.5);
        if (typeof this.gardenField.dissipate === 'function') this.gardenField.dissipate(0.995);
      }
    } catch (e) {}

    try {
      if (this.plantManager && Array.isArray(this.player.garden) && this.player.garden.length > 0) {
        this.player.garden.forEach((plant, idx) => {
          try {
            // location
            let cellX = (typeof plant.x === 'number') ? plant.x : null;
            let cellY = (typeof plant.y === 'number') ? plant.y : null;
            let cellIndex = null;
            if (cellX === null || cellY === null) cellIndex = idx % (this.gardenField ? this.gardenField.size : 1);

            const localVec = this.gardenField
              ? (cellIndex !== null ? this.gardenField.getPlantLocalByIndex(cellIndex, plant) : this.gardenField.getPlantLocal(cellX, cellY, plant))
              : { light:0.5, temp:0.5, humidity:0.5, wind:0 };

            const weatherVec = {
              light: this.weatherSystem ? this.weatherSystem.light : 0.5,
              temp: this.weatherSystem ? this.weatherSystem.temp : 0.5,
              humidity: this.weatherSystem ? this.weatherSystem.humidity : 0.5,
              wind: this.weatherSystem && this.weatherSystem.windVector ? this.weatherSystem.windVector.magnitude : 0
            };

            const merged = {
              light: (weatherVec.light * 0.7) + (localVec.light * 0.3),
              temp: (weatherVec.temp * 0.7) + (localVec.temp * 0.3),
              humidity: (weatherVec.humidity * 0.7) + (localVec.humidity * 0.3),
              wind: (weatherVec.wind * 0.7) + (localVec.wind * 0.3)
            };

            this.plantManager.updatePlant(plant, merged);

            if (this.gardenField) {
              const targetX = (cellIndex !== null) ? this.gardenField._idxToXY(cellIndex)[0] : cellX;
              const targetY = (cellIndex !== null) ? this.gardenField._idxToXY(cellIndex)[1] : cellY;

              // base influence
              const influence = plant.emit || { light: -0.01 * (plant.growth || 0), temp:0, humidity: -0.02 * (plant.rootSpread || 1) * (plant.growth || 0), wind:0 };

              // emit to plant layers
              if (typeof this.gardenField.emitToPlantLayers === 'function') this.gardenField.emitToPlantLayers(targetX, targetY, plant, influence, 1);
              else this.gardenField.emitAt(targetX, targetY, influence, 1);

              // root spread for plants that include root
              try {
                const layers = Array.isArray(plant.layers) && plant.layers.length > 0 ? plant.layers : ['understory'];
                const growthFactor = plant.growth || 0;
                const healthFactor = plant.health || 0;

                if (layers.includes('root')) {
                  const rootInfluence = { light:0, temp:0, humidity: -0.01 * growthFactor, wind:0 };
                  const neighbors = [[1,0],[-1,0],[0,1],[0,-1]];
                  neighbors.forEach(([dx,dy]) => {
                    const nx = targetX + dx; const ny = targetY + dy;
                    try { this.gardenField.getCell(nx, ny); } catch (e) {}
                    try { this.gardenField.emitToPlantLayers(nx, ny, { layers:['root'] }, rootInfluence, 0.5 * growthFactor); } catch (e) { this.gardenField.emitAt(nx, ny, rootInfluence, 0.5 * growthFactor); }
                  });
                }

                const leafLayers = ['emergent','canopy','understory'];
                const occupiesLeaf = layers.some(l => leafLayers.includes(l));
                if (occupiesLeaf) {
                  const leafInfluence = { light: -0.02 * growthFactor, temp:0, humidity: 0.005 * growthFactor, wind:0 };
                  const organicInfluence = { light:0, temp:0, humidity:0, wind:0, organic: 0.01 * growthFactor };
                  const neighbors8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
                  neighbors8.forEach(([dx,dy]) => {
                    const nx = targetX + dx; const ny = targetY + dy;
                    try { this.gardenField.getCell(nx, ny); } catch (e) {}
                    try {
                      this.gardenField.emitToPlantLayers(nx, ny, { layers: ['understory'] }, leafInfluence, 0.6 * growthFactor);
                      this.gardenField.emitToPlantLayers(nx, ny, { layers: ['undergrowth'] }, organicInfluence, 0.4 * growthFactor);
                    } catch (e) {
                      this.gardenField.emitAt(nx, ny, { light: leafInfluence.light }, 0.6 * growthFactor);
                    }
                  });
                }

                if (plant.stage === 'seedling') {
                  const sRoot = { light:0, temp:0, humidity: -0.015 * growthFactor, wind:0 };
                  const nb = [[1,0],[-1,0],[0,1],[0,-1]];
                  nb.forEach(([dx,dy]) => {
                    const nx = targetX + dx; const ny = targetY + dy;
                    try { this.gardenField.emitToPlantLayers(nx, ny, { layers: ['root'] }, sRoot, 0.7 * healthFactor); } catch (e) {}
                  });
                }
              } catch (e) {}

              // mulch
              try {
                if (plant.stage === 'mature' || plant.stage === 'flowering') {
                  const mulchInfluence = { light:0, temp:0, humidity: 0.02 * (plant.growth || 1), wind:0 };
                  const neighbors = [[1,0],[-1,0],[0,1],[0,-1]];
                  neighbors.forEach(([dx,dy]) => {
                    const nx = targetX + dx; const ny = targetY + dy;
                    this.gardenField.getCell(nx, ny);
                    this.gardenField.emitAt(nx, ny, mulchInfluence, 0.6);
                  });
                }
              } catch (e) {}

              // seed drop (unchanged)
              try {
                if (plant.stage === 'fruiting') {
                  const chance = 0.05 * (plant.growth || 1) * (plant.health || 1);
                  if (Math.random() < chance) {
                    const deltas = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
                    const choice = deltas[Math.floor(Math.random() * deltas.length)];
                    const sx = targetX + choice[0]; const sy = targetY + choice[1];
                    this.gardenField.getCell(sx, sy);
                    const occupied = this.player.garden.some(p => p.x === sx && p.y === sy);
                    if (!occupied) {
                      const newSeed = { id: plant.id || (plant.species || 'unknown'), name: plant.name || 'seed', species: plant.species || null, ideal: plant.ideal || null, health:0.6, growth:0.0, stage:'seed', x: sx, y: sy };
                      this.player.garden.push(newSeed);
                    }
                  }
                }
              } catch (e) {}
            }
          } catch (err) {
            console.error('Warning: plant update failed', err && err.message);
          }
        });
      }
    } catch (err) {}

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