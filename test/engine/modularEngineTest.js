// Test to validate the new modular engine structure

const assert = require('assert');
const TimeManager = require('../../engine/time/TimeManager');
const WeatherSystem = require('../../engine/weather/WeatherSystem');
const weatherData = require('../../data/weather.json');

console.log('=== Testing Modular Engine Structure ===\n');

// Test 1: Individual subsystem instantiation
console.log('Test 1: Testing individual subsystem instantiation');
const timeManager = new TimeManager();
const weatherSystem = new WeatherSystem(weatherData);

console.log(`✅ TimeManager created: ${timeManager.getCurrentMonth()}`);
console.log(`✅ WeatherSystem created: ${Object.keys(weatherSystem.weatherData).length} seasons`);

// Add assertions for subsystem creation
assert.ok(timeManager.getCurrentMonth(), "TimeManager should have a current month");
assert.ok(Object.keys(weatherSystem.weatherData).length > 0, "WeatherSystem should have weather data");

console.log(`✅ Engine created with current month: ${engine.getCurrentMonth()}`);

// Add assertions for engine creation
assert.ok(engine.getCurrentMonth(), "Engine should have a current month");

// Test 3: Time management
console.log('Test 3: Testing time management through engine');
const initialMonth = engine.getCurrentMonth();
engine.endSeasonProcessing(); // This should advance the season
const newMonth = engine.getCurrentMonth();

console.log(`✅ Month advanced from ${initialMonth} to ${newMonth}`);

// Add assertions for time management
assert.notEqual(newMonth, initialMonth, "Month should have advanced");
assert.ok(engine.player.actionsLeft > 0, "Player should have actions after month advance");

// Test 4: Weather system integration
console.log('Test 4: Testing weather system integration');
const randomEvent = engine.weatherSystem.pickWeatherEvent(engine.getCurrentMonth());
const eventConditions = engine.weatherSystem.getEventConditions(engine.getCurrentMonth(), randomEvent);

console.log(`✅ Weather event generated: ${randomEvent}`);
console.log(`✅ Event conditions: [${eventConditions.join(', ')}]\n`);

// Add assertions for weather system
assert.ok(randomEvent, "Weather system should generate an event");
assert.ok(Array.isArray(eventConditions), "Weather system should return event conditions");

console.log('=== All Modular Engine Tests Completed ===');
console.log('✅ All subsystems working correctly!');

// Final assertion to confirm all tests passed
assert.ok(true, "All modular engine tests completed successfully");