const assert = require('assert');
const { computeSeedDropChance } = require('../../engine/seedDropRule');

function testNonFruiting() {
  console.log('Test: non-fruiting plants return 0 chance');
  const plant = { stage: 'mature', growth: 1, health: 1, x:0,y:0 };
  const chance = computeSeedDropChance(plant, { light:1, temp:0.6, humidity:0.5, wind:0 }, 'oct', [plant], {});
  assert.strictEqual(chance, 0);
  console.log('  passed');
}

function testTinyGrowth() {
  console.log('Test: tiny growth below minGrowthToDrop returns 0');
  const plant = { stage: 'fruiting', growth: 0.01, health: 1, x:0,y:0 };
  const chance = computeSeedDropChance(plant, { light:1, temp:0.6, humidity:0.5, wind:0 }, 'oct', [plant], { minGrowthToDrop: 0.05 });
  assert.strictEqual(chance, 0);
  console.log('  passed');
}

function testGoodWeatherNeighbors() {
  console.log('Test: good weather and neighbor increases chance > 0');
  const plant = { stage: 'fruiting', growth: 0.9, health: 0.9, x:0,y:0 };
  const neighbor = { stage: 'flowering', growth: 0.5, health: 0.8, x:1,y:0 };
  const chance = computeSeedDropChance(plant, { light:0.9, temp:0.6, humidity:0.6, wind:0.1 }, 'oct', [plant, neighbor], { baseRate: 0.05, seasonMonths: ['oct'] });
  assert(chance > 0, 'expected positive chance');
  assert(chance <= 1, 'chance must be <= 1');
  console.log('  passed');
}

if (require.main === module) {
  testNonFruiting();
  testTinyGrowth();
  testGoodWeatherNeighbors();
  console.log('\n✅ seedDropRule tests passed');
}

module.exports = { testNonFruiting, testTinyGrowth, testGoodWeatherNeighbors };
