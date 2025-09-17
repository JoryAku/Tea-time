// Integration test for Green Tea timeline updates after protection application
// Tests the specific issue described in the problem statement

const assert = require('assert');
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testGreenTeaProtectionIntegration() {
  console.log("=== Testing Green Tea Protection Integration ===\n");

  const game = new Game();
  game.player.actionsLeft = 10;
  
  // Step 1: Consume green tea to get initial prediction
  console.log("Step 1: Consume green tea to see initial prediction");
  ActionResolver.resolve("brew kitchen 0", game);
  const teaCard1 = game.player.cafe[0];
  const plant = game.player.garden[0];
  
  // Store the original prediction
  const initialResult = game.consumeGreenTeaWithPlantSelection(teaCard1, 0);
  assert.strictEqual(initialResult, true, "Green tea consumption should succeed");
  
  // Check that the weather forecast is now locked
  assert.strictEqual(game.engine.weatherForecastLocked, true, "Weather forecast should be locked after green tea");
  
  console.log("\n" + "=".repeat(60) + "\n");
  
  // Step 2: Apply protection using the intervention system
  console.log("Step 2: Apply protection to mitigate predicted risks");
  
  // Apply water protection (for drought protection)
  const waterResult = game.engine.applyProtectiveIntervention(0, 'water');
  assert.strictEqual(waterResult.success, true, "Water protection should be applied successfully");
  
  // Verify protection was applied with extended duration
  assert.ok(plant.activeConditions['water'], "Plant should have water protection");
  assert.strictEqual(plant.activeConditions['water'], 48, "Water protection should last 48 actions for green tea power");
  
  // Apply shelter protection (for frost protection) 
  const shelterResult = game.engine.applyProtectiveIntervention(0, 'shelter');
  assert.strictEqual(shelterResult.success, true, "Shelter protection should be applied successfully");
  
  // Verify shelter protection was applied with extended duration
  assert.ok(plant.activeConditions['sunlight'], "Plant should have sunlight protection");
  assert.strictEqual(plant.activeConditions['sunlight'], 48, "Shelter protection should last 48 actions for green tea power");
  
  console.log("\n" + "=".repeat(60) + "\n");
  
  // Step 3: Consume green tea again to verify timeline updates
  console.log("Step 3: Consume green tea again to verify updated timeline");
  console.log("Current plant protections:", Object.keys(plant.activeConditions || {}).join(', '));
  
  // Brew another green tea
  ActionResolver.resolve("brew kitchen 0", game);
  const teaCard2 = game.player.cafe[0];
  
  // Consume green tea again - should show updated timeline
  const updatedResult = game.consumeGreenTeaWithPlantSelection(teaCard2, 0);
  assert.strictEqual(updatedResult, true, "Second green tea consumption should succeed");
  
  console.log("\n✅ Green Tea Protection Integration test completed!");
  
  // Verify that the plant has both protections active
  assert.ok(plant.activeConditions['water'], "Plant should still have water protection");
  assert.ok(plant.activeConditions['sunlight'], "Plant should still have sunlight protection");
  
  return true;
}

function testProtectionWithoutGreenTea() {
  console.log("\n=== Testing Protection Without Green Tea (Should Use Normal Duration) ===\n");
  
  const game = new Game();
  game.player.actionsLeft = 10;
  
  const plant = game.player.garden[0];
  
  // Apply protection WITHOUT green tea consumption first
  console.log("Applying protection without green tea prediction active...");
  const result = game.engine.applyProtectiveIntervention(0, 'water');
  
  assert.strictEqual(result.success, true, "Protection should be applied successfully");
  assert.strictEqual(plant.activeConditions['water'], 6, "Without green tea, protection should use normal 6-action duration");
  
  console.log("✅ Normal protection duration test completed!");
  
  return true;
}

function testTimelineRegenerationConsistency() {
  console.log("\n=== Testing Timeline Regeneration Consistency ===\n");
  
  const game = new Game();
  game.player.actionsLeft = 10;
  
  // Consume green tea first
  ActionResolver.resolve("brew kitchen 0", game);
  const teaCard1 = game.player.cafe[0];
  game.consumeGreenTeaWithPlantSelection(teaCard1, 0);
  
  // Get timeline before protection
  const plant = game.player.garden[0];
  const timelineBefore = game.engine.getOrCreatePlantTimeline(plant, 48);
  const deathsBefore = timelineBefore.getDeathPredictions();
  
  console.log(`Deaths predicted before protection: ${deathsBefore.length}`);
  
  // Apply comprehensive protection
  game.engine.applyProtectiveIntervention(0, 'water');
  game.engine.applyProtectiveIntervention(0, 'shelter');
  
  // Get timeline after protection
  const timelineAfter = game.engine.getOrCreatePlantTimeline(plant, 48, true);
  const deathsAfter = timelineAfter.getDeathPredictions();
  
  console.log(`Deaths predicted after protection: ${deathsAfter.length}`);
  
  // With comprehensive protection, deaths should be reduced or eliminated
  assert.ok(deathsAfter.length <= deathsBefore.length, "Protection should reduce or eliminate predicted deaths");
  
  console.log("✅ Timeline regeneration consistency test completed!");
  
  return true;
}

// Run all tests
try {
  testGreenTeaProtectionIntegration();
  testProtectionWithoutGreenTea();
  testTimelineRegenerationConsistency();
  
  console.log("\n🎉 All Green Tea Protection Integration tests PASSED!");
} catch (error) {
  console.error("\n❌ Test failed:", error.message);
  process.exit(1);
}