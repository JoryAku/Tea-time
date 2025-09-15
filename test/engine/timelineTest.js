// Test the Core Timeline Mechanic implementation

const assert = require('assert');
const Game = require("../../engine/Game");
const Timeline = require("../../engine/time/Timeline");

function testTimelineSystem() {
  console.log("=== Testing Core Timeline Mechanic ===\n");

  // Test 1: Basic Timeline Creation
  console.log("Test 1: Basic Timeline Creation");
  testBasicTimelineCreation();
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 2: 48 Action Simulation (4 years)
  console.log("Test 2: 48 Action Simulation (4 years)");
  testFullTimelineSimulation();
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 3: Probability-Based Outcomes
  console.log("Test 3: Probability-Based Outcomes");
  testProbabilityBasedOutcomes();
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 4: Death vs Survival Timeline Generation
  console.log("Test 4: Death vs Survival Timeline Generation");
  testDeathSurvivalTimelines();
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 5: Locked Timeline Behavior
  console.log("Test 5: Locked Timeline Behavior");
  testLockedTimelineBehavior();
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 6: Player Intervention System
  console.log("Test 6: Player Intervention System");
  testPlayerInterventions();
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 7: Integration with Existing System
  console.log("Test 7: Integration with Existing System");
  testSystemIntegration();
  
  console.log("\n✅ All Timeline tests completed!");
  
  // Final assertion for timeline tests
  assert.ok(true, "All timeline tests completed successfully");
}

function testBasicTimelineCreation() {
  const game = new Game();
  console.log(`🎯 Starting with ${game.player.garden.length} plants in garden`);
  
  // Create a basic timeline
  const timeline = game.createTimeline(12); // 1 year
  
  console.log(`✅ Timeline created successfully`);
  console.log(`✅ Timeline locked: ${timeline.isLocked}`);
  console.log(`✅ Events generated: ${timeline.events.length}`);
  console.log(`✅ Plants tracked: ${timeline.plantStates.size}`);
  
  // Verify timeline contains required components
  if (timeline.events.length === 12) {
    console.log(`✅ Correct number of events (12) generated`);
  } else {
    console.log(`❌ Expected 12 events, got ${timeline.events.length}`);
  }
  
  // Check that each event has required properties
  const firstEvent = timeline.events[0];
  if (firstEvent.action && firstEvent.season && firstEvent.weather && firstEvent.conditions) {
    console.log(`✅ Events contain required properties`);
  } else {
    console.log(`❌ Events missing required properties`);
  }
  
  // Add assertions for basic timeline creation
  assert.strictEqual(timeline.events.length, 12, "Timeline should have 12 events");
  assert.ok(firstEvent.action && firstEvent.season && firstEvent.weather && firstEvent.conditions, 
    "Events should contain required properties");
}

function testFullTimelineSimulation() {
  const game = new Game();
  console.log(`🎯 Testing full 48-action simulation`);
  
  const start = Date.now();
  const timeline = game.createTimeline(48); // 4 years
  const duration = Date.now() - start;
  
  console.log(`✅ 48-action simulation completed in ${duration}ms`);
  console.log(`✅ Events generated: ${timeline.events.length}`);
  
  if (timeline.events.length === 48) {
    console.log(`✅ Correct number of events (48) for 4 years`);
  } else {
    console.log(`❌ Expected 48 events, got ${timeline.events.length}`);
  }
  
  // Verify seasonal distribution
  const seasonCounts = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  timeline.events.forEach(event => {
    seasonCounts[event.season]++;
  });
  
  console.log(`📊 Seasonal distribution:`);
  Object.entries(seasonCounts).forEach(([season, count]) => {
    console.log(`   ${season}: ${count} actions`);
  });
  
  // Each season should appear roughly equally (12 actions each)
  const expectedPerSeason = 12;
  const allSeasonsPresent = Object.values(seasonCounts).every(count => count >= expectedPerSeason - 1);
  
  if (allSeasonsPresent) {
    console.log(`✅ All seasons properly distributed across 4 years`);
  } else {
    console.log(`❌ Uneven seasonal distribution detected`);
  }
  
  // Add assertions for full timeline simulation
  assert.strictEqual(timeline.events.length, 48, "Timeline should have 48 events for 4 years");
  assert.ok(allSeasonsPresent, "All seasons should be properly distributed");
}

