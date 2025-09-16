// Test Black Tea consumption, timeline viewing, and plant state replacement

const assert = require('assert');
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testBlackTeaTimelineAndReplacement() {
  console.log("=== Testing Black Tea Timeline Viewing and Plant Replacement ===\n");

  const game = new Game();
  
  // Give the player more actions to work with
  game.player.actionsLeft = 10;
  
  console.log("Initial state:");
  console.log("Garden:", game.player.garden.map(p => `${p.name} [${p.state}]`).join(", "));
  console.log("Kitchen:", game.player.kitchen.map(p => p.name).join(", "));
  console.log("Cafe:", game.player.cafe.map(p => p.name).join(", "));
  console.log("");

  // First, we need to get Black Tea for testing
  console.log("Step 1: Creating Black Tea for testing");
  assert.ok(game.player.kitchen.length > 0, "Should have tea in kitchen at start");
  
  // For testing, we'll create Black Tea directly since processing is complex
  // In real gameplay, player would harvest raw tea and process it
  const blackTeaLeaf = game.createCard("tea_leaf_black");
  game.player.kitchen.push(blackTeaLeaf);
  console.log("Added Black Tea leaf to kitchen for testing");
  
  console.log("Step 2: Brew Black Tea");
  // Find the black tea leaf in kitchen (should be at index 1 now)
  const kitchenIndex = game.player.kitchen.findIndex(card => card.definition.id === "tea_leaf_black");
  assert.ok(kitchenIndex >= 0, "Should find Black Tea leaf in kitchen");
  
  const brewResult = ActionResolver.resolve(`brew kitchen ${kitchenIndex}`, game);
  console.log("Brew result:", brewResult);
  assert.strictEqual(brewResult, true, "Brewing should succeed");
  assert.ok(game.player.cafe.length > 0, "Should have Black Tea in cafe after brewing");
  console.log("Cafe now contains:", game.player.cafe.map(p => p.name).join(", "));
  console.log("");

  // Test Black Tea timeline viewing
  console.log("Step 3: Consuming Black Tea to view 4-year timeline");
  assert.ok(game.player.cafe.some(tea => tea.name === "Black Tea"), "Should have Black Tea in cafe");
  
  console.log("Before consumption - garden plants:");
  game.player.garden.forEach((plant, idx) => {
    console.log(`  [${idx}] ${plant.name} [${plant.state}], age: ${plant.age || 0}, ID: ${plant.uniqueId || 'none'}`);
  });
  console.log("");

  const blackTeaCard = game.player.cafe.find(tea => tea.name === "Black Tea");
  const plantIndex = 0; // Select the first plant
  
  console.log(`Consuming ${blackTeaCard.name} to view timeline of plant ${plantIndex}...`);
  console.log("");
  
  // First call should return timeline for selection
  const timelineResult = game.consumeBlackTeaWithPlantSelection(blackTeaCard, plantIndex);
  console.log("\nTimeline viewing result:", timelineResult.success ? "SUCCESS" : "FAILED");
  assert.strictEqual(timelineResult.success, true, "Timeline viewing should succeed");
  assert.strictEqual(timelineResult.requiresSelection, true, "Should require selection");
  assert.ok(timelineResult.timelineStates, "Should have timeline states");
  assert.ok(timelineResult.timelineStates.length > 0, "Should have selectable states");
  
  console.log(`Available states: ${timelineResult.timelineStates.length}`);
  timelineResult.timelineStates.forEach((state, idx) => {
    console.log(`  [${idx}] Action ${state.action}: ${state.state} (age: ${state.age}) - ${state.isValid ? 'VALID' : 'INVALID'}`);
  });

  // Test plant state replacement
  console.log("\nStep 4: Testing plant state replacement");
  
  // Find a valid future state to replace with
  const validStates = timelineResult.timelineStates.filter(state => state.isValid && !state.isCurrent);
  if (validStates.length > 0) {
    const targetState = validStates[0]; // Use first valid future state
    console.log(`Attempting to replace plant with state from action ${targetState.action}: ${targetState.state}`);
    
    // Store original plant state
    const originalPlant = game.player.garden[plantIndex];
    const originalState = originalPlant.state;
    const originalAge = originalPlant.age || 0;
    
    // Execute the replacement
    const replacementResult = game.consumeBlackTeaWithPlantSelection(blackTeaCard, plantIndex, targetState.action);
    console.log("\nReplacement result:", replacementResult.success ? "SUCCESS" : "FAILED");
    assert.strictEqual(replacementResult.success, true, "Plant replacement should succeed");
    
    // Verify the plant state changed
    const updatedPlant = game.player.garden[plantIndex];
    console.log(`Plant state change: [${originalState}] age ${originalAge} -> [${updatedPlant.state}] age ${updatedPlant.age}`);
    
    // Should be different unless we selected the current state
    if (targetState.action > 0) {
      assert.ok(updatedPlant.state !== originalState || updatedPlant.age !== originalAge, "Plant state should change");
    }
    
    // Tea should be consumed
    assert.strictEqual(game.player.cafe.length, 0, "Black Tea should be consumed");
  } else {
    console.log("No valid future states available for replacement test");
  }

  console.log("\n✅ Black Tea timeline and replacement test completed!");
}

