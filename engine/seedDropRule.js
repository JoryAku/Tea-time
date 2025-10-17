// Pure helper to compute seed drop chance from in-game data
function clamp01(v) {
  return Math.max(0, Math.min(1, v || 0));
}

function computeSeedDropChance(plant, merged, month, garden, cfg) {
  cfg = cfg || {};
  const baseRate = typeof cfg.baseRate === 'number' ? cfg.baseRate : 0.05;
  const minGrowthToDrop = typeof cfg.minGrowthToDrop === 'number' ? cfg.minGrowthToDrop : 0.05;

  const growth = clamp01(plant && plant.growth);
  const health = clamp01(plant && plant.health);
  if (growth < minGrowthToDrop) return 0;
  if (!plant || plant.stage !== 'fruiting') return 0;

  // weather-derived scores (merged expected to have temp, humidity, wind, light)
  const idealTemp = typeof cfg.idealTemp === 'number' ? cfg.idealTemp : 0.6;
  const tempTolerance = typeof cfg.tempTolerance === 'number' ? cfg.tempTolerance : 0.3;
  const humidityMin = typeof cfg.humidityMin === 'number' ? cfg.humidityMin : 0.3;
  const windMax = typeof cfg.windMax === 'number' ? cfg.windMax : 0.5;

  const tempScore = (typeof merged.temp === 'number')
    ? Math.max(0, 1 - (Math.abs(merged.temp - idealTemp) / tempTolerance))
    : 1;
  const humidityScore = (typeof merged.humidity === 'number')
    ? Math.min(1, merged.humidity / humidityMin)
    : 1;
  const windScore = (typeof merged.wind === 'number')
    ? ((merged.wind <= windMax) ? 1 : Math.max(0, 1 - ((merged.wind - windMax) / (1 - windMax))))
    : 1;
  const weatherScore = (0.5 * tempScore) + (0.3 * humidityScore) + (0.2 * windScore);

  const pollinationProxy = (merged.light || 0) * (1 - (merged.wind || 0));

  // neighbor factor
  let neighbors = 0;
  try {
    const radius = typeof cfg.neighborRadius === 'number' ? cfg.neighborRadius : 1;
    if (Array.isArray(garden)) {
      garden.forEach(p => {
        if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return;
        const dx = Math.abs((p.x || 0) - (plant.x || 0));
        const dy = Math.abs((p.y || 0) - (plant.y || 0));
        if (dx <= radius && dy <= radius && (p.stage === 'flowering' || p.stage === 'fruiting') && p !== plant) neighbors += 1;
      });
    }
  } catch (e) {}
  const expectedNeighborCount = typeof cfg.expectedNeighborCount === 'number' ? cfg.expectedNeighborCount : 3;
  const neighborFactor = Math.min(1, 0.2 + 0.8 * (neighbors / expectedNeighborCount));

  // seasonal factor
  const seasonFactor = (Array.isArray(cfg.seasonMonths) && cfg.seasonMonths.length > 0)
    ? (cfg.seasonMonths.includes(month) ? 1 : 0.25)
    : 1;

  let chance = baseRate * Math.max(growth, minGrowthToDrop) * health;
  chance *= Math.max(0, weatherScore) * Math.max(0, pollinationProxy) * Math.max(0, neighborFactor) * Math.max(0, seasonFactor);
  return clamp01(chance);
}

module.exports = { computeSeedDropChance };
