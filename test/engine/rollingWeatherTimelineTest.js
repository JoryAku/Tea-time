// Test the Rolling Weather Timeline system
const assert = require('assert');
const Game = require("../../engine/Game");

function testRollingWeatherTimeline() {
  console.log("=== Testing Rolling Weather Timeline System ===\n");

  // Test 1: Basic Rolling Timeline Creation
  testBasicRollingTimelineCreation();
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 2: Timeline Advancement
  testTimelineAdvancement();
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 3: Rolling Window Behavior
  testRollingWindowBehavior();
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 4: Tea Powers Integration
  testTeaPowersIntegration();
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 5: Consistency Across Multiple Turns
  testConsistencyAcrossMultipleTurns();
  
  console.log("\n✅ All Rolling Weather Timeline tests completed!");
}

function testBasicRollingTimelineCreation() {
  console.log("Test 1: Basic Rolling Timeline Creation");
  
  const game = new Game();
  
  // Verify rolling timeline was created
  assert.ok(game.engine.rollingWeatherTimeline, "Rolling weather timeline should be created");
  
  // Check that initial timeline has 48 events (4 years)
  const forecast = game.engine.getRollingWeatherForecast(48);
  assert.strictEqual(forecast.length, 48, "Should have 48 events in 4-year forecast");
  
  // Verify each event has required properties
  forecast.forEach((event, index) => {
    assert.ok(event.turn, `Event ${index} should have turn number`);
    assert.ok(event.season, `Event ${index} should have season`);
    assert.ok(event.weather, `Event ${index} should have weather`);
    assert.ok(event.conditions, `Event ${index} should have conditions`);
  });
  
  console.log(`✅ Rolling timeline created with ${forecast.length} events`);
  console.log(`✅ All events have required properties`);
  
  // Test debug info
  const debugInfo = game.engine.getRollingTimelineDebugInfo();
  assert.strictEqual(debugInfo.currentTurn, 0, "Should start at turn 0");
  assert.strictEqual(debugInfo.timelineLength, 48, "Should have 48 events in timeline");
  assert.strictEqual(debugInfo.eventsInTimeline, 48, "Should have 48 events loaded");
  
  console.log(`✅ Debug info shows correct initial state`);
}

function testTimelineAdvancement() {
  console.log("Test 2: Timeline Advancement");
  
  const game = new Game();
  
  // Get initial first event
  const initialFirstEvent = game.engine.getCurrentWeatherEvent();
  console.log(`Initial first event: ${initialFirstEvent.weather} (${initialFirstEvent.season})`);
  
  // Get full timeline before advancement
  const beforeAdvancement = game.engine.getFullRollingTimeline();
  assert.strictEqual(beforeAdvancement.length, 48, "Should have 48 events before advancement");
  
  // Advance timeline once
  game.waitAction();
  
  // Verify timeline advanced
  const afterAdvancement = game.engine.getFullRollingTimeline();
  assert.strictEqual(afterAdvancement.length, 48, "Should still have 48 events after advancement");
  
  // Check that the new first event is what used to be the second event
  const newFirstEvent = game.engine.getCurrentWeatherEvent();
  const expectedNewFirst = beforeAdvancement[1];
  
  // The new first event should have updated turn numbers but same weather/season
  assert.strictEqual(newFirstEvent.weather, expectedNewFirst.weather, "Weather should match previous second event");
  assert.strictEqual(newFirstEvent.season, expectedNewFirst.season, "Season should match previous second event");
  
  console.log(`✅ Timeline advanced correctly`);
  console.log(`✅ New first event: ${newFirstEvent.weather} (${newFirstEvent.season})`);
  
  // Verify debug info updated
  const debugInfo = game.engine.getRollingTimelineDebugInfo();
  assert.strictEqual(debugInfo.currentTurn, 1, "Should be at turn 1 after one advancement");
  
  console.log(`✅ Turn counter updated correctly`);
}

function testRollingWindowBehavior() {
  console.log("Test 3: Rolling Window Behavior");
  
  const game = new Game();
  
  // Record the last event in initial timeline
  const initialTimeline = game.engine.getFullRollingTimeline();
  const initialLastEvent = initialTimeline[initialTimeline.length - 1];
  
  console.log(`Initial last event (turn ${initialLastEvent.turn}): ${initialLastEvent.weather} (${initialLastEvent.season})`);
  
  // Advance timeline several times
  const advanceCount = 5;
  for (let i = 0; i < advanceCount; i++) {
    game.waitAction();
  }
  
  // Check that new events were generated at the end
  const newTimeline = game.engine.getFullRollingTimeline();
  const newLastEvent = newTimeline[newTimeline.length - 1];
  
  console.log(`New last event (turn ${newLastEvent.turn}): ${newLastEvent.weather} (${newLastEvent.season})`);
  
  // Last event turn should be higher than initial
  assert.ok(newLastEvent.turn > initialLastEvent.turn, "New events should be generated with higher turn numbers");
  
  // Verify window still contains 48 events
  assert.strictEqual(newTimeline.length, 48, "Should maintain 48 events in rolling window");
  
  // First event should now be from a later turn
  const newFirstEvent = newTimeline[0];
  assert.strictEqual(newFirstEvent.turn, advanceCount + 1, `First event should be from turn ${advanceCount + 1}`);
  
  console.log(`✅ Rolling window maintained with new events generated`);
  console.log(`✅ Window spans turns ${newFirstEvent.turn} to ${newLastEvent.turn}`);
}

