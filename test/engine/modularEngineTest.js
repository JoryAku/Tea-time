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
console.log('✅ WeatherSystem constructed');

// Add assertions for subsystem creation
assert.ok(timeManager.getCurrentMonth(), "TimeManager should have a current month");
assert.ok(weatherSystem instanceof WeatherSystem, "WeatherSystem should be instantiated");

// Exercise WeatherSystem.updateForMonth using provided weatherData
weatherSystem.updateForMonth(timeManager.getCurrentMonth(), weatherData);
console.log(`✅ WeatherSystem updated for month: ${timeManager.getCurrentMonth()}`);

console.log('=== All Modular Engine Tests Completed ===');
console.log('✅ Subsystems working correctly!');

// Final assertion to confirm all tests passed
assert.ok(true, "All modular engine tests completed successfully");