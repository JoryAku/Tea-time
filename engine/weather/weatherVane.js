/**
 * weatherVane.js
 * Map common human-readable weather conditions to 4D vectors and provide
 * an interpreter that finds the nearest named condition for a given weather vector.
 */

const CONDITIONS = [
  { name: 'Fine', description: 'Sunny or clear skies.', vector: { light: 0.9, temp: 0.8, humidity: 0.4, wind: 0.1 } },
  { name: 'Partly Cloudy', description: 'Sky partly covered by clouds.', vector: { light: 0.7, temp: 0.6, humidity: 0.5, wind: 0.2 } },
  { name: 'Cloudy', description: 'Mostly cloudy skies.', vector: { light: 0.4, temp: 0.6, humidity: 0.7, wind: 0.3 } },
  { name: 'Few Showers', description: 'Relatively short-lived periods of precipitation.', vector: { light: 0.5, temp: 0.6, humidity: 0.8, wind: 0.4 } },
  { name: 'Showers', description: 'Short-lived periods of precipitation.', vector: { light: 0.4, temp: 0.6, humidity: 0.9, wind: 0.5 } },
  { name: 'Rain', description: 'Steady rain with overcast skies.', vector: { light: 0.3, temp: 0.6, humidity: 0.9, wind: 0.6 } },
  { name: 'Drizzle', description: 'Very small water droplets, close together.', vector: { light: 0.3, temp: 0.6, humidity: 0.9, wind: 0.4 } },
  { name: 'Fog', description: 'Low visibility due to suspended droplets.', vector: { light: 0.2, temp: 0.5, humidity: 0.9, wind: 0.2 } },
  { name: 'Snow', description: 'Precipitation of ice crystals.', vector: { light: 0.3, temp: 0.2, humidity: 0.8, wind: 0.3 } },
  { name: 'Wind', description: 'Windy conditions', vector: { light: 0.5, temp: 0.6, humidity: 0.5, wind: 0.8 } },
  { name: 'Wind & Rain', description: 'Strong winds with rainfall.', vector: { light: 0.2, temp: 0.5, humidity: 0.9, wind: 0.9 } },
  { name: 'Thunder', description: 'Electrical storms with lightning and thunder.', vector: { light: 0.3, temp: 0.6, humidity: 0.9, wind: 0.7 } },
  { name: 'Hail', description: 'Convective hail-producing storms.', vector: { light: 0.3, temp: 0.5, humidity: 0.8, wind: 0.6 } },
  { name: 'Frost', description: 'Freezing conditions; no precipitation expected.', vector: { light: 0.2, temp: 0.1, humidity: 0.6, wind: 0.1 } }
];

function euclidean(a, b) {
  const dl = (a.light - b.light) || 0;
  const dt = (a.temp - b.temp) || 0;
  const dh = (a.humidity - b.humidity) || 0;
  const dw = (a.wind - b.wind) || 0;
  return Math.sqrt(dl * dl + dt * dt + dh * dh + dw * dw);
}

// Default normalized threshold (0..1). If the best-match normalized distance
// is greater than this, the interpreter will return a 'Mixed' result with
// the nearest candidate conditions instead of a single confident match.
const DEFAULT_NORMALIZED_THRESHOLD = 0.3; // ~0.6 absolute distance (since maxDist = sqrt(4)=2)

function interpretVector(vec, opts = {}) {
  const thresholdNormalized = typeof opts.thresholdNormalized === 'number' ? opts.thresholdNormalized : DEFAULT_NORMALIZED_THRESHOLD;

  const v = {
    light: typeof vec.light === 'number' ? vec.light : 0,
    temp: typeof vec.temp === 'number' ? vec.temp : 0,
    humidity: typeof vec.humidity === 'number' ? vec.humidity : 0,
    wind: typeof vec.wind === 'number' ? vec.wind : 0
  };

  const scored = CONDITIONS.map(c => ({ name: c.name, description: c.description, vector: c.vector, distance: euclidean(v, c.vector) }));
  scored.sort((a, b) => a.distance - b.distance);

  const best = scored[0] || null;
  const maxDist = Math.sqrt(4);
  const bestNormalized = best ? best.distance / maxDist : 1;

  if (best && bestNormalized <= thresholdNormalized) {
    return {
      condition: best.name,
      description: best.description,
      distance: best.distance,
      normalizedDistance: bestNormalized,
      vector: v
    };
  }

  // If no confident match, return a Mixed result with top candidates
  return {
    condition: 'Mixed',
    description: 'Mixed or variable weather (no single close match)',
    distance: best ? best.distance : null,
    normalizedDistance: best ? bestNormalized : null,
    vector: v,
    candidates: scored.slice(0, 3).map(s => ({ name: s.name, distance: s.distance }))
  };
}

function interpretFromWeatherSystem(ws, opts = {}) {
  if (!ws) return null;
  const wind = ws.windVector && typeof ws.windVector.magnitude === 'number' ? ws.windVector.magnitude : 0;
  const vec = { light: ws.light, temp: ws.temp, humidity: ws.humidity, wind };
  return interpretVector(vec, opts);
}

module.exports = {
  CONDITIONS,
  interpretVector,
  interpretFromWeatherSystem
};
