// Test the outcome-driven prediction system for Green Tea effects

const Game = require("../../engine/Game");

function testPredictionSystem() {
  console.log("=== Testing Outcome-Driven Prediction System ===\n");

  // Test 1: Alive prediction should have no vulnerability events
  console.log("Test 1: Alive Plant Prediction");
  testAlivePrediction();
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 2: Dead prediction should have vulnerability event on death day
  console.log("Test 2: Dead Plant Prediction");
  testDeadPrediction();
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 3: Randomization still works within constraints
  console.log("Test 3: Randomization Within Constraints");
  testRandomizationWithinConstraints();
  
  console.log("\n✅ All prediction tests completed!");
}

function testAlivePrediction() {
  // Create multiple games to test for consistency in alive predictions
  let aliveCount = 0;
  let totalTests = 10;
  
  for (let i = 0; i < totalTests; i++) {
    const game = new Game();
    const plant = game.player.garden[0]; // seedling
    
    // Make multiple prediction attempts to find an "alive" prediction
    const prediction = game.simulatePlantFuture(plant, 48);
    
    if (prediction.alive) {
      aliveCount++;
      
      // Verify that the weather forecast contains no vulnerability events
      const vulnerableEvents = getPlantVulnerabilities(plant);
      const hasVulnerableEvent = prediction.weatherForecast.some(event => 
        vulnerableEvents.includes(event)
      );
      
      if (hasVulnerableEvent) {
        console.log("❌ FAILURE: Alive prediction contains vulnerability events!");
        console.log("   Vulnerable events found:", prediction.weatherForecast.filter(event => 
          vulnerableEvents.includes(event)
        ));
        return false;
      }
      
      console.log("✅ Alive prediction verified - no vulnerability events in forecast");
      console.log(`   Forecast length: ${prediction.weatherForecast.length} actions`);
      console.log(`   Final state: ${prediction.finalState}`);
      
      // Show sample of forecast events
      const sampleEvents = prediction.weatherForecast.slice(0, 10);
      console.log(`   Sample forecast: ${sampleEvents.join(", ")}`);
      
      return true;
    }
  }
  
  console.log(`ℹ️  No alive predictions found in ${totalTests} attempts`);
  console.log(`   This is normal if survival rate is low for this plant state`);
  return true;
}

function testDeadPrediction() {
  // Create multiple games to test for consistency in dead predictions
  let deadCount = 0;
  let totalTests = 10;
  
  for (let i = 0; i < totalTests; i++) {
    const game = new Game();
    const plant = game.player.garden[0]; // seedling
    
    const prediction = game.simulatePlantFuture(plant, 48);
    
    if (!prediction.alive && prediction.deathInfo) {
      deadCount++;
      
      // Verify that the death action contains a vulnerability event
      const vulnerableEvents = getPlantVulnerabilities(plant);
      const deathAction = prediction.deathInfo.action;
      const deathEvent = prediction.weatherForecast[deathAction - 1];
      
      if (!vulnerableEvents.includes(deathEvent)) {
        console.log("❌ FAILURE: Dead prediction doesn't have vulnerability event on death day!");
        console.log(`   Death action: ${deathAction}`);
        console.log(`   Death event: ${deathEvent}`);
        console.log(`   Plant vulnerabilities: ${vulnerableEvents.join(", ")}`);
        return false;
      }
      
      // Verify events before death don't include vulnerabilities
      const eventsBeforeDeath = prediction.weatherForecast.slice(0, deathAction - 1);
      const hasEarlyVulnerableEvent = eventsBeforeDeath.some(event => 
        vulnerableEvents.includes(event)
      );
      
      if (hasEarlyVulnerableEvent) {
        console.log("❌ FAILURE: Dead prediction has vulnerability events before death day!");
        console.log("   Early vulnerable events:", eventsBeforeDeath.filter(event => 
          vulnerableEvents.includes(event)
        ));
        return false;
      }
      
      console.log("✅ Dead prediction verified - vulnerability event on death day only");
      console.log(`   Death action: ${deathAction} (${prediction.deathInfo.cause})`);
      console.log(`   Season: ${prediction.deathInfo.season}`);
      console.log(`   Events before death contain no vulnerabilities`);
      
      return true;
    }
  }
  
  console.log(`ℹ️  No dead predictions found in ${totalTests} attempts`);
  console.log(`   This is normal if survival rate is high for this plant state`);
  return true;
}

function testRandomizationWithinConstraints() {
  // Test that multiple predictions for the same plant state give varied but consistent outcomes
  const game = new Game();
  const plant = game.player.garden[0];
  
  const predictions = [];
  const numTests = 5;
  
  for (let i = 0; i < numTests; i++) {
    // Create a fresh game for each prediction to get different random outcomes
    const freshGame = new Game();
    const freshPlant = freshGame.player.garden[0];
    const prediction = freshGame.simulatePlantFuture(freshPlant, 48);
    predictions.push(prediction);
  }
  
  // Check that we get some variation in outcomes
  const aliveCount = predictions.filter(p => p.alive).length;
  const deadCount = predictions.filter(p => !p.alive).length;
  
  console.log(`Results from ${numTests} predictions:`);
  console.log(`   Alive predictions: ${aliveCount}`);
  console.log(`   Dead predictions: ${deadCount}`);
  
  // Check that weather forecasts are different (randomization working)
  const forecasts = predictions.map(p => p.weatherForecast.slice(0, 5).join(","));
  const uniqueForecasts = new Set(forecasts).size;
  
  console.log(`   Unique forecast patterns (first 5 events): ${uniqueForecasts}/${numTests}`);
  
  if (uniqueForecasts >= 2) {
    console.log("✅ Randomization verified - forecasts show variation");
  } else {
    console.log("⚠️  Low forecast variation - this may be expected with constraints");
  }
  
  // Verify each prediction follows the rules
  let allValid = true;
  predictions.forEach((prediction, index) => {
    const vulnerableEvents = getPlantVulnerabilities(plant);
    
    if (prediction.alive) {
      // Alive: should have no vulnerable events
      const hasVulnerable = prediction.weatherForecast.some(event => 
        vulnerableEvents.includes(event)
      );
      if (hasVulnerable) {
        console.log(`❌ Prediction ${index + 1}: Alive but contains vulnerable events`);
        allValid = false;
      }
    } else {
      // Dead: should have vulnerable event on death day
      const deathAction = prediction.deathInfo.action;
      const deathEvent = prediction.weatherForecast[deathAction - 1];
      if (!vulnerableEvents.includes(deathEvent)) {
        console.log(`❌ Prediction ${index + 1}: Dead but no vulnerable event on death day`);
        allValid = false;
      }
    }
  });
  
  if (allValid) {
    console.log("✅ All predictions follow outcome-driven constraints");
  }
  
  return allValid;
}

function getPlantVulnerabilities(plant) {
  const stageDef = plant.definition.states[plant.state];
  if (!stageDef || !stageDef.vulnerabilities) {
    return [];
  }
  return stageDef.vulnerabilities.map(v => v.event);
}

testPredictionSystem();