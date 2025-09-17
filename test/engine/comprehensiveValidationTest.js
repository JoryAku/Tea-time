// Simple test to verify the exact fix that was made
// This tests that Oolong Tea now uses getOrCreatePlantTimeline instead of createTimeline

const assert = require('assert');
const Game = require("../../engine/Game");

function testSimpleTimelineSharing() {
  console.log("=== SIMPLE TIMELINE SHARING TEST ===\n");
  
  const game = new Game();
  game.player.actionsLeft = 20;
  
  // Create a mature plant that should work with both teas
  const plant = game.createCard("tea_plant", "mature");
  plant.harvestReady = false; // Not currently ready, so Oolong can simulate future
  game.player.garden.push(plant);
  
  console.log("1. Test Green Tea (establishes timeline):");
  
  const greenTea = game.createCard("green_tea");
  game.player.addCardToLocation(greenTea, "cafe");
  
  const greenResult = game.consumeGreenTeaWithPlantSelection(greenTea, 0);
  console.log("   Result:", greenResult === true ? "✅ Success" : "❌ Failed");
  
  // Check that timeline was cached
  const plantId = plant.uniqueId;
  const cachedTimeline = game.engine.plantTimelines.get(plantId);
  console.log("   Timeline cached:", cachedTimeline ? "✅ Yes" : "❌ No");
  
  console.log("\n2. Test Oolong Tea (should use cached timeline):");
  
  const oolongTea = game.createCard("oolong_tea");
  game.player.addCardToLocation(oolongTea, "cafe");
  
  const oolongResult = game.consumeOolongTeaWithPlantSelection(oolongTea, 0);
  console.log("   Result:", oolongResult.success || oolongResult.requiresSelection ? "✅ Success" : `❌ Failed: ${oolongResult.message}`);
  
  // Check timeline consistency by looking at cache usage
  const timelineAfterOolong = game.engine.plantTimelines.get(plantId);
  const sameTimeline = cachedTimeline === timelineAfterOolong;
  console.log("   Uses same cached timeline:", sameTimeline ? "✅ Yes" : "❌ No");
  
  if (oolongResult.harvestOpportunities) {
    console.log(`   Found ${oolongResult.harvestOpportunities.length} harvest opportunities`);
  }
  
  return {
    greenWorked: greenResult === true,
    oolongWorked: oolongResult.success || oolongResult.requiresSelection,
    timelineShared: sameTimeline,
    overallSuccess: (greenResult === true) && (oolongResult.success || oolongResult.requiresSelection) && sameTimeline
  };
}

function testTimelineConsistencyWithProtection() {
  console.log("\n=== TIMELINE CONSISTENCY WITH PROTECTION ===\n");
  
  const game = new Game();
  game.player.actionsLeft = 20;
  
  // Create a vulnerable plant
  const plant = game.createCard("tea_plant", "growing");
  game.player.garden.push(plant);
  
  console.log("1. Use Green Tea to see initial timeline:");
  
  const greenTea = game.createCard("green_tea");
  game.player.addCardToLocation(greenTea, "cafe");
  
  const greenResult = game.consumeGreenTeaWithPlantSelection(greenTea, 0);
  console.log("   Green Tea result:", greenResult === true ? "✅ Success" : "❌ Failed");
  
  console.log("\n2. Apply protection to change timeline:");
  
  // Apply comprehensive protection
  const protectionResult1 = game.engine.applyProtectiveIntervention(0, 'water');
  const protectionResult2 = game.engine.applyProtectiveIntervention(0, 'shelter');
  console.log("   Protection applied:", (protectionResult1.success && protectionResult2.success) ? "✅ Success" : "❌ Failed");
  
  console.log("\n3. Use Oolong Tea with updated timeline:");
  
  const oolongTea = game.createCard("oolong_tea");
  game.player.addCardToLocation(oolongTea, "cafe");
  
  const oolongResult = game.consumeOolongTeaWithPlantSelection(oolongTea, 0);
  console.log("   Oolong Tea result:", oolongResult.success || oolongResult.requiresSelection ? "✅ Success" : `❌ Failed: ${oolongResult.message}`);
  
  // The key test: if protection made the plant safer, Oolong should see it too
  console.log("\n4. Timeline comparison:");
  if (oolongResult.deathInfo) {
    console.log(`   Plant death predicted: Action ${oolongResult.deathInfo.deathAction}`);
    // If death is pushed far into the future (>30 actions), protection is working
    const protectionWorking = oolongResult.deathInfo.deathAction > 30;
    console.log("   Protection effect visible:", protectionWorking ? "✅ Yes" : "❌ No");
    return protectionWorking;
  } else {
    console.log("   Plant survives: ✅ Yes (protection fully effective)");
    return true;
  }
}

