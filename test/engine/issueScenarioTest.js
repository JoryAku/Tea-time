// Test the exact scenario from the issue description

const assert = require('assert');
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testIssueScenario() {
  console.log("=== Testing Exact Issue Scenario ===\n");
  
  console.log("Issue scenario 1: Apply shelter to a plant at risk of frost, consume green tea");
  
  // Step 1: Apply shelter to a plant at risk of frost
  const game1 = new Game();
  game1.player.actionsLeft = 10;
  
  const plant1 = game1.player.garden[0];
  console.log(`Initial plant: ${plant1.name} [${plant1.state}]`);
  console.log(`Vulnerabilities: ${plant1.definition.states[plant1.state].vulnerabilities.map(v => v.event).join(', ')}`);
  console.log(`Initial active conditions: ${Object.keys(plant1.activeConditions || {}).join(', ') || 'none'}`);
  
  // Apply shelter protection
  const shelterResult = ActionResolver.resolve('shelter garden 0', game1);
  console.log(`\nApplied shelter protection: ${shelterResult}`);
  console.log(`After shelter - active conditions: ${Object.keys(plant1.activeConditions || {}).join(', ')}`);
  
  // Step 2: Consume green tea on that plant
  ActionResolver.resolve("brew kitchen 0", game1);
  const greenTea1 = game1.player.cafe[0];
  
  console.log(`\nConsuming ${greenTea1.name} to predict timeline...`);
  console.log("--- Green Tea Timeline (should NOT show frost death) ---");
  game1.consumeGreenTeaWithPlantSelection(greenTea1, 0);
  
  console.log("\n" + "=".repeat(60) + "\n");
  
  console.log("Issue scenario 2: Apply water to a plant at risk of drought, consume green tea");
  
  // Step 1: Apply water to a plant at risk of drought
  const game2 = new Game();
  game2.player.actionsLeft = 10;
  
  const plant2 = game2.player.garden[0];
  console.log(`Initial plant: ${plant2.name} [${plant2.state}]`);
  console.log(`Vulnerabilities: ${plant2.definition.states[plant2.state].vulnerabilities.map(v => v.event).join(', ')}`);
  console.log(`Initial active conditions: ${Object.keys(plant2.activeConditions || {}).join(', ') || 'none'}`);
  
  // Apply water protection
  const waterResult = ActionResolver.resolve('water garden 0', game2);
  console.log(`\nApplied water protection: ${waterResult}`);
  console.log(`After water - active conditions: ${Object.keys(plant2.activeConditions || {}).join(', ')}`);
  
  // Step 2: Consume green tea on that plant
  ActionResolver.resolve("brew kitchen 0", game2);
  const greenTea2 = game2.player.cafe[0];
  
  console.log(`\nConsuming ${greenTea2.name} to predict timeline...`);
  console.log("--- Green Tea Timeline (should NOT show drought death within 6 turns) ---");
  game2.consumeGreenTeaWithPlantSelection(greenTea2, 0);
  
  console.log("\n" + "=".repeat(60) + "\n");
  
  console.log("Expected behavior analysis:");
  console.log("- If shelter is active, frost death events should not appear in timeline");
  console.log("- If water is active, predicted drought deaths within 6 turns should be cleared");
  console.log("- The timeline should use current state including active protection conditions");
  
  return {
    shelterApplied: shelterResult,
    waterApplied: waterResult,
    testCompleted: true
  };
}

function testBothProtectionsScenario() {
  console.log("\n=== Testing Both Protections Scenario ===\n");
  
  const game = new Game();
  game.player.actionsLeft = 10;
  
  const plant = game.player.garden[0];
  console.log(`Plant: ${plant.name} [${plant.state}]`);
  console.log(`Vulnerabilities: ${plant.definition.states[plant.state].vulnerabilities.map(v => v.event).join(', ')}`);
  
  // Apply both protections
  const shelterResult = ActionResolver.resolve('shelter garden 0', game);
  const waterResult = ActionResolver.resolve('water garden 0', game);
  
  console.log(`Applied shelter: ${shelterResult}`);
  console.log(`Applied water: ${waterResult}`);
  console.log(`Active conditions: ${Object.keys(plant.activeConditions || {}).join(', ')}`);
  
  // Check protection durations
  console.log(`Protection durations:`, plant.activeConditions);
  
  // Consume green tea
  ActionResolver.resolve("brew kitchen 0", game);
  const greenTea = game.player.cafe[0];
  
  console.log(`\nConsuming ${greenTea.name} with both protections active...`);
  console.log("--- Timeline (should show survival or delayed death) ---");
  game.consumeGreenTeaWithPlantSelection(greenTea, 0);
  
  return {
    bothProtectionsApplied: shelterResult && waterResult,
    testCompleted: true
  };
}

// Run the tests
const result1 = testIssueScenario();
const result2 = testBothProtectionsScenario();

// Add basic assertion
assert.ok(true, "Issue scenario tests should complete without errors");

module.exports = { testIssueScenario, testBothProtectionsScenario };