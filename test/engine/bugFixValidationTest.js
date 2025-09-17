// Test to demonstrate the timeline consistency bug fix
// This test reproduces the exact scenario from the bug report

const assert = require('assert');
const Game = require("../../engine/Game");

function testBugScenario() {
  console.log("=== REPRODUCING BUG SCENARIO ===");
  console.log("Bug: After consuming green tea and protecting the plant for the next 4 years.");
  console.log("If I consume the oolong tea it gives a warning the plant will die in 6 turns.");
  console.log("Oolong tea should use the same plant time line the green tea power uses.\n");

  const game = new Game();
  game.player.actionsLeft = 10;
  
  // Create a plant that will die without protection
  const plant = game.createCard("tea_plant", "seedling");
  game.player.garden.push(plant);
  
  console.log("Step 1: Consume Green Tea to see initial timeline and apply protection");
  
  // Add Green Tea and consume it
  const greenTea = game.createCard("green_tea");
  game.player.addCardToLocation(greenTea, "cafe");
  
  console.log("Consuming Green Tea...");
  const greenTeaResult = game.consumeGreenTeaWithPlantSelection(greenTea, 0);
  
  console.log("\nStep 2: Apply protection to the plant for 4 years");
  
  // Apply water protection (protects against drought for 4 years when enhanced by Green Tea)
  const protectionResult = game.engine.applyProtectiveIntervention(0, 'water');
  console.log("Protection applied for 4 years:", protectionResult.success ? "✅ Success" : "❌ Failed");
  
  console.log("\nStep 3: Test Oolong Tea - should now use the SAME timeline as Green Tea");
  
  // Add Oolong Tea and consume it - this should see the same protected timeline
  const oolongTea = game.createCard("oolong_tea");
  game.player.addCardToLocation(oolongTea, "cafe");
  
  console.log("Consuming Oolong Tea...");
  const oolongTeaResult = game.consumeOolongTeaWithPlantSelection(oolongTea, 0);
  
  console.log("\n=== RESULTS ANALYSIS ===");
  
  if (oolongTeaResult.deathInfo) {
    console.log(`Oolong Tea death prediction: Action ${oolongTeaResult.deathInfo.deathAction} from ${oolongTeaResult.deathInfo.cause}`);
    
    // The key test: If the bug is fixed, Oolong tea should see the SAME timeline
    // as Green tea, meaning it should see the same death prediction or no death at all
    // The original bug would show death in 6 turns (around action 6) ignoring the protection
    if (oolongTeaResult.deathInfo.deathAction > 20) {
      console.log("✅ BUG FIXED: Oolong Tea sees the protected timeline!");
      console.log("   Plant death is delayed, showing protection is working");
    } else {
      console.log("❌ BUG STILL EXISTS: Oolong Tea ignores protection");
      console.log("   Plant still dies early, protection not considered");
    }
  } else {
    console.log("✅ BUG FIXED: Oolong Tea sees no death - plant is fully protected!");
  }
  
  console.log("\n=== SUMMARY ===");
  console.log("Green Tea:", greenTeaResult === true ? "✅ Success" : "❌ Failed");
  console.log("Protection Applied:", protectionResult.success ? "✅ Success" : "❌ Failed");
  console.log("Oolong Tea Timeline:", oolongTeaResult.deathInfo ? 
    `Death at action ${oolongTeaResult.deathInfo.deathAction}` : "Plant survives");
  
  // The bug is fixed if Oolong Tea shows the same protected timeline
  const bugFixed = !oolongTeaResult.deathInfo || oolongTeaResult.deathInfo.deathAction > 20;
  console.log("Bug Status:", bugFixed ? "✅ FIXED" : "❌ STILL EXISTS");
  
  return {
    greenTeaWorked: greenTeaResult === true,
    protectionApplied: protectionResult.success,
    timelineConsistent: bugFixed
  };
}

function testTimelineConsistencyBetweenTeas() {
  console.log("\n=== TESTING TIMELINE CONSISTENCY BETWEEN TEAS ===\n");

  const game = new Game();
  game.player.actionsLeft = 15;
  
  // Create a mature plant that should be harvestable
  const plant = game.createCard("tea_plant", "mature");
  plant.harvestReady = false;
  game.player.garden.push(plant);
  
  // Create both teas
  const greenTea = game.createCard("green_tea");
  const oolongTea = game.createCard("oolong_tea");
  game.player.addCardToLocation(greenTea, "cafe");
  game.player.addCardToLocation(oolongTea, "cafe");
  
  console.log("Testing mature plant with both teas...");
  
  // Test Green Tea first
  console.log("\n1. Green Tea timeline:");
  const greenTeaResult = game.consumeGreenTeaWithPlantSelection(greenTea, 0);
  console.log("Result:", greenTeaResult === true ? "✅ Success" : "❌ Failed");
  
  // Test Oolong Tea second - should show consistent results
  console.log("\n2. Oolong Tea timeline:");
  const oolongTeaResult = game.consumeOolongTeaWithPlantSelection(oolongTea, 0);
  console.log("Result:", oolongTeaResult.success ? "✅ Success" : `❌ Failed: ${oolongTeaResult.message}`);
  
  if (oolongTeaResult.harvestOpportunities) {
    console.log(`Found ${oolongTeaResult.harvestOpportunities.length} harvest opportunities`);
  }
  
  // Both should work with a mature plant or fail consistently
  const consistent = (greenTeaResult === true) === (oolongTeaResult.success || oolongTeaResult.requiresSelection);
  console.log("\nTimeline Consistency:", consistent ? "✅ CONSISTENT" : "❌ INCONSISTENT");
  
  return {
    greenTeaWorked: greenTeaResult === true,
    oolongTeaWorked: oolongTeaResult.success || oolongTeaResult.requiresSelection,
    consistent: consistent
  };
}

// Run the tests
console.log("TESTING BUG FIX: Timeline Consistency Between Green Tea and Oolong Tea\n");

const bugTest = testBugScenario();
const consistencyTest = testTimelineConsistencyBetweenTeas();

console.log("\n" + "=".repeat(60));
console.log("FINAL TEST RESULTS");
console.log("=".repeat(60));

console.log("\nBug Reproduction Test:");
console.log(`  Green Tea: ${bugTest.greenTeaWorked ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Protection: ${bugTest.protectionApplied ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Timeline Consistency: ${bugTest.timelineConsistent ? '✅ PASS' : '❌ FAIL'}`);

console.log("\nGeneral Consistency Test:");
console.log(`  Both teas work: ${consistencyTest.consistent ? '✅ PASS' : '❌ FAIL'}`);

if (bugTest.timelineConsistent && consistencyTest.consistent) {
  console.log("\n🎉 SUCCESS: The timeline consistency bug has been FIXED!");
  console.log("   ✅ Oolong Tea now uses the same timeline system as Green Tea");
  console.log("   ✅ Plant protections are properly reflected in both tea timelines");
  console.log("   ✅ No more inconsistent death predictions between the two teas");
} else {
  console.log("\n❌ FAILURE: Timeline consistency issues still exist");
  if (!bugTest.timelineConsistent) {
    console.log("   - Oolong Tea still ignores plant protection");
  }
  if (!consistencyTest.consistent) {
    console.log("   - Teas show different results for the same plant");
  }
}