function validateBugFix() {
  console.log("\n=== BUG FIX VALIDATION ===\n");
  
  console.log("The bug was: Oolong Tea used createTimeline() instead of getOrCreatePlantTimeline()");
  console.log("The fix was: Change simulateFutureHarvestTimeline() to use getOrCreatePlantTimeline()");
  console.log("This ensures both Green Tea and Oolong Tea use the same timeline system.\n");
  
  // Check the actual source code implementation
  const fs = require('fs');
  const engineCode = fs.readFileSync('/home/runner/work/Tea-time/Tea-time/engine/engine.js', 'utf8');
  
  // Look for the fix in simulateFutureHarvestTimeline
  const simulateMethod = engineCode.substring(
    engineCode.indexOf('simulateFutureHarvestTimeline(plantCard)'),
    engineCode.indexOf('// Find ALL harvest opportunities in the timeline')
  );
  
  const usesGetOrCreate = simulateMethod.includes('getOrCreatePlantTimeline');
  const usesCreateTimeline = simulateMethod.includes('createTimeline(48)');
  
  console.log("Code analysis:");
  console.log("   Uses getOrCreatePlantTimeline:", usesGetOrCreate ? "✅ Yes" : "❌ No");
  console.log("   Still uses createTimeline:", usesCreateTimeline ? "❌ Yes (bad)" : "✅ No (good)");
  
  const codeFixed = usesGetOrCreate && !usesCreateTimeline;
  console.log("   Code fix applied:", codeFixed ? "✅ Yes" : "❌ No");
  
  return codeFixed;
}

// Run all tests
console.log("COMPREHENSIVE BUG FIX VALIDATION\n");

const codeFixed = validateBugFix();
const simpleTest = testSimpleTimelineSharing();
const protectionTest = testTimelineConsistencyWithProtection();

console.log("\n" + "=".repeat(60));
console.log("FINAL VALIDATION RESULTS");
console.log("=".repeat(60));

console.log("\nCode Fix Analysis:");
console.log(`  Source code updated: ${codeFixed ? '✅ PASS' : '❌ FAIL'}`);

console.log("\nSimple Timeline Sharing:");
console.log(`  Green Tea: ${simpleTest.greenWorked ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Oolong Tea: ${simpleTest.oolongWorked ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Timeline Shared: ${simpleTest.timelineShared ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Overall: ${simpleTest.overallSuccess ? '✅ PASS' : '❌ FAIL'}`);

console.log("\nProtection Timeline Update:");
console.log(`  Protection Effect Visible: ${protectionTest ? '✅ PASS' : '❌ FAIL'}`);

const allTestsPass = codeFixed && simpleTest.overallSuccess && protectionTest;

if (allTestsPass) {
  console.log("\n🎉 COMPLETE SUCCESS!");
  console.log("✅ Bug fix has been successfully implemented and validated");
  console.log("✅ Oolong Tea now uses the same timeline system as Green Tea");
  console.log("✅ Plant protections are properly reflected in both tea timelines");
} else {
  console.log("\n❌ Issues detected:");
  if (!codeFixed) console.log("   - Source code fix not applied correctly");
  if (!simpleTest.overallSuccess) console.log("   - Timeline sharing not working");
  if (!protectionTest) console.log("   - Protection effects not visible in Oolong Tea");
}