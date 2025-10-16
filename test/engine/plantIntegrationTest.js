const assert = require('assert');
const Game = require('../../engine/Game');

function testPlantUpdatesOnWait() {
  console.log('Test: integration - plant in garden updates after waitAction');
  const game = new Game();

  // Seed a plant into the player's garden
  const plant = {
    id: 'integration_tea',
    name: 'Integration Tea',
    ideal: { light: 0.6, temp: 0.6, humidity: 0.7, wind: 0.1 },
    health: 0.5,
    growth: 0.25,
    stage: 'seed'
  };

  game.player.garden.push(plant);

  // Snapshot before
  const beforeHealth = plant.health;
  const beforeGrowth = plant.growth;

  // Advance one action (month) which should update weather and then plants
  game.waitAction();

  // After: either health or growth should have changed
  const afterHealth = plant.health;
  const afterGrowth = plant.growth;

  const changed = (afterHealth !== beforeHealth) || (afterGrowth !== beforeGrowth);

  assert.ok(changed, `Expected plant health/growth to change after waitAction (before h:${beforeHealth}, g:${beforeGrowth} -> after h:${afterHealth}, g:${afterGrowth})`);

  console.log('  integration plant update passed');
}

if (require.main === module) {
  testPlantUpdatesOnWait();
  console.log('\n✅ Plant integration test passed');
}

module.exports = { testPlantUpdatesOnWait };