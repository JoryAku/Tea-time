const assert = require('assert');
const PlantManager = require('../../engine/plants/PlantManager');
const cards = require('../../data/Cards.json');

function testFloweringToFruiting() {
  console.log('Test: flowering -> fruiting after 1 month');
  const pm = new PlantManager(cards);

  const plant = {
    id: 'tea_plant',
    name: 'Tea Plant (flowering test)',
    ideal: { light: 0.85, temp: 0.75, humidity: 0.65, wind: 0.5 },
    health: 0.8,
    growth: 0.85,
    stage: 'flowering',
    stageAge: 0
  };

  const weather = { light: 0.85, temp: 0.75, humidity: 0.65, wind: 0.5 };

  // Month 1 -> should transition to fruiting
  pm.updatePlant(plant, weather);
  assert.strictEqual(plant.stage, 'fruiting', `Expected flowering -> fruiting after 1 month but was ${plant.stage}`);
  console.log('  flowering -> fruiting passed');
}

function testFruitingToSeedAfterThreeMonths() {
  console.log('Test: fruiting -> seed after 3 months');
  const pm = new PlantManager(cards);

  const plant = {
    id: 'tea_plant',
    name: 'Tea Plant (fruiting test)',
    ideal: { light: 0.85, temp: 0.8, humidity: 0.7, wind: 0.55 },
    health: 0.8,
    growth: 0.95,
    stage: 'fruiting',
    stageAge: 0
  };

  const weather = { light: 0.85, temp: 0.8, humidity: 0.7, wind: 0.55 };

  // 3 months -> should transition to seed
  pm.updatePlant(plant, weather);
  pm.updatePlant(plant, weather);
  pm.updatePlant(plant, weather);

  assert.strictEqual(plant.stage, 'seed', `Expected fruiting -> seed after 3 months but was ${plant.stage}`);
  console.log('  fruiting -> seed passed');
}

function testFruitingDoesNotTransitionEarly() {
  console.log('Test: fruiting does NOT transition before 3 months');
  const pm = new PlantManager(cards);

  const plant = {
    id: 'tea_plant',
    name: 'Tea Plant (fruiting negative test)',
    ideal: { light: 0.85, temp: 0.8, humidity: 0.7, wind: 0.55 },
    health: 0.8,
    growth: 0.95,
    stage: 'fruiting',
    stageAge: 0
  };

  const weather = { light: 0.85, temp: 0.8, humidity: 0.7, wind: 0.55 };

  // 2 months -> should NOT yet transition to seed
  pm.updatePlant(plant, weather);
  pm.updatePlant(plant, weather);

  assert.notStrictEqual(plant.stage, 'seed', `Did not expect fruiting -> seed after 2 months, but was ${plant.stage}`);
  console.log('  fruiting early-transition negative passed');
}

if (require.main === module) {
  testFloweringToFruiting();
  testFruitingToSeedAfterThreeMonths();
  testFruitingDoesNotTransitionEarly();
  console.log('\n✅ Extra duration tests passed');
}

module.exports = {
  testFloweringToFruiting,
  testFruitingToSeedAfterThreeMonths,
  testFruitingDoesNotTransitionEarly
};