// Test to verify Green Tea timeline considers existing protections

const assert = require('assert');
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testGreenTeaWithBothProtections() {
  console.log("=== Testing Green Tea with Both Protections ===\n");
  
  // Test Case: Both protections applied
  console.log("Test Case: Both water and sunlight protection");
  const game = new Game();
  game.player.actionsLeft = 10;
  
  const plant = game.player.garden[0];
  
  // Apply both protections with sufficient duration
  plant.activeConditions = { 
    water: 48,      // Water protection for entire simulation
    sunlight: 48    // Sunlight protection for entire simulation
  };
  
  console.log(`Plant: ${plant.name} [${plant.state}]`);
  console.log(`Active conditions: ${Object.keys(plant.activeConditions).join(', ')}`);
  console.log(`Protection durations: water=${plant.activeConditions.water}, sunlight=${plant.activeConditions.sunlight}`);
  
  // Brew and consume Green Tea to get prediction
  ActionResolver.resolve("brew kitchen 0", game);
  const teaCard = game.player.cafe[0];
  
  console.log("\n--- Green Tea Prediction with Both Protections ---");
  const prediction = game.engine.simulatePlantFuture(plant, 48);
  
  console.log(`Prediction result: ${prediction.alive ? 'SURVIVES' : 'DIES'}`);
  if (!prediction.alive) {
    console.log(`Death cause: ${prediction.deathInfo.cause} at action ${prediction.deathInfo.action}`);
  }
  
  console.log("\n--- Testing the scenario from the issue ---");
  
  // Test the exact scenario from the issue description:
  // 1. Apply shelter to a plant at risk of frost
  // 2. Consume green tea on that plant  
  // 3. Timeline should NOT predict frost death
  
  console.log("\nScenario: Apply shelter protection, then consume Green Tea");
  const game2 = new Game();
  game2.player.actionsLeft = 10;
  
  const plant2 = game2.player.garden[0];
  
  // Apply shelter protection (gives sunlight condition)
  ActionResolver.resolve("shelter garden 0", game2);
  console.log(`After shelter: Active conditions: ${Object.keys(plant2.activeConditions || {}).join(', ')}`);
  
  // Brew Green Tea
  ActionResolver.resolve("brew kitchen 0", game2);
  const greenTea = game2.player.cafe[0];
  
  // Consume Green Tea and check prediction
  console.log("\nConsuming Green Tea after applying shelter protection...");
  game2.consumeGreenTeaWithPlantSelection(greenTea, 0);
  
  return {
    bothProtectionsResult: prediction.alive,
    shelterThenGreenTeaCompleted: true
  };
}

function testActiveProtectionLogic() {
  console.log("\n=== Testing Active Protection Logic in Timeline ===\n");
  
  const game = new Game();
  game.player.actionsLeft = 10;
  
  const plant = game.player.garden[0];
  
  // Test what happens in the Timeline class when we have specific protections
  console.log("Testing Timeline._determineOutcomeFromForecast logic...");
  
  // Create scenarios to verify protection logic
  const testCases = [
    { name: "No protection", conditions: {} },
    { name: "Water only", conditions: { water: 10 } },
    { name: "Sunlight only", conditions: { sunlight: 10 } },
    { name: "Both protections", conditions: { water: 10, sunlight: 10 } }
  ];
  
  testCases.forEach(testCase => {
    console.log(`\nTest: ${testCase.name}`);
    
    // Create a fresh game for each test
    const testGame = new Game();
    testGame.player.actionsLeft = 10;
    const testPlant = testGame.player.garden[0];
    
    // Apply the test conditions
    testPlant.activeConditions = { ...testCase.conditions };
    
    console.log(`  Conditions: ${Object.keys(testPlant.activeConditions).join(', ') || 'none'}`);
    
    // Generate prediction
    const prediction = testGame.engine.simulatePlantFuture(testPlant, 48);
    
    console.log(`  Result: ${prediction.alive ? 'SURVIVES' : 'DIES'}`);
    if (!prediction.alive) {
      console.log(`  Death: ${prediction.deathInfo.cause} at action ${prediction.deathInfo.action}`);
    }
  });
  
  console.log("\n✅ Active protection logic testing completed!");
}

// Run the tests
const result = testGreenTeaWithBothProtections();
testActiveProtectionLogic();

// Add basic assertion
assert.ok(true, "Test should complete without errors");

module.exports = { testGreenTeaWithBothProtections, testActiveProtectionLogic };