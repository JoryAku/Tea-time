
class PlantManager {
  constructor(cardsData) {
    this.cardsData = cardsData;
  }

  /**
   * Update a single plant using a 4D environmental vector: light,temp,humidity,wind
   * @param {object} plant - plant instance with .ideal, .current, .health, .growth
   * @param {object} weatherVector - { light, temp, humidity, wind }
   */
  updatePlant(plant, weatherVector) {
    // Ensure weatherVector has all 4 components
    const w = {
      light: safeNum(weatherVector.light),
      temp: safeNum(weatherVector.temp),
      humidity: safeNum(weatherVector.humidity),
      wind: safeNum(weatherVector.wind)
    };

    // Ensure plant has ideal vector
    const ideal = plant.ideal || plant.vector && plant.vector.ideal || {
      light: 0.5, temp: 0.5, humidity: 0.5, wind: 0.0
    };

    // Euclidean distance in 4D
    const distance = euclideanDistance4(ideal, w);
    // Normalize distance by max possible (sqrt(4) = 2)
    const normalizedDistance = Math.min(1, distance / Math.SQRT2 / Math.SQRT2); // fallback safe
    // Simpler: max distance between 0..1 vectors is sqrt(4)=2
    const maxDist = Math.sqrt(4);
    const match = 1 - (distance / maxDist);

    // Update health (match in 0..1)
    plant.health = clamp01((plant.health || 0) + (match - 0.5) * 0.1);

    // Update growth using health
    plant.growth = clamp01((plant.growth || 0) + plant.health * 0.05);

    // Determine lifecycle stage from growth
    plant.stage = stageForGrowth(plant.growth, plant.health);

    // Death check
    if (plant.health <= 0) {
      plant.stage = 'dead';
    }

    // Increment stage age (assume updatePlant is called once per month)
    plant.stageAge = (typeof plant.stageAge === 'number') ? plant.stageAge + 1 : 1;

    // Duration-based transitions using cards data if available
    try {
      if (this.cardsData && Array.isArray(this.cardsData.plants) && plant.stage) {
        const card = this.cardsData.plants.find(c => c.id === plant.id || c.id === (plant.species || ''));
        if (card && card.states) {
          // Some internal stage names (like 'sapling') may not exactly match card state keys.
          let stateKey = plant.stage;
          if (!card.states[stateKey]) {
            if (stateKey === 'sapling' && card.states['mature']) stateKey = 'mature';
          }

          const stateDef = card.states[stateKey];
          if (stateDef && typeof stateDef.durationMonths === 'number' && stateDef.durationMonths > 0) {
            if (plant.stageAge >= stateDef.durationMonths) {
              // perform transition to next state if defined
              const nextState = stateDef.next;
              if (nextState) {
                plant.stage = nextState;
                plant.stageAge = 0; // reset counter on transition
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore duration/transition errors to avoid breaking plant updates
    }

    // Update plant's current vector to reflect environment
    plant.current = { ...w };

    // Log summary
    try {
      const vec = [w.light, w.temp, w.humidity, w.wind].map(v => v.toFixed(2));
      console.log(`🌤 Weather Vector: [${vec.join(', ')}]`);
      console.log(`🌿 ${plant.id || plant.name || 'plant'} Match: ${match.toFixed(2)} | Growth: ${plant.growth.toFixed(2)} | Health: ${plant.health.toFixed(2)} | Stage: ${plant.stage}`);
    } catch (e) {
      // ignore logging errors
    }

    return plant;
  }
}

// Helpers
function euclideanDistance4(a, b) {
  const dl = (a.light - b.light) || 0;
  const dt = (a.temp - b.temp) || 0;
  const dh = (a.humidity - b.humidity) || 0;
  const dw = (a.wind - b.wind) || 0;
  return Math.sqrt(dl * dl + dt * dt + dh * dh + dw * dw);
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function safeNum(v) {
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

function stageForGrowth(growth, health) {
  if (health <= 0) return 'dead';
  if (growth <= 0.2) return 'seed';
  if (growth <= 0.4) return 'seedling';
  if (growth <= 0.7) return 'sapling';
  return 'mature';
}

module.exports = PlantManager;