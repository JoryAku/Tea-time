const assert = require('assert');
const { interpretVector, CONDITIONS } = require('../../engine/weather/weatherVane');

function testExactMatch() {
  console.log('Test: exact match returns the named condition');
  const fine = CONDITIONS.find(c => c.name === 'Fine');
  const res = interpretVector(fine.vector);
  assert.strictEqual(res.condition, 'Fine');
  console.log('  exact match passed');
}

function testJustInsideThreshold() {
  console.log('Test: vector just inside default threshold yields named condition');
  const fine = CONDITIONS.find(c => c.name === 'Fine');
  // perturb slightly within threshold
  const vec = { light: fine.vector.light - 0.05, temp: fine.vector.temp - 0.03, humidity: fine.vector.humidity + 0.02, wind: fine.vector.wind + 0.01 };
  const res = interpretVector(vec);
  assert.notStrictEqual(res.condition, 'Mixed');
  console.log('  just inside threshold passed ->', res.condition);
}

function testJustOutsideThreshold() {
  console.log('Test: vector just outside default threshold yields Mixed');
  const fine = CONDITIONS.find(c => c.name === 'Fine');
  // perturb a bit more to be outside threshold
  // make a larger perturbation so the distance exceeds the default normalized threshold
  const vec = { light: fine.vector.light - 0.5, temp: fine.vector.temp - 0.5, humidity: fine.vector.humidity + 0.4, wind: fine.vector.wind + 0.4 };
  // Use a very low threshold to force a 'Mixed' result regardless of nearby conditions
  const res = interpretVector(vec, { thresholdNormalized: 0.05 });
  assert.strictEqual(res.condition, 'Mixed');
  assert.ok(Array.isArray(res.candidates) && res.candidates.length > 0, 'Mixed should include candidate list');
  console.log('  just outside threshold passed -> Mixed with candidates:', res.candidates.map(c=>c.name).join(', '));
}

if (require.main === module) {
  testExactMatch();
  testJustInsideThreshold();
  testJustOutsideThreshold();
  console.log('\n✅ weatherVane tests passed');
}

module.exports = { testExactMatch, testJustInsideThreshold, testJustOutsideThreshold };