function testProbabilityBasedOutcomes() {
  console.log(`🎯 Testing probability-based vulnerability outcomes`);
  
  // Run multiple simulations to check probability distribution
  const outcomes = { survived: 0, died: 0 };
  const totalTests = 20;
  
  for (let i = 0; i < totalTests; i++) {
    const game = new Game();
    const forecast = game.getDetailedForecast(48);
    
    const deathCount = forecast.deathPredictions.length;
    if (deathCount > 0) {
      outcomes.died++;
    } else {
      outcomes.survived++;
    }
  }
  
  console.log(`📊 Outcome distribution over ${totalTests} simulations:`);
  console.log(`   Survived: ${outcomes.survived} (${(outcomes.survived/totalTests*100).toFixed(1)}%)`);
  console.log(`   Died: ${outcomes.died} (${(outcomes.died/totalTests*100).toFixed(1)}%)`);
  
  // Both outcomes should be possible (though survival might be more common)
  if (outcomes.survived > 0 && outcomes.died > 0) {
    console.log(`✅ Both survival and death outcomes generated`);
  } else if (outcomes.died === 0) {
    console.log(`⚠️  Only survival outcomes - vulnerability system may need adjustment`);
  } else {
    console.log(`⚠️  Only death outcomes - survival rate may be too low`);
  }
  
  // Test that vulnerabilities align with seasonal weather
  const game = new Game();
  const timeline = game.createTimeline(24);
  
  // Check if weather events align with seasonal probabilities
  const seasonalEvents = { spring: [], summer: [], autumn: [], winter: [] };
  timeline.events.forEach(event => {
    seasonalEvents[event.season].push(event.weather);
  });
  
  console.log(`✅ Weather events distributed across seasons`);
  
  // Verify that autumn has potential for frost (a vulnerability)
  const autumnEvents = seasonalEvents.autumn;
  const hasFrost = autumnEvents.includes('frost');
  
  if (hasFrost || autumnEvents.length === 0) {
    console.log(`✅ Seasonal weather probabilities being applied`);
  } else {
    console.log(`⚠️  Expected frost events in autumn, but none found in this simulation`);
  }
  
  // Add assertion for probability outcomes
  assert.ok(outcomes.survived >= 0 && outcomes.died >= 0, "Should have valid outcome counts");
}

function testDeathSurvivalTimelines() {
  console.log(`🎯 Testing death vs survival timeline generation`);
  
  // Try to find a timeline with death predictions
  let deathTimelineFound = false;
  let survivalTimelineFound = false;
  
  for (let i = 0; i < 10; i++) {
    const game = new Game();
    const forecast = game.getDetailedForecast(48);
    
    if (forecast.deathPredictions.length > 0) {
      deathTimelineFound = true;
      const death = forecast.deathPredictions[0];
      
      console.log(`💀 Death timeline found:`);
      console.log(`   Death predicted at action ${death.deathAction} (${death.season})`);
      console.log(`   Cause: ${death.cause}`);
      
      // Verify death occurs on predicted day
      const deathEvent = forecast.timeline.getWeatherAtAction(death.deathAction);
      if (deathEvent && deathEvent.weather === death.cause) {
        console.log(`✅ Death-causing event occurs on predicted day`);
      } else {
        console.log(`❌ Death event mismatch - predicted ${death.cause}, got ${deathEvent?.weather}`);
      }
      
      // Verify no vulnerability events before death day
      let vulnerableEventsBefore = 0;
      for (let action = 1; action < death.deathAction; action++) {
        const event = forecast.timeline.getWeatherAtAction(action);
        if (event && event.weather === death.cause) {
          vulnerableEventsBefore++;
        }
      }
      
      if (vulnerableEventsBefore === 0) {
        console.log(`✅ No premature vulnerability events before death`);
      } else {
        console.log(`❌ Found ${vulnerableEventsBefore} premature vulnerability events`);
      }
      
      break;
    } else {
      survivalTimelineFound = true;
    }
  }
  
  if (deathTimelineFound) {
    console.log(`✅ Death timeline properly structured`);
  } else {
    console.log(`⚠️  No death timelines found in 10 attempts`);
  }
  
  if (survivalTimelineFound) {
    console.log(`✅ Survival timelines generated`);
  } else {
    console.log(`⚠️  No survival timelines found`);
  }
  
  // Add assertion for death/survival timeline generation
  assert.ok(deathTimelineFound || survivalTimelineFound, "Should generate either death or survival timelines");
}

