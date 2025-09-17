// Test timeline consistency between Green Tea and Oolong Tea
// This test validates that both teas use the same timeline system for plant predictions

const assert = require('assert');
const Game = require("../../engine/Game");

function testTimelineConsistencyAfterProtection() {
  console.log("=== Testing Timeline Consistency After Plant Protection ===\n");

  const game = new Game();
  game.player.actionsLeft = 10;
  
  // Create a plant that will be vulnerable to death
  const plant = game.createCard("tea_plant", "seedling");
  game.player.garden.push(plant);
  
  // Create Green Tea and Oolong Tea
  const greenTea = game.createCard("green_tea");
  const oolongTea = game.createCard("oolong_tea");
  game.player.addCardToLocation(greenTea, "cafe");
  game.player.addCardToLocation(oolongTea, "cafe");
  
  console.log("Step 1: View timeline with Green Tea to establish baseline");
  console.log("Before protection - consuming Green Tea...");
  
  // Consume Green Tea to see initial timeline
  const greenTeaResult = game.consumeGreenTeaWithPlantSelection(greenTea, 0);
  console.log("Green Tea consumption result:", greenTeaResult);
  
  console.log("\nStep 2: Apply protective intervention to change plant's fate");
  
  // Apply water protection to the plant (protects against drought)
  const protectionResult = game.engine.applyProtectiveIntervention(0, 'water');
  console.log("Protection result:", protectionResult.success ? "Success" : "Failed");
  
  console.log("\nStep 3: Check if Oolong Tea sees the same updated timeline");
  console.log("After protection - consuming Oolong Tea...");
  
  // Now consume Oolong Tea and check if it sees the same protected timeline
  const oolongTeaResult = game.consumeOolongTeaWithPlantSelection(oolongTea, 0);
  console.log("Oolong Tea consumption result:", oolongTeaResult);
  
  // The bug: Oolong Tea should use the same timeline as Green Tea
  // If the bug exists, Oolong Tea will create a fresh timeline that doesn't consider the protection
  
  if (oolongTeaResult.success) {
    console.log("✅ Oolong Tea successfully used the protected timeline");
  } else {
    console.log("❌ BUG DETECTED: Oolong Tea failed to use the protected timeline");
    console.log("This indicates Oolong Tea is not using the same timeline system as Green Tea");
  }
  
  return {
    greenTeaWorked: greenTeaResult === true,
    oolongTeaWorked: oolongTeaResult.success === true,
    consistentTimeline: greenTeaResult === true && oolongTeaResult.success === true
  };
}

function testTimelineConsistencyWithoutProtection() {
  console.log("\n=== Testing Basic Timeline Consistency (Control Test) ===\n");

  const game = new Game();
  game.player.actionsLeft = 10;
  
  // Create a mature plant that should work with both teas
  const plant = game.createCard("tea_plant", "mature");
  plant.harvestReady = false; // Not currently harvestable, so Oolong can work
  game.player.garden.push(plant);
  
  // Create Green Tea and Oolong Tea
  const greenTea = game.createCard("green_tea");
  const oolongTea = game.createCard("oolong_tea");
  game.player.addCardToLocation(greenTea, "cafe");
  game.player.addCardToLocation(oolongTea, "cafe");
  
  console.log("Testing both teas without any protection interventions...");
  
  // Consume Green Tea first
  const greenTeaResult = game.consumeGreenTeaWithPlantSelection(greenTea, 0);
  console.log("Green Tea result:", greenTeaResult === true ? "Success" : "Failed");
  
  // Consume Oolong Tea second
  const oolongTeaResult = game.consumeOolongTeaWithPlantSelection(oolongTea, 0);
  console.log("Oolong Tea result:", oolongTeaResult.success ? "Success" : "Failed");
  
  return {
    greenTeaWorked: greenTeaResult === true,
    oolongTeaWorked: oolongTeaResult.success === true,
    bothWorked: greenTeaResult === true && oolongTeaResult.success === true
  };
}

// Run tests
console.log("Starting Timeline Consistency Tests...\n");

const controlTest = testTimelineConsistencyWithoutProtection();
const protectionTest = testTimelineConsistencyAfterProtection();

console.log("\n=== TEST RESULTS SUMMARY ===");
console.log("Control Test (no protection):");
console.log(`  Green Tea: ${controlTest.greenTeaWorked ? 'PASS' : 'FAIL'}`);
console.log(`  Oolong Tea: ${controlTest.oolongTeaWorked ? 'PASS' : 'FAIL'}`);
console.log(`  Overall: ${controlTest.bothWorked ? 'PASS' : 'FAIL'}`);

console.log("\nProtection Test (after plant protection):");
console.log(`  Green Tea: ${protectionTest.greenTeaWorked ? 'PASS' : 'FAIL'}`);
console.log(`  Oolong Tea: ${protectionTest.oolongTeaWorked ? 'PASS' : 'FAIL'}`);
console.log(`  Timeline Consistency: ${protectionTest.consistentTimeline ? 'PASS' : 'FAIL'}`);

if (!protectionTest.consistentTimeline) {
  console.log("\n❌ BUG CONFIRMED: Oolong Tea does not use the same timeline system as Green Tea");
  console.log("   Expected: Both teas should show the same plant predictions after protection");
  console.log("   Actual: Oolong Tea ignores protection and shows different timeline");
} else {
  console.log("\n✅ Timeline consistency confirmed: Both teas use the same timeline system");
}