const weatherVane = require('./weather/weatherVane');
const { computeSeedDropChance } = require('./seedDropRule');

class EnvironmentMediator {
  constructor({ timeManager, weatherSystem, gardenField, plantManager, player, weatherData, rng = Math.random, config = {} } = {}) {
    this.timeManager = timeManager;
    this.weatherSystem = weatherSystem;
    this.gardenField = gardenField;
    this.plantManager = plantManager;
    this.player = player;
    this.weatherData = weatherData;
    this.rng = (typeof rng === 'function') ? rng : Math.random;
    this.config = config || {};
    // default seed drop configuration (tunable)
    this.config.seedDrop = Object.assign({
      baseRate: 0.05,
      // season months (use TimeManager month strings); if empty/null, seasonality is disabled
      seasonMonths: ['oct','nov','dec'],
      idealTemp: 0.6,
      tempTolerance: 0.3,
      humidityMin: 0.3,
      windMax: 0.5,
      neighborRadius: 1,
      expectedNeighborCount: 3,
      // minimum growth threshold used in probability (prevents drops from tiny seedlings)
      minGrowthToDrop: 0.05
    }, this.config.seedDrop || {});
  }

  // Run one tick (advance month and apply all phases)
  tick() {
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
      if (this.player) this.player.weatherVane = interp;
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

    // prepare trace
    const trace = { month: newMonth, weather: null, plants: [] };
    try {
      if (this.weatherSystem) {
        trace.weather = {
          light: this.weatherSystem.light,
          temp: this.weatherSystem.temp,
          humidity: this.weatherSystem.humidity,
          wind: this.weatherSystem.windVector ? this.weatherSystem.windVector.magnitude : 0,
          pressureHpa: (typeof this.weatherSystem.getPressureHpa === 'function') ? this.weatherSystem.getPressureHpa() : null
        };
      }

      if (this.plantManager && this.player && Array.isArray(this.player.garden) && this.player.garden.length > 0) {
        this.player.garden.forEach((plant, idx) => {
          try {
            const plantReport = { idx, id: plant.id || null, name: plant.name || null, x: plant.x, y: plant.y, pre: null, perception: null, post: null, actions: [] };

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

            plantReport.pre = { stage: plant.stage, health: plant.health, growth: plant.growth };
            plantReport.perception = { local: localVec, merged };

            this.plantManager.updatePlant(plant, merged);

            // after update
            plantReport.post = { stage: plant.stage, health: plant.health, growth: plant.growth };

            if (this.gardenField) {
              const targetX = (cellIndex !== null) ? this.gardenField._idxToXY(cellIndex)[0] : cellX;
              const targetY = (cellIndex !== null) ? this.gardenField._idxToXY(cellIndex)[1] : cellY;

              // base influence
              const influence = plant.emit || { light: -0.01 * (plant.growth || 0), temp:0, humidity: -0.02 * (plant.rootSpread || 1) * (plant.growth || 0), wind:0 };

              // emit to plant layers
              if (typeof this.gardenField.emitToPlantLayers === 'function') {
                this.gardenField.emitToPlantLayers(targetX, targetY, plant, influence, 1);
                plantReport.actions.push({ type: 'emit', target: { x: targetX, y: targetY }, influence, layers: plant.layers || null });
              } else {
                this.gardenField.emitAt(targetX, targetY, influence, 1);
                plantReport.actions.push({ type: 'emit', target: { x: targetX, y: targetY }, influence });
              }

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
                    plantReport.actions.push({ type: 'rootSpread', target: { x: nx, y: ny }, influence: rootInfluence, strength: 0.5 * growthFactor });
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
                    plantReport.actions.push({ type: 'leafSpread', target: { x: nx, y: ny }, leafInfluence, organicInfluence, strengths: { leaf: 0.6 * growthFactor, organic: 0.4 * growthFactor } });
                  });
                }

                if (plant.stage === 'seedling') {
                  const sRoot = { light:0, temp:0, humidity: -0.015 * growthFactor, wind:0 };
                  const nb = [[1,0],[-1,0],[0,1],[0,-1]];
                  nb.forEach(([dx,dy]) => {
                    const nx = targetX + dx; const ny = targetY + dy;
                    try { this.gardenField.emitToPlantLayers(nx, ny, { layers: ['root'] }, sRoot, 0.7 * healthFactor); } catch (e) {}
                    plantReport.actions.push({ type: 'seedlingRootSpread', target: { x: nx, y: ny }, influence: sRoot, strength: 0.7 * healthFactor });
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
                    plantReport.actions.push({ type: 'mulch', target: { x: nx, y: ny }, influence: mulchInfluence, strength: 0.6 });
                  });
                }
              } catch (e) {}

              // seed drop
              try {
                if (plant.stage === 'fruiting') {
                  const cfg = this.config.seedDrop || {};

                  // basic growth/health gating
                  const growth = Math.max(0, Math.min(1, plant.growth || 0));
                  const health = Math.max(0, Math.min(1, plant.health || 0));
                  if (growth < (cfg.minGrowthToDrop || 0)) {
                    // too small to realistically produce seed
                  } else {
                    // weather-based scores
                    const tempScore = (typeof merged.temp === 'number')
                      ? Math.max(0, 1 - (Math.abs(merged.temp - (cfg.idealTemp || 0.6)) / (cfg.tempTolerance || 0.3)))
                      : 1;
                    const humidityScore = (typeof merged.humidity === 'number')
                      ? Math.min(1, (merged.humidity || 0) / (cfg.humidityMin || 0.3))
                      : 1;
                    const windScore = (typeof merged.wind === 'number')
                      ? ((merged.wind || 0) <= (cfg.windMax || 0.5) ? 1 : Math.max(0, 1 - ((merged.wind - (cfg.windMax || 0.5)) / (1 - (cfg.windMax || 0.5)))))
                      : 1;
                    const weatherScore = (0.5 * tempScore) + (0.3 * humidityScore) + (0.2 * windScore);

                    // pollination proxy: higher light and lower wind encourages insects
                    const pollinationProxy = (merged.light || 0) * (1 - (merged.wind || 0));

                    // neighbor factor: count nearby flowering/fruiting plants
                    let neighbors = 0;
                    try {
                      const radius = cfg.neighborRadius || 1;
                      this.player.garden.forEach(p => {
                        if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return;
                        const dx = Math.abs(p.x - targetX);
                        const dy = Math.abs(p.y - targetY);
                        if (dx <= radius && dy <= radius && (p.stage === 'flowering' || p.stage === 'fruiting')) {
                          // exclude self
                          if (p !== plant) neighbors += 1;
                        }
                      });
                    } catch (e) {}
                    const expected = cfg.expectedNeighborCount || 3;
                    const neighborFactor = Math.min(1, 0.2 + 0.8 * (neighbors / expected));

                    // seasonal factor: if seasonMonths defined, give a boost in-season
                    const seasonFactor = (Array.isArray(cfg.seasonMonths) && cfg.seasonMonths.length > 0)
                      ? (cfg.seasonMonths.includes(newMonth) ? 1 : 0.25)
                      : 1;

                    // final probability composition
                    // delegate probability computation to pure helper for testability
                    const chance = computeSeedDropChance(Object.assign({}, plant), merged, newMonth, this.player.garden, cfg);
                    if (this.rng() < chance) {
                      const deltas = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
                      const choice = deltas[Math.floor(this.rng() * deltas.length)];
                      const sx = targetX + choice[0]; const sy = targetY + choice[1];
                      try { this.gardenField.getCell(sx, sy); } catch (e) { /* ignore missing cell */ }
                      const occupied = this.player.garden.some(p => p.x === sx && p.y === sy);
                      if (!occupied) {
                        const newSeed = { id: plant.id || (plant.species || 'unknown'), name: plant.name || 'seed', species: plant.species || null, ideal: plant.ideal || null, health:0.6, growth:0.0, stage:'seed', x: sx, y: sy };
                        this.player.garden.push(newSeed);
                        plantReport.actions.push({ type: 'seedDrop', target: { x: sx, y: sy }, seed: newSeed, chance });
                      }
                    }
                  }
                }
              } catch (e) {}
            }

            trace.plants.push(plantReport);
          } catch (err) {
            console.error('Warning: plant update failed', err && err.message);
          }
        });
      }
    } catch (err) {}

    // attach lastTrace and return both month and trace
    this.lastTrace = trace;
    return { month: newMonth, trace };
  }
}

module.exports = EnvironmentMediator;
