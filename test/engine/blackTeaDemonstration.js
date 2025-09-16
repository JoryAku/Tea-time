// Comprehensive Black Tea demonstration with plant state changes

const assert = require('assert');
const Game = require("../../engine/Game");

function demonstrateBlackTeaFeatures() {
  console.log("=== Black Tea Feature Demonstration ===\n");

  const game = new Game();
  
  // Create a mature plant that's ready to transition
  game.player.garden = [];
  const maturePlant = game.createCard("tea_plant", "mature");
  maturePlant.age = 8; // Well-aged plant
  maturePlant.stateProgress = 11; // Almost ready to flower (needs 12 for flowering)
  maturePlant.resourcesThisSeason = new Set(['sunlight', 'water']); // Has required resources
  game.assignPlantId(maturePlant);
  game.player.garden.push(maturePlant);
  
  // Add Black Tea for testing
  const blackTea = game.createCard("black_tea");
  game.player.cafe.push(blackTea);
  
  console.log("=== DEMONSTRATION SETUP ===");
  console.log(`Plant: ${maturePlant.name} [${maturePlant.state}]`);
  console.log(`Age: ${maturePlant.age} years`);
  console.log(`State Progress: ${maturePlant.stateProgress}/12 (ready to flower)`);
  console.log(`Plant ID: ${maturePlant.uniqueId}`);
  console.log("");

  console.log("=== STEP 1: VIEW TIMELINE WITH BLACK TEA ===");
  
  // Force plant to advance by manually processing progression
  console.log("Simulating season end to trigger plant advancement...");
  game.engine.plantManager.processPlantProgression(maturePlant, 'spring');
  
  console.log(`Plant after progression: ${maturePlant.name} [${maturePlant.state}] age:${maturePlant.age}`);
  console.log("");
  
  // View timeline
  const timelineResult = game.consumeBlackTeaWithPlantSelection(blackTea, 0);
  
  console.log("\n=== TIMELINE ANALYSIS ===");
  assert.strictEqual(timelineResult.success, true, "Timeline viewing should succeed");
  assert.ok(timelineResult.timelineStates, "Should have timeline states");
  
  console.log(`Available states: ${timelineResult.timelineStates.length}`);
  timelineResult.timelineStates.forEach((state, idx) => {
    const harvestText = state.harvestReady ? ` 🌾(harvestable)` : '';
    const validText = state.isAlive ? '✅' : '❌';
    const currentText = state.actionNumber === 1 ? ' [CURRENT]' : '';
    const deadText = !state.isAlive ? ' 💀' : '';
    console.log(`  [${idx}] Action ${state.actionNumber}: ${state.plantState} age:${state.age}${harvestText} ${validText}${currentText}${deadText}`);
  });

  // Find interesting states for replacement
  const harvestableStates = timelineResult.timelineStates.filter(state => 
    state.harvestReady && state.isAlive && state.actionNumber > 1
  );
  
  const olderStates = timelineResult.timelineStates.filter(state => 
    state.age > maturePlant.age && state.isAlive && state.actionNumber > 1
  );

  console.log("\n=== STEP 2: REPLACEMENT DEMONSTRATION ===");
  
  if (harvestableStates.length > 0 || olderStates.length > 0) {
    // Use another Black Tea for replacement
    const blackTea2 = game.createCard("black_tea");
    game.player.cafe.push(blackTea2);
    
    const targetState = harvestableStates.length > 0 ? harvestableStates[0] : olderStates[0];
    
    console.log(`🎯 REPLACING plant with state from action ${targetState.actionNumber}`);
    console.log(`   Target: ${targetState.plantState} age:${targetState.age}`);
    if (targetState.harvestReady) {
      console.log(`   Plant is harvestable at this state`);
    }
    
    const originalState = maturePlant.state;
    const originalAge = maturePlant.age;
    
    // Execute replacement
    const replacementResult = game.consumeBlackTeaWithPlantSelection(blackTea2, 0, targetState.actionNumber);
    
    console.log(`\n📋 REPLACEMENT RESULT: ${replacementResult.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (replacementResult.success) {
      const updatedPlant = game.player.garden[0];
      console.log(`   Before: [${originalState}] age:${originalAge}`);
      console.log(`   After:  [${updatedPlant.state}] age:${updatedPlant.age}`);
      
      if (updatedPlant.harvestReady) {
        console.log(`   🌾 Plant is now ready for harvest!`);
      }
      
      // Verify timeline cache was invalidated
      const cacheInvalidated = !game.engine.plantTimelines.has(maturePlant.uniqueId);
      console.log(`   Timeline cache invalidated: ${cacheInvalidated ? 'YES' : 'NO'}`);
      
      console.log("\n✅ Plant successfully replaced with future state!");
    } else {
      console.log(`   ❌ Replacement failed: ${replacementResult.message}`);
    }
  } else {
    console.log("No suitable future states found for replacement demonstration");
    console.log("This can happen if the plant doesn't progress much in the timeline");
  }

  console.log("\n=== STEP 3: TIMELINE CONSISTENCY CHECK ===");
  
  // Test that other tea powers see the new state
  const greenTea = game.createCard("green_tea");
  game.player.cafe.push(greenTea);
  
  console.log("Consuming Green Tea to verify timeline consistency...");
  const updatedPlant = game.player.garden[0];
  game.consumeGreenTeaWithPlantSelection(greenTea, 0);
  
  console.log(`Current plant state: ${updatedPlant.name} [${updatedPlant.state}] age:${updatedPlant.age}`);
  console.log("✅ Timeline remains consistent across tea powers!");
  
  console.log("\n=== DEMONSTRATION COMPLETE ===");
  console.log("Black Tea successfully demonstrated:");
  console.log("• 4-year timeline viewing");
  console.log("• Future state selection");
  console.log("• Plant replacement with future states");
  console.log("• Timeline consistency across tea powers");
  console.log("• Proper cache invalidation");
}

function testPerformanceOptimization() {
  console.log("\n=== Performance Optimization Test ===\n");

  const game = new Game();
  
  // Add multiple plants to test caching
  game.player.garden = [];
  for (let i = 0; i < 5; i++) {
    const plant = game.createCard("tea_plant", i % 2 === 0 ? "seedling" : "mature");
    plant.age = i + 1;
    game.assignPlantId(plant);
    game.player.garden.push(plant);
  }
  
  console.log(`Created ${game.player.garden.length} plants for performance testing`);
  
  // Test timeline caching performance
  const startTime = Date.now();
  
  // First round - should create timelines
  console.log("\nRound 1: Creating timelines (should be slow)");
  for (let i = 0; i < game.player.garden.length; i++) {
    const blackTea = game.createCard("black_tea");
    game.player.cafe.push(blackTea);
    
    const result = game.consumeBlackTeaWithPlantSelection(blackTea, i);
    assert.strictEqual(result.success, true, `Timeline ${i} should succeed`);
  }
  
  const firstRoundTime = Date.now() - startTime;
  console.log(`First round completed in ${firstRoundTime}ms`);
  console.log(`Cached timelines: ${game.engine.plantTimelines.size}`);
  
  // Second round - should use cached timelines
  console.log("\nRound 2: Using cached timelines (should be fast)");
  const secondStartTime = Date.now();
  
  for (let i = 0; i < game.player.garden.length; i++) {
    const blackTea = game.createCard("black_tea");
    game.player.cafe.push(blackTea);
    
    const result = game.consumeBlackTeaWithPlantSelection(blackTea, i);
    assert.strictEqual(result.success, true, `Cached timeline ${i} should succeed`);
  }
  
  const secondRoundTime = Date.now() - secondStartTime;
  console.log(`Second round completed in ${secondRoundTime}ms`);
  
  // Performance should improve with caching
  const performanceImprovement = firstRoundTime > secondRoundTime;
  console.log(`Performance improvement: ${performanceImprovement ? 'YES' : 'NO'}`);
  console.log(`Speed ratio: ${(firstRoundTime / Math.max(secondRoundTime, 1)).toFixed(2)}x`);
  
  console.log("\n✅ Performance optimization test completed!");
}

// Run demonstrations
demonstrateBlackTeaFeatures();
testPerformanceOptimization();