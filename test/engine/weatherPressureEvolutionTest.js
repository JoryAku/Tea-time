const assert = require('assert');
const Game = require('../../engine/Game');

function testPressureEvolution() {
  console.log('=== Testing Weather Pressure Evolution ===');

  const game = new Game();
  const initial = game.peekWeather();
  assert.ok(initial, 'peekWeather() should return a snapshot');

  const ws = game.engine && game.engine.weatherSystem;
  assert.ok(ws, 'WeatherSystem should be available on engine');

  // sample pressure over several months
  const samples = [];
  const steps = 6; // sample 6 months

  samples.push(initial.pressureHpa);
  for (let i = 0; i < steps; i++) {
    game.waitAction();
    samples.push(game.peekWeather().pressureHpa);
  }

  console.log('Pressure samples:', samples.map(s => s ? s.toFixed(1) : 'null').join(', '));

  // All samples should be numbers
  samples.forEach((p, i) => {
    assert.ok(p === null || typeof p === 'number', `Sample ${i} should be number or null`);
  });

  // Ensure pressure evolves (not all samples equal)
  const unique = new Set(samples.map(s => s && Math.round(s))); // coarse uniqueness
  assert.ok(unique.size > 1, 'Pressure should evolve across months');

  // Ensure no abrupt jumps > 20 hPa between consecutive samples
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1] || samples[i];
    const b = samples[i] || samples[i - 1];
    if (a != null && b != null) {
      const diff = Math.abs(b - a);
      assert.ok(diff <= 20, `Pressure jump too large between ${i - 1} and ${i}: ${diff} hPa`);
    }
  }

  console.log('✅ Pressure evolution test passed');
}

if (require.main === module) {
  testPressureEvolution();
}

module.exports = { testPressureEvolution };