function testTeaPowersIntegration() {
  console.log("Test 4: Tea Powers Integration");
  
  const game = new Game();
  
  // Test Green Tea - should use rolling forecast
  console.log("\n--- Testing Green Tea Integration ---");
  if (game.player.cafe.length > 0 && game.player.garden.length > 0) {
    const teaCard = game.player.cafe[0];
    const result = game.consumeGreenTeaWithPlantSelection(teaCard, 0);
    assert.strictEqual(result, true, "Green Tea should consume successfully with rolling timeline");
    console.log("✅ Green Tea uses rolling timeline forecast");
  } else {
    // Create conditions for testing
    const teaCard = game.createCard("green_tea");
    game.player.cafe.push(teaCard);
    const result = game.consumeGreenTeaWithPlantSelection(teaCard, 0);
    assert.strictEqual(result, true, "Green Tea should consume successfully with rolling timeline");
    console.log("✅ Green Tea uses rolling timeline forecast");
  }
  
  // Test Oolong Tea - should use rolling forecast for harvest timeline
  console.log("\n--- Testing Oolong Tea Integration ---");
  const game2 = new Game();
  const oolongTea = game2.createCard("oolong_tea");
  game2.player.cafe.push(oolongTea);
  
  const oolongResult = game2.consumeOolongTeaWithPlantSelection(oolongTea, 0);
  // Should either succeed or fail gracefully, but not crash
  assert.ok(oolongResult, "Oolong Tea should return a result object");
  console.log("✅ Oolong Tea integrates with rolling timeline");
  
  // Test Black Tea - should use rolling forecast for timeline view
  console.log("\n--- Testing Black Tea Integration ---");
  const game3 = new Game();
  const blackTea = game3.createCard("black_tea");
  game3.player.cafe.push(blackTea);
  
  const blackResult = game3.consumeBlackTeaWithPlantSelection(blackTea, 0);
  assert.ok(blackResult, "Black Tea should return a result object");
  console.log("✅ Black Tea integrates with rolling timeline");
}

function testConsistencyAcrossMultipleTurns() {
  console.log("Test 5: Consistency Across Multiple Turns");
  
  const game = new Game();
  
  // Record weather events for multiple turns
  const weatherSequence = [];
  
  for (let turn = 0; turn < 10; turn++) {
    const currentWeather = game.engine.getCurrentWeatherEvent();
    weatherSequence.push({
      turn: turn,
      weather: currentWeather.weather,
      season: currentWeather.season
    });
    
    if (turn < 9) { // Don't advance on last iteration
      game.waitAction();
    }
  }
  
  console.log("Weather sequence over 10 turns:");
  weatherSequence.forEach(entry => {
    console.log(`  Turn ${entry.turn}: ${entry.weather} (${entry.season})`);
  });
  
  // Verify weather events follow seasonal patterns
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  let validSeasonProgression = true;
  
  // Check that seasons change appropriately (every ~3 actions)
  const seasonChanges = [];
  let lastSeason = weatherSequence[0].season;
  
  weatherSequence.forEach((entry, index) => {
    if (entry.season !== lastSeason) {
      seasonChanges.push({
        turn: entry.turn,
        from: lastSeason,
        to: entry.season
      });
      lastSeason = entry.season;
    }
  });
  
  console.log(`✅ Recorded ${seasonChanges.length} season changes`);
  seasonChanges.forEach(change => {
    console.log(`  Turn ${change.turn}: ${change.from} → ${change.to}`);
  });
  
  // Verify all weather events are valid for their seasons
  const validWeatherEvents = weatherSequence.every(entry => {
    const seasonWeatherData = game.engine.weatherData[entry.season];
    return seasonWeatherData.some(weatherOption => weatherOption.event === entry.weather);
  });
  
  assert.ok(validWeatherEvents, "All weather events should be valid for their seasons");
  console.log("✅ All weather events are valid for their respective seasons");
  
  // Test that future forecasts remain consistent when not advanced
  const game2 = new Game();
  const forecast1 = game2.engine.getRollingWeatherForecast(5);
  const forecast2 = game2.engine.getRollingWeatherForecast(5);
  
  const forecastsMatch = forecast1.every((event, index) => 
    event.weather === forecast2[index].weather && 
    event.season === forecast2[index].season
  );
  
  assert.ok(forecastsMatch, "Forecasts should be consistent when timeline is not advanced");
  console.log("✅ Forecasts remain consistent until timeline is advanced");
}

// Run the tests
testRollingWeatherTimeline();

module.exports = { testRollingWeatherTimeline };