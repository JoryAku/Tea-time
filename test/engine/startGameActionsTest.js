const assert = require('assert');
const Game = require('../../engine/Game');

function testStartAvailableActions() {
  console.log('=== Testing start-of-game available actions ===');

  const game = new Game();
  const player = game.player;

  // Player should have a weatherVane property to view current weather
  console.log('Checking weatherVane exists...');
  assert.ok(Array.isArray(player.weatherVane) || player.weatherVane !== undefined, 'player.weatherVane should exist');

  // Player should start in January by default
  console.log('Checking starting month is jan...');
  assert.strictEqual(game.currentMonth, 'jan', "Player should start in 'jan'");

  // Available actions should only include 'wait' (always) and the ability to check weather
  // We model 'check weather' as viewing player.weatherVane in the current architecture
  const actions = player.getAvailableActions();
  console.log('Available actions at start:', actions);

  // Ensure 'wait' and 'check_weather' are present
  assert.ok(actions.includes('wait'), "'wait' should be an available action at game start");
  assert.ok(actions.includes('check_weather'), "'check_weather' should be an available action at game start");

  // Ensure no other actions besides 'wait' and 'check_weather' are present
  const allowed = new Set(['wait', 'check_weather']);
  const extra = actions.filter(a => !allowed.has(a));
  assert.strictEqual(extra.length, 0, `Only 'wait' and 'check_weather' should be available at start, found extras: ${extra}`);

  console.log('✅ Start-of-game available actions validated');

  // Now simulate the player waiting one month and assert the month advanced and weather updated
  const previousWeather = game.engine && game.engine.weatherSystem ? game.engine.weatherSystem.toString() : null;
  const advancedMonth = game.waitAction();
  console.log(`Advanced month returned: ${advancedMonth}`);
  assert.notStrictEqual(game.currentMonth, 'jan', 'Current month should have advanced after waiting');

  const newWeather = game.engine && game.engine.weatherSystem ? game.engine.weatherSystem.toString() : null;
  assert.notStrictEqual(newWeather, previousWeather, 'Weather should have updated after advancing the month');
}

if (require.main === module) {
  testStartAvailableActions();
}

module.exports = { testStartAvailableActions };
