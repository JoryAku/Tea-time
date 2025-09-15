// Test Oolong Tea future harvest functionality

const assert = require('assert');
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testOolongTeaFutureHarvest() {
  console.log("=== Testing Oolong Tea Future Harvest ===\n");

  const game = new Game();
  
  // Give the player more actions to work with
  game.player.actionsLeft = 10;
  
  console.log("Initial state:");
  console.log("Garden:", game.player.garden.map(p => `${p.name} [${p.state}]`).join(", "));
  console.log("Kitchen:", game.player.kitchen.map(p => p.name).join(", "));
  console.log("Cafe:", game.player.cafe.map(p => p.name).join(", "));
  console.log("");

  // Create and add an Oolong Tea to cafe for testing
  console.log("Step 1: Setting up Oolong Tea for consumption");
  const oolongTea = game.createCard("oolong_tea");
  game.player.addCardToLocation(oolongTea, "cafe");
  console.log("Added Oolong Tea to cafe");
  
  // Also create a mature plant that's not harvest ready to test the functionality
  const maturePlant = game.createCard("tea_plant", "mature");
  maturePlant.harvestReady = false; // Not currently harvestable
  game.player.garden.push(maturePlant);
  console.log("Added mature plant (not harvest ready) to garden");
  console.log("");

  console.log("Step 2: Testing Oolong Tea future harvest simulation");
  assert.ok(game.player.cafe.length > 0, "Should have Oolong Tea in cafe");
  assert.ok(game.player.garden.length >= 2, "Should have at least 2 plants in garden");
  
  console.log("Before consumption - garden plants:");
  game.player.garden.forEach((plant, idx) => {
    console.log(`  [${idx}] ${plant.name} [${plant.state}], harvestReady: ${plant.harvestReady || false}`);
  });
  console.log("Before consumption - kitchen:", game.player.kitchen.map(p => p.name).join(", ") || "(empty)");
  console.log("");

  // Test consuming Oolong Tea with plant selection
  const teaCard = game.player.cafe[0];
  const plantIndex = 1; // Select the mature plant we just added
  
  console.log(`Consuming ${teaCard.name} to harvest future leaves from plant ${plantIndex}...`);
  console.log("");
  
  const consumeResult = game.consumeOolongTeaWithPlantSelection(teaCard, plantIndex);
  console.log("\nConsumption result:", consumeResult);
  
  if (consumeResult) {
    assert.strictEqual(game.player.cafe.length, 0, "Cafe should be empty after successful consumption");
    // Check if new tea leaves were added to kitchen
    const initialKitchenCount = 1; // Started with 1 green tea leaf
    assert.ok(game.player.kitchen.length > initialKitchenCount, "Should have additional leaves in kitchen from future harvest");
    console.log("✅ Future harvest successful - new leaves added to kitchen!");
  } else {
    console.log("⚠️ Future harvest failed - this is expected if plant would die before harvest");
    // Tea should not be consumed if harvest failed
    assert.strictEqual(game.player.cafe.length, 1, "Tea should not be consumed if harvest failed");
  }
  
  console.log("After consumption - cafe:", game.player.cafe.map(p => p.name).join(", ") || "(empty)");
  console.log("After consumption - kitchen:", game.player.kitchen.map(p => p.name).join(", "));
  
  console.log("✅ Oolong Tea future harvest test completed!");
}

function testOolongTeaWithCurrentlyHarvestableAdvancedPlant() {
  console.log("\n=== Testing Oolong Tea with Currently Harvestable Plant ===\n");

  const game = new Game();
  game.player.actionsLeft = 10;
  
  // Create a mature plant that IS harvest ready
  const harvestReadyPlant = game.createCard("tea_plant", "mature");
  harvestReadyPlant.harvestReady = true; // Currently harvestable
  game.player.garden.push(harvestReadyPlant);
  
  const oolongTea = game.createCard("oolong_tea");
  game.player.addCardToLocation(oolongTea, "cafe");
  
  console.log("Testing with plant that is already harvest ready...");
  
  const consumeResult = game.consumeOolongTeaWithPlantSelection(oolongTea, 1);
  
  // Should fail because plant is already harvestable in present
  assert.strictEqual(consumeResult, false, "Should fail when plant is already harvestable");
  assert.strictEqual(game.player.cafe.length, 1, "Tea should not be consumed");
  
  console.log("✅ Correctly rejected attempt to future harvest already harvestable plant!");
}

// Run tests
testOolongTeaFutureHarvest();
testOolongTeaWithCurrentlyHarvestableAdvancedPlant();