const assert = require('assert');
const PlantManager = require('../../engine/plants/PlantManager');
const cards = require('../../data/Cards.json');

function testSeedToSeedlingAfterTwoMonths() {
  console.log('Test: seed -> seedling after duration (2 months)');
  const pm = new PlantManager(cards);

  // Create a plant instance matching the tea_plant id
  const plant = {
    id: 'tea_plant',
    name: 'Tea Plant (duration test)',
    ideal: { light: 0.6, temp: 0.6, humidity: 0.8, wind: 0.5 },
    health: 0.6,
    growth: 0.1, // still in seed according to thresholds
    stage: 'seed',
    stageAge: 0
  };

  // Use a neutral/good weather vector to avoid extreme penalty
  const weather = { light: 0.6, temp: 0.6, humidity: 0.8, wind: 0.5 };

  // Month 1
  pm.updatePlant(plant, weather);
  assert.strictEqual(plant.stage, 'seed', 'After 1 month, should still be seed');

  // Month 2
  pm.updatePlant(plant, weather);
  // After 2 updates (months) the duration of seed (2 months) should trigger transition
  assert.strictEqual(plant.stage, 'seedling', `Expected stage to transition to seedling after 2 months but was ${plant.stage}`);

  console.log('  duration transition passed');
}

if (require.main === module) {
  testSeedToSeedlingAfterTwoMonths();
  console.log('\n✅ Plant duration tests passed');
}

module.exports = { testSeedToSeedlingAfterTwoMonths };