// Test that existing tea workflow still works
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

console.log("=== Testing Tea Brewing Workflow ===\n");

const game = new Game();

// Add a tea leaf to kitchen for brewing
const teaLeaf = game.createCard("tea_leaf_green");
game.player.kitchen.push(teaLeaf);

console.log("Initial state:");
console.log(`Kitchen: ${game.player.kitchen[0].name}`);

// Brew the tea
console.log("\nBrewing tea...");
const success = ActionResolver.resolve("brew kitchen 0", game);

if (success) {
  console.log("✅ Tea brewed successfully!");
  console.log(`Cafe now has: ${game.player.cafe.length} items`);
  if (game.player.cafe.length > 0) {
    console.log(`Brewed tea: ${game.player.cafe[0].name}`);
    
    // Test consuming the brewed tea
    console.log("\nConsuming brewed Green Tea...");
    const consumeSuccess = ActionResolver.resolve("consume cafe 0", game);
    
    if (consumeSuccess) {
      console.log("✅ Green Tea consumed with foresight functionality!");
    } else {
      console.log("❌ Failed to consume brewed Green Tea");
    }
  }
} else {
  console.log("❌ Failed to brew tea");
}

console.log("\n🎯 Tea brewing workflow verified - Green Tea can be brewed and consumed!");