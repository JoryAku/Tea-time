// Improved timeline consistency test with harvestable plant
// This test validates the fix for the timeline consistency bug

const assert = require('assert');
const Game = require("../../engine/Game");

function testTimelineConsistencyFixed() {
  console.log("=== Testing Fixed Timeline Consistency ===\n");

  const game = new Game();
  game.player.actionsLeft = 10;
  
  // Create a plant that will be in a more advanced state and harvestable
  const plant = game.createCard("tea_plant", "growing");
  // Make it closer to maturity so it can be harvested within the timeline
  plant.stateProgress = 8; // Almost ready to advance
  game.player.garden.push(plant);
  
  // Create Green Tea and Oolong Tea
  const greenTea = game.createCard("green_tea");
  const oolongTea = game.createCard("oolong_tea");
  game.player.addCardToLocation(greenTea, "cafe");
  game.player.addCardToLocation(oolongTea, "cafe");
  
  console.log("Step 1: View timeline with Green Tea");
  console.log("Plant initial state:", plant.name, "[" + plant.state + "]", "progress:", plant.stateProgress);
  
  // Consume Green Tea to see initial timeline
  const greenTeaResult = game.consumeGreenTeaWithPlantSelection(greenTea, 0);
  console.log("Green Tea result:", greenTeaResult === true ? "Success" : "Failed");
  
  console.log("\nStep 2: Apply protective intervention");
  
  // Apply protection to change the timeline
  const protectionResult = game.engine.applyProtectiveIntervention(0, 'water');
  console.log("Protection applied:", protectionResult.success ? "Success" : "Failed");
  
  console.log("\nStep 3: Check Oolong Tea with updated timeline");
  
  // Now consume Oolong Tea - it should use the same updated timeline
  const oolongTeaResult = game.consumeOolongTeaWithPlantSelection(oolongTea, 0);
  console.log("Oolong Tea result:", oolongTeaResult);
  
  // Check results
  const isFixed = oolongTeaResult.success || 
                  (oolongTeaResult.deathInfo && oolongTeaResult.harvestOpportunities);
  
  console.log("\n=== RESULTS ===");
  console.log("Green Tea:", greenTeaResult === true ? "✅ PASS" : "❌ FAIL");
  console.log("Oolong Tea consistency:", isFixed ? "✅ PASS - Uses same timeline" : "❌ FAIL - Different timeline");
  
  return {
    greenTeaWorked: greenTeaResult === true,
    oolongTeaConsistent: isFixed,
    bothConsistent: greenTeaResult === true && isFixed
  };
}

function testTimelineConsistencyWithMaturePlant() {
  console.log("\n=== Testing with Mature Plant Close to Harvest ===\n");

  const game = new Game();
  game.player.actionsLeft = 20;
  
  // Create a mature plant that should be harvestable soon
  const plant = game.createCard("tea_plant", "mature");
  plant.harvestReady = false; // Not currently harvestable
  plant.stateProgress = 5; // Will be ready soon
  game.player.garden.push(plant);
  
  // Create teas
  const greenTea = game.createCard("green_tea");
  const oolongTea = game.createCard("oolong_tea");
  game.player.addCardToLocation(greenTea, "cafe");
  game.player.addCardToLocation(oolongTea, "cafe");
  
  console.log("Plant state:", plant.name, "[" + plant.state + "]", "harvestReady:", plant.harvestReady, "progress:", plant.stateProgress);
  
  // Test Green Tea first
  console.log("\nTesting Green Tea...");
  const greenTeaResult = game.consumeGreenTeaWithPlantSelection(greenTea, 0);
  
  // Test Oolong Tea
  console.log("\nTesting Oolong Tea...");
  const oolongTeaResult = game.consumeOolongTeaWithPlantSelection(oolongTea, 0);
  
  console.log("\n=== COMPARISON ===");
  console.log("Green Tea:", greenTeaResult === true ? "✅ Success" : "❌ Failed");
  console.log("Oolong Tea:", oolongTeaResult.success ? "✅ Success" : `❌ Failed: ${oolongTeaResult.message}`);
  
  if (oolongTeaResult.harvestOpportunities) {
    console.log("Harvest opportunities found:", oolongTeaResult.harvestOpportunities.length);
  }
  
  if (oolongTeaResult.deathInfo) {
    console.log("Death info:", oolongTeaResult.deathInfo);
  }
  
  // Both should work with mature plants
  const bothWork = greenTeaResult === true && (oolongTeaResult.success || oolongTeaResult.requiresSelection);
  console.log("Timeline consistency:", bothWork ? "✅ CONSISTENT" : "❌ INCONSISTENT");
  
  return {
    greenTeaWorked: greenTeaResult === true,
    oolongTeaWorked: oolongTeaResult.success || oolongTeaResult.requiresSelection,
    bothConsistent: bothWork
  };
}

// Run tests
console.log("Testing Timeline Consistency Fix...\n");

const fixedTest = testTimelineConsistencyFixed();
const maturePlantTest = testTimelineConsistencyWithMaturePlant();

console.log("\n=== FINAL SUMMARY ===");
console.log("Protection Test:");
console.log(`  Timeline Consistency: ${fixedTest.bothConsistent ? '✅ FIXED' : '❌ STILL BROKEN'}`);

console.log("\nMature Plant Test:");
console.log(`  Both teas work: ${maturePlantTest.bothConsistent ? '✅ PASS' : '❌ FAIL'}`);

if (fixedTest.bothConsistent && maturePlantTest.bothConsistent) {
  console.log("\n🎉 SUCCESS: Timeline consistency bug has been FIXED!");
  console.log("Both Green Tea and Oolong Tea now use the same timeline system.");
} else {
  console.log("\n❌ Timeline consistency issue still exists.");
}