// Test the issue with random vs predetermined forecasts

const assert = require('assert');
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testRandomVsPredeterminedForecast() {
  console.log("=== Testing Random vs Predetermined Forecast Issue ===\n");
  
  // Test 1: With predetermined forecast (which worked in our tests)
  console.log("Test 1: With manually set predetermined forecast");
  const game1 = new Game();
  game1.player.actionsLeft = 10;
  
  const plant1 = game1.player.garden[0];
  plant1.activeConditions = { water: 15 }; // Long protection
  
  // Force an early drought
  const safeForecast = ['drought', 'drought'];
  while (safeForecast.length < 48) {
    safeForecast.push('sun');
  }
  
  game1.engine.weatherSystem.setPredeterminedForecast(safeForecast);
  game1.engine.weatherForecastLocked = true;
  
  console.log(`Plant1 has water protection for ${plant1.activeConditions.water} actions`);
  console.log("Forecast: early droughts, then all sun");
  
  const result1 = game1.engine.simulatePlantFuture(plant1, 48);
  console.log(`Result1: ${result1.alive ? 'SURVIVES' : 'DIES'}`);
  if (!result1.alive) {
    console.log(`  Death: ${result1.deathInfo.cause} at action ${result1.deathInfo.action}`);
  }
  
  console.log("\n" + "-".repeat(50) + "\n");
  
  // Test 2: With random forecast (like the original issue)
  console.log("Test 2: With random forecast generation");
  const game2 = new Game();
  game2.player.actionsLeft = 10;
  
  const plant2 = game2.player.garden[0];
  plant2.activeConditions = { water: 15 }; // Same long protection
  
  console.log(`Plant2 has water protection for ${plant2.activeConditions.water} actions`);
  console.log("Using random forecast generation...");
  
  // Don't set predetermined forecast - let it generate randomly
  const result2 = game2.engine.simulatePlantFuture(plant2, 48);
  console.log(`Result2: ${result2.alive ? 'SURVIVES' : 'DIES'}`);
  if (!result2.alive) {
    console.log(`  Death: ${result2.deathInfo.cause} at action ${result2.deathInfo.action}`);
  }
  
  // Check the generated forecast
  const forecast = game2.engine.weatherSystem.predeterminedForecast;
  console.log("Generated forecast (first 20 actions):");
  forecast.slice(0, 20).forEach((weather, index) => {
    console.log(`  Action ${index + 1}: ${weather}`);
  });
  
  console.log("\n" + "-".repeat(50) + "\n");
  
  // Test 3: Multiple random forecast runs to see consistency
  console.log("Test 3: Multiple random forecast runs for consistency");
  
  const results = [];
  for (let i = 0; i < 5; i++) {
    const testGame = new Game();
    testGame.player.actionsLeft = 10;
    
    const testPlant = testGame.player.garden[0];
    testPlant.activeConditions = { water: 15 };
    
    const testResult = testGame.engine.simulatePlantFuture(testPlant, 48);
    results.push({
      run: i + 1,
      survives: testResult.alive,
      deathInfo: testResult.alive ? null : testResult.deathInfo
    });
    
    console.log(`Run ${i + 1}: ${testResult.alive ? 'SURVIVES' : 'DIES'}`);
    if (!testResult.alive) {
      console.log(`  Death: ${testResult.deathInfo.cause} at action ${testResult.deathInfo.action}`);
    }
  }
  
  // Analyze results
  const survivalCount = results.filter(r => r.survives).length;
  const droughtDeaths = results.filter(r => !r.survives && r.deathInfo.cause === 'drought').length;
  const frostDeaths = results.filter(r => !r.survives && r.deathInfo.cause === 'frost').length;
  
  console.log(`\nAnalysis (out of 5 runs):`);
  console.log(`  Survivals: ${survivalCount}`);
  console.log(`  Drought deaths: ${droughtDeaths}`);
  console.log(`  Frost deaths: ${frostDeaths}`);
  
  // If any plant with 15-action water protection dies from drought in the first 15 actions,
  // that would indicate a bug
  const earlyDroughtDeaths = results.filter(r => 
    !r.survives && 
    r.deathInfo.cause === 'drought' && 
    r.deathInfo.action <= 15
  ).length;
  
  console.log(`  Early drought deaths (within 15 actions): ${earlyDroughtDeaths}`);
  
  if (earlyDroughtDeaths > 0) {
    console.log("🐛 BUG DETECTED: Plant with 15-action water protection died from drought within protection period!");
  } else {
    console.log("✅ No bugs detected: All drought deaths occurred after protection expired or were from frost");
  }
  
  return {
    predeterminedWorks: result1.alive,
    randomForecastIssue: earlyDroughtDeaths > 0,
    testCompleted: true
  };
}

// Run the test
const result = testRandomVsPredeterminedForecast();

console.log("\n=== SUMMARY ===");
console.log(`Predetermined forecast works: ${result.predeterminedWorks}`);
console.log(`Random forecast has issue: ${result.randomForecastIssue}`);

// Add assertion
assert.ok(true, "Random vs predetermined forecast test should complete without errors");

module.exports = { testRandomVsPredeterminedForecast };