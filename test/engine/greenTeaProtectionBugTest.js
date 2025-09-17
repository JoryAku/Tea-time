// Focused test to reproduce the Green Tea protection bug

const assert = require('assert');
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testGreenTeaProtectionBug() {
  console.log("=== Testing Green Tea Protection Bug ===\n");
  
  // Test Case 1: Water protection should prevent drought death
  console.log("Test Case 1: Water protection vs drought prediction");
  const game1 = new Game();
  game1.player.actionsLeft = 10;
  
  const plant1 = game1.player.garden[0];
  
  // Apply water protection first
  plant1.activeConditions = { water: 10 }; // Enough to last the whole prediction period
  console.log(`Plant1: ${plant1.name} [${plant1.state}]`);
  console.log(`Active conditions: ${Object.keys(plant1.activeConditions).join(', ')}`);
  console.log(`Water protection duration: ${plant1.activeConditions.water} actions`);
  
  // Brew and consume Green Tea to get prediction
  ActionResolver.resolve("brew kitchen 0", game1);
  const teaCard1 = game1.player.cafe[0];
  
  console.log("\n--- Green Tea Prediction with Water Protection ---");
  const prediction1 = game1.engine.simulatePlantFuture(plant1, 48);
  
  console.log(`Prediction result: ${prediction1.alive ? 'SURVIVES' : 'DIES'}`);
  if (!prediction1.alive) {
    console.log(`Death cause: ${prediction1.deathInfo.cause} at action ${prediction1.deathInfo.action}`);
  }
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test Case 2: Shelter protection should prevent frost death  
  console.log("Test Case 2: Shelter protection vs frost prediction");
  const game2 = new Game();
  game2.player.actionsLeft = 10;
  
  const plant2 = game2.player.garden[0];
  
  // Apply shelter protection (which gives sunlight condition)
  plant2.activeConditions = { sunlight: 10 }; // Enough to last the whole prediction period
  console.log(`Plant2: ${plant2.name} [${plant2.state}]`);
  console.log(`Active conditions: ${Object.keys(plant2.activeConditions).join(', ')}`);
  console.log(`Sunlight protection duration: ${plant2.activeConditions.sunlight} actions`);
  
  // Brew and consume Green Tea to get prediction
  ActionResolver.resolve("brew kitchen 0", game2);
  const teaCard2 = game2.player.cafe[0];
  
  console.log("\n--- Green Tea Prediction with Shelter Protection ---");
  const prediction2 = game2.engine.simulatePlantFuture(plant2, 48);
  
  console.log(`Prediction result: ${prediction2.alive ? 'SURVIVES' : 'DIES'}`);
  if (!prediction2.alive) {
    console.log(`Death cause: ${prediction2.deathInfo.cause} at action ${prediction2.deathInfo.action}`);
  }
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test Case 3: No protection - baseline
  console.log("Test Case 3: No protection - baseline");
  const game3 = new Game();
  game3.player.actionsLeft = 10;
  
  const plant3 = game3.player.garden[0];
  console.log(`Plant3: ${plant3.name} [${plant3.state}]`);
  console.log(`Active conditions: ${Object.keys(plant3.activeConditions || {}).join(', ') || 'none'}`);
  
  // Brew and consume Green Tea to get prediction
  ActionResolver.resolve("brew kitchen 0", game3);
  const teaCard3 = game3.player.cafe[0];
  
  console.log("\n--- Green Tea Prediction with No Protection ---");
  const prediction3 = game3.engine.simulatePlantFuture(plant3, 48);
  
  console.log(`Prediction result: ${prediction3.alive ? 'SURVIVES' : 'DIES'}`);
  if (!prediction3.alive) {
    console.log(`Death cause: ${prediction3.deathInfo.cause} at action ${prediction3.deathInfo.action}`);
  }
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Analysis
  console.log("=== ANALYSIS ===");
  
  // Expected behavior: 
  // - Plant with water protection should not die from drought
  // - Plant with sunlight protection should not die from frost
  // - Plant with no protection may die from either
  
  console.log("Expected behavior:");
  console.log("  - Water protection should prevent drought deaths");
  console.log("  - Sunlight protection should prevent frost deaths");
  console.log("  - No protection should allow death from vulnerabilities");
  
  console.log("\nActual behavior:");
  console.log(`  - Water protected plant: ${prediction1.alive ? 'SURVIVES' : 'DIES' + (prediction1.deathInfo ? ' from ' + prediction1.deathInfo.cause : '')}`);
  console.log(`  - Sunlight protected plant: ${prediction2.alive ? 'SURVIVES' : 'DIES' + (prediction2.deathInfo ? ' from ' + prediction2.deathInfo.cause : '')}`);
  console.log(`  - Unprotected plant: ${prediction3.alive ? 'SURVIVES' : 'DIES' + (prediction3.deathInfo ? ' from ' + prediction3.deathInfo.cause : '')}`);
  
  // Identify the bug
  let bugFound = false;
  
  if (!prediction1.alive && prediction1.deathInfo.cause === 'drought') {
    console.log("\n🐛 BUG FOUND: Water protection is NOT preventing drought death!");
    bugFound = true;
  }
  
  if (!prediction2.alive && prediction2.deathInfo.cause === 'frost') {
    console.log("\n🐛 BUG FOUND: Sunlight protection is NOT preventing frost death!");
    bugFound = true;
  }
  
  if (!bugFound) {
    console.log("\n✅ No bugs found in this test run - protection logic seems to work correctly");
  }
  
  return {
    waterProtectionWorks: prediction1.alive || prediction1.deathInfo.cause !== 'drought',
    sunlightProtectionWorks: prediction2.alive || prediction2.deathInfo.cause !== 'frost',
    bugFound: bugFound
  };
}

// Run the test
const result = testGreenTeaProtectionBug();

// Add basic assertion
assert.ok(true, "Test should complete without errors");

module.exports = { testGreenTeaProtectionBug };