function testBlackTeaTimelineConsistency() {
  console.log("\n=== Testing Timeline Consistency Across Tea Powers ===\n");

  const game = new Game();
  game.player.actionsLeft = 10;
  
  // Add Black Tea to cafe for testing
  const blackTea = game.createCard("black_tea");
  game.player.cafe.push(blackTea);
  
  const plantIndex = 0;
  const plant = game.player.garden[plantIndex];
  
  console.log("Testing timeline consistency between Green Tea and Black Tea...");
  
  // Get timeline from Green Tea (should establish cached timeline)
  console.log("\nStep 1: Generate timeline with Green Tea");
  const greenTea = game.createCard("green_tea");
  game.player.cafe.push(greenTea);
  
  game.consumeGreenTeaWithPlantSelection(greenTea, plantIndex);
  
  // Now get timeline from Black Tea (should use same cached timeline)
  console.log("\nStep 2: View timeline with Black Tea (should be consistent)");
  const timelineResult = game.consumeBlackTeaWithPlantSelection(blackTea, plantIndex);
  
  assert.strictEqual(timelineResult.success, true, "Black Tea timeline viewing should succeed");
  assert.ok(timelineResult.timeline, "Should have timeline data");
  
  // Verify plant has unique ID assigned
  assert.ok(plant.uniqueId, "Plant should have unique ID");
  console.log(`Plant ID: ${plant.uniqueId}`);
  
  // Verify timeline is cached
  assert.ok(game.engine.plantTimelines.has(plant.uniqueId), "Timeline should be cached");
  console.log("Timeline successfully cached for consistency");

  console.log("\n✅ Timeline consistency test passed!");
}

function testBlackTeaEdgeCases() {
  console.log("\n=== Testing Black Tea Edge Cases ===\n");

  const game = new Game();
  const blackTea = game.createCard("black_tea");
  game.player.cafe.push(blackTea);
  
  // Test 1: Invalid plant index
  console.log("Test 1: Invalid plant index");
  const invalidResult = game.consumeBlackTeaWithPlantSelection(blackTea, 999);
  assert.strictEqual(invalidResult.success, false, "Should fail with invalid plant index");
  console.log("✓ Invalid plant index handled correctly");
  
  // Test 2: Invalid target action
  console.log("\nTest 2: Invalid target action");
  const invalidActionResult = game.consumeBlackTeaWithPlantSelection(blackTea, 0, 999);
  assert.strictEqual(invalidActionResult.success, false, "Should fail with invalid target action");
  console.log("✓ Invalid target action handled correctly");
  
  // Test 3: Negative target action
  console.log("\nTest 3: Negative target action");
  const negativeActionResult = game.consumeBlackTeaWithPlantSelection(blackTea, 0, -5);
  assert.strictEqual(negativeActionResult.success, false, "Should fail with negative target action");
  console.log("✓ Negative target action handled correctly");

  console.log("\n✅ Edge cases test passed!");
}

// Run all tests
testBlackTeaTimelineAndReplacement();
testBlackTeaTimelineConsistency();
testBlackTeaEdgeCases();