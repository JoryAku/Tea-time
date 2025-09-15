// Test Green Tea consumption and prediction display

const assert = require('assert');
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testGreenTeaConsumption() {
  console.log("=== Testing Green Tea Consumption with Predictions ===\n");

  const game = new Game();
  
  // Give the player more actions to work with
  game.player.actionsLeft = 10;
  
  console.log("Initial state:");
  console.log("Garden:", game.player.garden.map(p => `${p.name} [${p.state}]`).join(", "));
  console.log("Kitchen:", game.player.kitchen.map(p => p.name).join(", "));
  console.log("Cafe:", game.player.cafe.map(p => p.name).join(", "));
  console.log("");

  // First try to brew the green tea that starts in the kitchen
  console.log("Step 1: Brewing the starting Green Tea leaf");
  assert.ok(game.player.kitchen.length > 0, "Should have tea in kitchen at start");
  
  const brewResult = ActionResolver.resolve("brew kitchen 0", game);
  console.log("Brew result:", brewResult);
  assert.strictEqual(brewResult, true, "Brewing should succeed");
  assert.ok(game.player.cafe.length > 0, "Should have tea in cafe after brewing");
  console.log("Cafe now contains:", game.player.cafe.map(p => p.name).join(", "));
  console.log("");

  // Now consume the green tea to see prediction
  console.log("Step 2: Consuming Green Tea to see plant prediction");
  assert.ok(game.player.cafe.length > 0, "Should have tea in cafe before consumption");
  
  console.log("Before consumption - garden plants:");
  game.player.garden.forEach((plant, idx) => {
    console.log(`  [${idx}] ${plant.name} [${plant.state}], age: ${plant.age || 0}`);
  });
  console.log("");

  // Use the consumeGreenTeaWithPlantSelection method directly
  const teaCard = game.player.cafe[0];
  const plantIndex = 0; // Select the first (and likely only) plant
  
  console.log(`Consuming ${teaCard.name} to predict future of plant ${plantIndex}...`);
  console.log("");
  
  const consumeResult = game.consumeGreenTeaWithPlantSelection(teaCard, plantIndex);
  console.log("\nConsumption result:", consumeResult);
  assert.strictEqual(consumeResult, true, "Tea consumption should succeed");
  assert.strictEqual(game.player.cafe.length, 0, "Cafe should be empty after consumption");
  console.log("Cafe after consumption:", game.player.cafe.map(p => p.name).join(", ") || "(empty)");
  
  console.log("✅ Green Tea consumption test passed!");
}

testGreenTeaConsumption();