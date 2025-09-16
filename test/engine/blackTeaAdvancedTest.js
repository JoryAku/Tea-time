// Test Black Tea with mature plant that has more state changes

const assert = require('assert');
const Game = require("../../engine/Game");

function testBlackTeaWithMaturePlant() {
  console.log("=== Testing Black Tea with Mature Plant States ===\n");

  const game = new Game();
  
  // Replace starting seedling with a mature plant for more interesting timeline
  game.player.garden = [];
  const maturePlant = game.createCard("tea_plant", "mature");
  maturePlant.age = 5; // 5 years old
  maturePlant.stateProgress = 2; // Some progress toward flowering
  game.assignPlantId(maturePlant);
  game.player.garden.push(maturePlant);
  
  // Add Black Tea to cafe
  const blackTea = game.createCard("black_tea");
  game.player.cafe.push(blackTea);
  
  console.log("Setup:");
  console.log("Garden:", game.player.garden.map(p => `${p.name} [${p.state}] age:${p.age}`).join(", "));
  console.log("Cafe:", game.player.cafe.map(p => p.name).join(", "));
  console.log("");

  // Test Black Tea timeline viewing with mature plant
  console.log("Step 1: Consuming Black Tea to view mature plant timeline");
  const plantIndex = 0;
  
  console.log(`Viewing timeline for: ${maturePlant.name} [${maturePlant.state}] age:${maturePlant.age}`);
  console.log("");
  
  // Get timeline without replacement first
  const timelineResult = game.consumeBlackTeaWithPlantSelection(blackTea, plantIndex);
  
  assert.strictEqual(timelineResult.success, true, "Timeline viewing should succeed");
  assert.strictEqual(timelineResult.requiresSelection, true, "Should require selection");
  assert.ok(timelineResult.timelineStates, "Should have timeline states");
  
  console.log(`\nTimeline states available: ${timelineResult.timelineStates.length}`);
  timelineResult.timelineStates.forEach((state, idx) => {
    const harvestText = state.harvestInfo.isHarvestable ? ` 🌾(${state.harvestInfo.yieldCount})` : '';
    const validText = state.isValid ? '✅' : '❌';
    const currentText = state.isCurrent ? ' [CURRENT]' : '';
    console.log(`  [${idx}] Action ${state.action}: ${state.state} age:${state.age}${harvestText} ${validText}${currentText}`);
  });

  // Test state replacement if we have valid future states
  const validFutureStates = timelineResult.timelineStates.filter(state => state.isValid && !state.isCurrent);
  
  if (validFutureStates.length > 0) {
    console.log("\nStep 2: Testing plant state replacement");
    
    // Use a fresh Black Tea for replacement
    const blackTea2 = game.createCard("black_tea");
    game.player.cafe.push(blackTea2);
    
    const targetState = validFutureStates[Math.min(1, validFutureStates.length - 1)]; // Pick second state or last if only one
    console.log(`Replacing plant with state from action ${targetState.action}: ${targetState.state} age:${targetState.age}`);
    
    const originalState = maturePlant.state;
    const originalAge = maturePlant.age;
    
    // Execute replacement
    const replacementResult = game.consumeBlackTeaWithPlantSelection(blackTea2, plantIndex, targetState.action);
    
    console.log("\nReplacement result:", replacementResult.success ? "SUCCESS" : "FAILED");
    if (replacementResult.success) {
      const updatedPlant = game.player.garden[plantIndex];
      console.log(`State change: [${originalState}] age:${originalAge} -> [${updatedPlant.state}] age:${updatedPlant.age}`);
      
      // Verify change occurred
      assert.ok(
        updatedPlant.state !== originalState || updatedPlant.age !== originalAge,
        "Plant state should have changed"
      );
      
      console.log("✅ Plant state successfully replaced!");
    } else {
      console.log("❌ Replacement failed:", replacementResult.message);
    }
  } else {
    console.log("\nNo valid future states available for replacement test");
  }

  console.log("\n✅ Mature plant test completed!");
}

function testTimelineUpdateConsistency() {
  console.log("\n=== Testing Timeline Update Consistency ===\n");

  const game = new Game();
  
  // Create a mature plant
  game.player.garden = [];
  const plant = game.createCard("tea_plant", "mature");
  plant.age = 3;
  game.assignPlantId(plant);
  game.player.garden.push(plant);
  
  console.log("Testing that timeline updates rather than creates duplicates...");
  
  // Create first timeline
  const blackTea1 = game.createCard("black_tea");
  game.player.cafe.push(blackTea1);
  
  console.log("Step 1: Create initial timeline");
  const result1 = game.consumeBlackTeaWithPlantSelection(blackTea1, 0);
  assert.strictEqual(result1.success, true, "First timeline should succeed");
  
  const plantId = plant.uniqueId;
  console.log(`Plant ID: ${plantId}`);
  console.log(`Cached timelines: ${game.engine.plantTimelines.size}`);
  
  // Apply protection to change plant state
  console.log("\nStep 2: Apply protection to change plant state");
  plant.activeConditions = plant.activeConditions || {};
  plant.activeConditions['water'] = 10; // Long-lasting water protection
  
  // Create second timeline - should update existing one
  const blackTea2 = game.createCard("black_tea");
  game.player.cafe.push(blackTea2);
  
  console.log("Step 3: Create timeline after plant state change (should update cache)");
  const result2 = game.consumeBlackTeaWithPlantSelection(blackTea2, 0, null);
  assert.strictEqual(result2.success, true, "Second timeline should succeed");
  
  console.log(`Cached timelines after update: ${game.engine.plantTimelines.size}`);
  
  // Should still have the same timeline cached, but updated
  assert.ok(game.engine.plantTimelines.has(plantId), "Timeline should still be cached");
  assert.strictEqual(game.engine.plantTimelines.size, 1, "Should only have one cached timeline");
  
  console.log("✅ Timeline updates correctly - no duplicates created!");
}

function testPlantIdAssignment() {
  console.log("\n=== Testing Plant ID Assignment ===\n");

  const game = new Game();
  
  console.log("Testing unique ID assignment for new plants...");
  
  // Check starting plant has ID
  const startingPlant = game.player.garden[0];
  console.log(`Starting plant ID: ${startingPlant.uniqueId}`);
  assert.ok(startingPlant.uniqueId, "Starting plant should have unique ID");
  
  // Create new plant via card system
  console.log("\nCreating new plant via action system...");
  const seedCard = game.createCard("tea_plant", "seed");
  game.player.hand.push(seedCard);
  
  // Plant the seed (this should assign an ID)
  const plantResult = game.plantSeedFromZone("hand", 0);
  console.log("Plant result:", plantResult);
  
  if (game.player.garden.length > 1) {
    const newPlant = game.player.garden[1];
    console.log(`New plant ID: ${newPlant.uniqueId}`);
    assert.ok(newPlant.uniqueId, "New plant should have unique ID");
    assert.ok(newPlant.uniqueId !== startingPlant.uniqueId, "IDs should be different");
  }
  
  console.log("✅ Plant ID assignment working correctly!");
}

// Run all tests
testBlackTeaWithMaturePlant();
testTimelineUpdateConsistency();
testPlantIdAssignment();