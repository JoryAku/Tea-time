const assert = require('assert');
const PlantManager = require('../../engine/plants/PlantManager');

function testHappyPath() {
  console.log('Test: PlantManager happy path');
  const pm = new PlantManager();

  const plant = {
    id: 'tea_plant',
    ideal: { light: 0.6, temp: 0.5, humidity: 0.7, wind: 0.1 },
    health: 0.5,
    growth: 0.2
  };

  const weather = { light: 0.62, temp: 0.48, humidity: 0.69, wind: 0.12 };

  pm.updatePlant(plant, weather);

  // Health should increase slightly, growth should increase
  assert.ok(plant.health > 0.5, 'Health should increase on a good match');
  assert.ok(plant.growth > 0.2, 'Growth should increase on a good match');
  assert.ok(['seed','seedling','sapling','mature'].includes(plant.stage), 'Stage should be valid');
  console.log('  happy path passed');
}

function testMissingIdealUsesDefaults() {
  console.log('Test: Missing ideal vector falls back to defaults');
  const pm = new PlantManager();

  const plant = {
    id: 'wild_plant',
    // no ideal provided
    health: 0.3,
    growth: 0.1
  };

  const weather = { light: 0.2, temp: 0.2, humidity: 0.2, wind: 0.0 };

  // Should not throw
  pm.updatePlant(plant, weather);

  assert.ok(typeof plant.health === 'number', 'Health should be a number');
  assert.ok(typeof plant.growth === 'number', 'Growth should be a number');
  console.log('  missing-ideal passed');
}

function testExtremeMismatchLeadsToDeath() {
  console.log('Test: Extreme mismatch leads to death (health <= 0)');
  const pm = new PlantManager();

  const plant = {
    id: 'fragile_plant',
    ideal: { light: 1.0, temp: 1.0, humidity: 1.0, wind: 0.0 },
    health: 0.01,
    growth: 0.1
  };

  // Weather is the opposite extreme
  const weather = { light: 0.0, temp: 0.0, humidity: 0.0, wind: 1.0 };

  pm.updatePlant(plant, weather);

  assert.strictEqual(plant.stage, 'dead', 'Plant should be dead after extreme mismatch');
  console.log('  extreme mismatch passed');
}

function testClampUpperBound() {
  console.log('Test: Health clamps at 1.0');
  const pm = new PlantManager();

  const plant = {
    id: 'sturdy',
    ideal: { light: 0.5, temp: 0.5, humidity: 0.5, wind: 0.0 },
    health: 0.99,
    growth: 0.9
  };

  const weather = { light: 0.5, temp: 0.5, humidity: 0.5, wind: 0.0 };

  pm.updatePlant(plant, weather);

  assert.ok(plant.health <= 1.0, 'Health should not exceed 1.0');
  assert.ok(plant.health >= 0.0, 'Health should be >= 0');
  console.log('  clamp upper bound passed');
}

if (require.main === module) {
  testHappyPath();
  testMissingIdealUsesDefaults();
  testExtremeMismatchLeadsToDeath();
  testClampUpperBound();
  console.log('\n✅ All PlantManager tests passed');
}

module.exports = {
  testHappyPath,
  testMissingIdealUsesDefaults,
  testExtremeMismatchLeadsToDeath,
  testClampUpperBound
};
