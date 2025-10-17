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
    // Populate initial weatherVane interpretation so UI has a value at startup
    try {
      const interpStart = weatherVane.interpretFromWeatherSystem(this.weatherSystem);
      this.player.weatherVane = interpStart;
    } catch (e) {
      this.player.weatherVane = null;
    }
    // Initialize plant manager with card definitions
    try {
      this.plantManager = new PlantManager(cardsData);
    } catch (e) {
      // if PlantManager fails to initialize, continue without plants
      this.plantManager = null;
    }
    // Initialize garden field (size based on number of plants or default)
    try {
      this.gardenField = new GardenField(8);
    } catch (e) {
      this.gardenField = null;
    }
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

    // Update the player's weatherVane (human readable interpretation)
    try {
      // can pass options here later (e.g. configurable threshold)
      const interp = weatherVane.interpretFromWeatherSystem(this.weatherSystem);
      this.player.weatherVane = interp;
    } catch (e) {
      // ignore
    }

    // Apply weather to the garden field so the local environment changes
    try {
      if (this.gardenField) {
        const weatherVec = {
          light: this.weatherSystem ? this.weatherSystem.light : 0.5,
          temp: this.weatherSystem ? this.weatherSystem.temp : 0.5,
          humidity: this.weatherSystem ? this.weatherSystem.humidity : 0.5,
          wind: this.weatherSystem && this.weatherSystem.windVector ? this.weatherSystem.windVector.magnitude : 0
        };
        this.gardenField.applyWeather(weatherVec, 0.5); // apply at half strength
        this.gardenField.dissipate(0.995);
      }
    } catch (e) {
      // ignore garden field errors
    }

    // Update plants in the player's garden with the new monthly weather
    try {
      if (this.plantManager && Array.isArray(this.player.garden) && this.player.garden.length > 0) {
        this.player.garden.forEach((plant, idx) => {
          try {
            // Determine a target cell for the plant. Prefer explicit plant.x/y if present.
            let cellX = (typeof plant.x === 'number') ? plant.x : null;
            let cellY = (typeof plant.y === 'number') ? plant.y : null;
            let cellIndex = null;
            if (cellX === null || cellY === null) {
              // fallback mapping by index
              cellIndex = idx % (this.gardenField ? this.gardenField.size : 1);
            }

            const localVec = this.gardenField
              ? (cellIndex !== null ? this.gardenField.getCell(cellIndex).toObject() : this.gardenField.getCell(cellX, cellY).toObject())
              : { light: 0.5, temp: 0.5, humidity: 0.5, wind: 0 };

            // Merge weather global vector with local garden vector (local gets small weight)
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

            // Allow plants to emit an influence vector back into the field based on plant properties
            if (this.gardenField) {
              const targetX = (cellIndex !== null) ? this.gardenField._idxToXY(cellIndex)[0] : cellX;
              const targetY = (cellIndex !== null) ? this.gardenField._idxToXY(cellIndex)[1] : cellY;

              // default influence derived from plant size/growth/health if no explicit emit field
              const influence = plant.emit || {
                light: -0.01 * (plant.growth || 0), // taller plants reduce local light
                temp: 0, // plants have small temp influence for now
                humidity: -0.02 * (plant.rootSpread || 1) * (plant.growth || 0), // roots reduce moisture
                wind: 0
              };
              this.gardenField.emitAt(targetX, targetY, influence, 1);

              // Mulch drop: mature plants drop mulch to adjacent cells which slightly increases humidity/nutrients
              try {
                if (plant.stage === 'mature' || plant.stage === 'flowering') {
                  const mulchInfluence = { light: 0, temp: 0, humidity: 0.02 * (plant.growth || 1), wind: 0 };
                  // drop to 4-neighbors
                  const neighbors = [[1,0],[-1,0],[0,1],[0,-1]];
                  neighbors.forEach(([dx,dy]) => {
                    const nx = targetX + dx;
                    const ny = targetY + dy;
                    // ensure cell exists (field will expand if outside current bounds)
                    this.gardenField.getCell(nx, ny);
                    this.gardenField.emitAt(nx, ny, mulchInfluence, 0.6);
                  });
                }
              } catch (e) {
                // ignore mulch errors
              }

              // Seed drop: fruiting plants occasionally drop seeds into adjacent empty spots
              try {
                if (plant.stage === 'fruiting') {
                  // chance scaled by growth and health
                  const chance = 0.05 * (plant.growth || 1) * (plant.health || 1);
                  if (Math.random() < chance) {
                    // choose a random neighbor including diagonals
                    const deltas = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
                    const choice = deltas[Math.floor(Math.random() * deltas.length)];
                    const sx = targetX + choice[0];
                    const sy = targetY + choice[1];
                    // ensure cell exists (may expand garden)
                    this.gardenField.getCell(sx, sy);
                    // determine if target spot is empty (no plant assigned to those coords)
                    const occupied = this.player.garden.some(p => p.x === sx && p.y === sy);
                    if (!occupied) {
                      // create a new seed plant and assign spatial coords
                      const newSeed = {
                        id: plant.id || (plant.species || 'unknown'),
                        name: plant.name || 'seed',
                        species: plant.species || null,
                        ideal: plant.ideal || null,
                        health: 0.6,
                        growth: 0.0,
                        stage: 'seed',
                        x: sx,
                        y: sy
                      };
                      this.player.garden.push(newSeed);
                    }
                  }
                }
              } catch (e) {
                // ignore seed drop errors
              }
            }
          } catch (err) {
            // don't let a single plant failure break the loop
            console.error('Warning: plant update failed', err && err.message);
          }
        });
      }
    } catch (err) {
      // ignore whole-plant update errors for now
    }

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