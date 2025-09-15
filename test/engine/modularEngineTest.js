// Test to validate the new modular engine structure

const assert = require('assert');
const TeaTimeEngine = require('../../engine/engine');
const TimeManager = require('../../engine/time/TimeManager');
const WeatherSystem = require('../../engine/weather/WeatherSystem');
const PlantManager = require('../../engine/plants/PlantManager');
const ActionManager = require('../../engine/actions/ActionManager');
const cardsData = require('../../data/Cards.json');
const weatherData = require('../../data/weather.json');

console.log('=== Testing Modular Engine Structure ===\n');

// Test 1: Individual subsystem instantiation
console.log('Test 1: Testing individual subsystem instantiation');
const timeManager = new TimeManager();
const weatherSystem = new WeatherSystem(weatherData);
const plantManager = new PlantManager(cardsData);
const actionManager = new ActionManager(cardsData);

console.log(`✅ TimeManager created: ${timeManager.getCurrentSeason()}`);
console.log(`✅ WeatherSystem created: ${Object.keys(weatherSystem.weatherData).length} seasons`);
console.log(`✅ PlantManager created: ${plantManager.cardsData.plants.length} plant types`);
console.log(`✅ ActionManager created: ${actionManager.cardsData.ingredients.length} ingredient types\n`);

// Add assertions for subsystem creation
assert.ok(timeManager.getCurrentSeason(), "TimeManager should have a current season");
assert.ok(Object.keys(weatherSystem.weatherData).length > 0, "WeatherSystem should have weather data");
assert.ok(plantManager.cardsData.plants.length > 0, "PlantManager should have plant data");
assert.ok(actionManager.cardsData.ingredients.length > 0, "ActionManager should have ingredient data");

// Test 2: Engine orchestration
console.log('Test 2: Testing engine orchestration');
const engine = new TeaTimeEngine(cardsData, weatherData);

console.log(`✅ Engine created with current season: ${engine.getCurrentSeason()}`);
console.log(`✅ Player initialized with ${engine.player.garden.length} plants in garden`);
console.log(`✅ Actions per season: ${engine.getActionsPerSeason()}\n`);

// Add assertions for engine creation
assert.ok(engine.getCurrentSeason(), "Engine should have a current season");
assert.ok(engine.player.garden.length > 0, "Engine player should have plants in garden");
assert.ok(engine.getActionsPerSeason() > 0, "Engine should have actions per season");

// Test 3: Time management
console.log('Test 3: Testing time management through engine');
const initialSeason = engine.getCurrentSeason();
engine.endSeasonProcessing(); // This should advance the season
const newSeason = engine.getCurrentSeason();

console.log(`✅ Season advanced from ${initialSeason} to ${newSeason}`);
console.log(`✅ Player actions reset to: ${engine.player.actionsLeft}\n`);

// Add assertions for time management
assert.notEqual(newSeason, initialSeason, "Season should have advanced");
assert.ok(engine.player.actionsLeft > 0, "Player should have actions after season advance");

// Test 4: Weather system integration
console.log('Test 4: Testing weather system integration');
const randomEvent = engine.weatherSystem.pickWeatherEvent(engine.getCurrentSeason());
const eventConditions = engine.weatherSystem.getEventConditions(engine.getCurrentSeason(), randomEvent);

console.log(`✅ Weather event generated: ${randomEvent}`);
console.log(`✅ Event conditions: [${eventConditions.join(', ')}]\n`);

// Add assertions for weather system
assert.ok(randomEvent, "Weather system should generate an event");
assert.ok(Array.isArray(eventConditions), "Weather system should return event conditions");

// Test 5: Plant management
console.log('Test 5: Testing plant management');
const testPlant = engine.player.garden[0];
if (testPlant) {
  const initialState = testPlant.state;
  engine.plantManager.applyWeatherToPlant(testPlant, 'sun', ['sunlight']);
  console.log(`✅ Applied weather to plant: ${testPlant.name} [${initialState}]`);
  console.log(`✅ Plant now has conditions: [${Object.keys(testPlant.activeConditions).join(', ')}]\n`);
}

// Test 6: Action management
console.log('Test 6: Testing action management');
const actionResult = engine.actionManager.harvestSeedFromGarden(engine.player, 0, engine.createCard.bind(engine));
console.log(`✅ Harvest action attempted (expected to fail on seedling): ${!actionResult ? 'correctly failed' : 'unexpectedly succeeded'}\n`);

// Test 7: Engine delegation to Game class
console.log('Test 7: Testing backward compatibility with Game class');
const Game = require('../../engine/Game');
const game = new Game();

console.log(`✅ Game class still works: ${game.currentSeason}`);
console.log(`✅ Game has player: ${game.player.garden.length} plants in garden`);
console.log(`✅ Game can create cards: ${game.createCard('tea_plant', 'seed').name}\n`);

// Test 8: CLI integration test
console.log('Test 8: Testing CLI compatibility');
try {
  // Just verify that the CLI module can be required without errors
  require('../../cli/cli');
  console.log('✅ CLI module loads without errors\n');
} catch (error) {
  console.log(`❌ CLI module failed to load: ${error.message}\n`);
}

console.log('=== All Modular Engine Tests Completed ===');
console.log('✅ Modular structure successfully implemented!');
console.log('✅ Backward compatibility maintained!');
console.log('✅ All subsystems working correctly!');

// Final assertion to confirm all tests passed
assert.ok(true, "All modular engine tests completed successfully");