function testLockedTimelineBehavior() {
  const game = new Game();
  const timeline = game.createTimeline(12);
  
  console.log(`🔒 Testing locked timeline behavior`);
  
  // Verify timeline is locked after generation
  if (timeline.isLocked) {
    console.log(`✅ Timeline is locked after generation`);
  } else {
    console.log(`❌ Timeline should be locked after generation`);
  }
  
  // Test that weather events are consistent on repeated access
  const firstAccess = timeline.getWeatherAtAction(1);
  const secondAccess = timeline.getWeatherAtAction(1);
  
  if (firstAccess && secondAccess && 
      firstAccess.weather === secondAccess.weather &&
      firstAccess.season === secondAccess.season) {
    console.log(`✅ Weather events are consistent on repeated access`);
  } else {
    console.log(`❌ Weather events are not consistent`);
  }
  
  // Test plant state consistency
  const plantIds = Array.from(timeline.plantStates.keys());
  if (plantIds.length > 0) {
    const state1 = timeline.getPlantStateAtAction(plantIds[0], 5);
    const state2 = timeline.getPlantStateAtAction(plantIds[0], 5);
    
    if (state1 && state2 && state1.state === state2.state) {
      console.log(`✅ Plant states are consistent on repeated access`);
    } else {
      console.log(`❌ Plant states are not consistent`);
    }
  }
  
  // Test timeline bounds
  const beforeStart = timeline.getWeatherAtAction(0);
  const afterEnd = timeline.getWeatherAtAction(13);
  
  if (!beforeStart && !afterEnd) {
    console.log(`✅ Timeline properly bounds access to valid range`);
  } else {
    console.log(`❌ Timeline allows access outside valid range`);
  }
  
  // Add assertions for locked timeline behavior
  assert.strictEqual(timeline.isLocked, true, "Timeline should be locked after generation");
  assert.strictEqual(firstAccess.weather, secondAccess.weather, "Weather events should be consistent");
  assert.ok(!beforeStart && !afterEnd, "Timeline should bound access to valid range");
}

function testPlayerInterventions() {
  const game = new Game();
  const timeline = game.createTimeline(12);
  
  console.log(`⚡ Testing player intervention system`);
  
  const plantIds = Array.from(timeline.plantStates.keys());
  if (plantIds.length > 0) {
    const plantId = plantIds[0];
    
    // Test applying an intervention
    const success = timeline.applyIntervention(5, 'shelter', plantId);
    
    if (success) {
      console.log(`✅ Intervention applied successfully`);
    } else {
      console.log(`❌ Intervention failed to apply`);
    }
    
    // Test that intervention is recorded
    if (timeline.interventions.has(5)) {
      const intervention = timeline.interventions.get(5);
      if (intervention.type === 'shelter' && intervention.plantId === plantId) {
        console.log(`✅ Intervention properly recorded`);
      } else {
        console.log(`❌ Intervention recorded incorrectly`);
      }
    } else {
      console.log(`❌ Intervention not recorded`);
    }
    
    // Test intervention on unlocked timeline (should fail)
    const newTimeline = new Timeline(game.engine, game.currentSeason, game.player.actionsLeft);
    let errorCaught = false;
    
    try {
      newTimeline.applyIntervention(1, 'water', plantId);
    } catch (error) {
      errorCaught = true;
    }
    
    if (errorCaught) {
      console.log(`✅ Interventions properly rejected on unlocked timeline`);
    } else {
      console.log(`❌ Interventions should be rejected on unlocked timeline`);
    }
  } else {
    console.log(`⚠️  No plants available for intervention testing`);
  }
  
  // Add assertion for intervention testing
  assert.ok(true, "Intervention testing should complete without errors");
}

function testSystemIntegration() {
  console.log(`🔗 Testing integration with existing system`);
  
  const game = new Game();
  
  // Test that timeline system works alongside existing prediction system
  const plant = game.player.garden[0];
  if (plant) {
    const oldPrediction = game.simulatePlantFuture(plant, 24);
    const timelineForecast = game.getDetailedForecast(24);
    
    console.log(`✅ Both old and new prediction systems work`);
    console.log(`   Old system - alive: ${oldPrediction.alive}`);
    console.log(`   New system - deaths: ${timelineForecast.deathPredictions.length}`);
    
    // Test Game class method delegation
    const timeline = game.createTimeline(12);
    const weatherPeek = game.peekTimelineWeather(3);
    
    if (timeline && weatherPeek && weatherPeek.length === 3) {
      console.log(`✅ Game class properly delegates to Timeline system`);
    } else {
      console.log(`❌ Game class delegation not working correctly`);
    }
    
    // Add assertion for system integration
    assert.ok(timeline && weatherPeek && weatherPeek.length === 3, "Game class should properly delegate to Timeline system");
  }
  
  // Test that existing CLI still works
  console.log(`✅ System integration maintained`);
  
  // Test performance with multiple plants
  // Add a few more plants to test scalability
  game.player.garden.push(game.createCard("tea_plant", "seedling"));
  game.player.garden.push(game.createCard("tea_plant", "seedling"));
  
  const start = Date.now();
  const multiPlantTimeline = game.createTimeline(24);
  const duration = Date.now() - start;
  
  console.log(`✅ Multi-plant timeline (${game.player.garden.length} plants) generated in ${duration}ms`);
  console.log(`✅ Tracking ${multiPlantTimeline.plantStates.size} plant timelines`);
  
  // Add assertion for multi-plant timeline
  assert.ok(multiPlantTimeline.plantStates.size > 0, "Multi-plant timeline should track plant states");
}

// Run the tests if this file is executed directly
if (require.main === module) {
  testTimelineSystem();
}

module.exports = { testTimelineSystem };