// Test harvest readiness feature for mature tea plants

const assert = require('assert');
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testHarvestReadiness() {
  console.log("=== Testing Harvest Readiness Feature ===\n");

  // Test 1: Mature plant harvest readiness based on season
  console.log("Test 1: Harvest readiness for mature plants");
  const game = new Game();
  
  // Create a mature tea plant directly
  const maturePlant = game.createCard("tea_plant", "mature");
  game.player.garden = [maturePlant]; // Replace default seedling with mature plant
  
  // Initial state - should check if harvest is available based on current season
  const initialSeason = game.currentSeason;
  console.log(`Initial season: ${initialSeason}`);
  console.log(`Initial harvestReady: ${maturePlant.harvestReady}`);
  console.log(`Initial harvest action available: ${maturePlant.canPerformAction('harvest')}`);
  
  // Set harvest readiness based on current season
  maturePlant.harvestReady = (initialSeason === 'spring');
  console.log(`Set harvestReady to: ${maturePlant.harvestReady}`);
  console.log(`Harvest action available: ${maturePlant.canPerformAction('harvest')}`);
  
  // Test 2: Harvest readiness changes with seasons
  console.log("\nTest 2: Harvest readiness changes with seasons");
  
  // Simulate season changes and check harvest readiness
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  for (let i = 0; i < 8; i++) { // Test 2 full years
    const currentSeason = seasons[i % 4];
    
    // Simulate plant progression for the season
    game.engine.plantManager.processPlantProgression(maturePlant, currentSeason);
    
    const shouldBeReady = (currentSeason === 'spring');
    console.log(`Season: ${currentSeason}, harvestReady: ${maturePlant.harvestReady}, expected: ${shouldBeReady}`);
    
    assert.strictEqual(maturePlant.harvestReady, shouldBeReady, 
      `Harvest readiness should be ${shouldBeReady} in ${currentSeason}`);
    assert.strictEqual(maturePlant.canPerformAction('harvest'), shouldBeReady,
      `Harvest action should be ${shouldBeReady ? 'available' : 'unavailable'} in ${currentSeason}`);
  }
  
  // Test 3: Harvest action removes readiness
  console.log("\nTest 3: Harvest action removes readiness");
  
  // Set to spring and ensure harvest is ready
  maturePlant.harvestReady = true;
  assert.ok(maturePlant.canPerformAction('harvest'), "Should be able to harvest in spring");
  
  // Set up game state for harvesting
  game.player.garden = [maturePlant];
  game.player.actionsLeft = 3;
  
  // Perform harvest action
  const harvestResult = ActionResolver.resolve("harvest garden 0", game);
  console.log(`Harvest result: ${harvestResult}`);
  assert.strictEqual(harvestResult, true, "Harvest should succeed");
  assert.strictEqual(maturePlant.harvestReady, false, "Plant should no longer be ready to harvest after harvest");
  assert.ok(!maturePlant.canPerformAction('harvest'), "Should not be able to harvest after harvesting");
  
  // Check that tea leaf was added to kitchen
  assert.ok(game.player.kitchen.length > 0, "Should have tea leaf in kitchen after harvest");
  console.log(`Kitchen contents: ${game.player.kitchen.map(c => c.name).join(', ')}`);
  
  // Test 4: Plant transitions to mature state with correct readiness
  console.log("\nTest 4: Seedling to mature transition with correct readiness");
  
  const game2 = new Game();
  const seedling = game2.createCard("tea_plant", "seedling");
  game2.player.garden = [seedling];
  
  // Force progression to mature in different seasons
  const testSeasons = ['spring', 'summer', 'autumn', 'winter'];
  for (const season of testSeasons) {
    const testSeedling = game2.createCard("tea_plant", "seedling");
    testSeedling.stateProgress = 35; // Almost ready to advance
    testSeedling._transitionThreshold = 36; // Will advance next progression
    
    // Process progression
    game2.engine.plantManager.processPlantProgression(testSeedling, season);
    
    if (testSeedling.state === 'mature') {
      const expectedReadiness = (season === 'spring');
      console.log(`Transitioned to mature in ${season}, harvestReady: ${testSeedling.harvestReady}, expected: ${expectedReadiness}`);
      assert.strictEqual(testSeedling.harvestReady, expectedReadiness,
        `New mature plant should have harvestReady=${expectedReadiness} when transitioning in ${season}`);
    }
  }
  
  console.log("✅ All harvest readiness tests passed!");
}

testHarvestReadiness();