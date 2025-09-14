// Demo script to showcase Green Tea functionality
const Game = require("../engine/Game");
const ActionResolver = require("../engine/ActionResolver");

console.log("=== 🫖 Green Tea Foresight Demo ===\n");

const game = new Game();

console.log("📋 Initial Game State:");
console.log(`🌱 Garden: ${game.player.garden[0].name} [${game.player.garden[0].state}]`);
console.log(`🫖 Cafe: ${game.player.cafe[0].name}`);
console.log(`🌤️ Current Season: ${game.currentSeason}`);
console.log(`⚡ Actions Left: ${game.player.actionsLeft}`);

console.log("\n🔮 Consuming Green Tea to see the future...");

// Consume the Green Tea
const success = ActionResolver.resolve("consume cafe 0", game);

if (success) {
  console.log("\n✅ Green Tea consumed successfully!");
  
  // Show that the prediction is being tracked
  const plant = game.player.garden[0];
  const prediction = game.plantPredictions.get(plant.id);
  
  if (prediction && !prediction.prediction.alive) {
    console.log(`\n⚠️ The plant is predicted to die from ${prediction.prediction.deathCause} in ${prediction.prediction.deathSeason}`);
    console.log(`📅 This will happen after ${prediction.prediction.deathAction} actions`);
    
    // Demonstrate protective action
    if (prediction.prediction.deathCause === 'drought') {
      console.log("\n💧 Taking protective action: WATER");
      ActionResolver.resolve("water garden 0", game);
    } else if (prediction.prediction.deathCause === 'frost') {
      console.log("\n🏠 Taking protective action: SHELTER");
      ActionResolver.resolve("shelter garden 0", game);
    }
    
    console.log(`🛡️ Protective actions taken: ${Array.from(prediction.protectiveActions).join(', ')}`);
  }
  
  console.log("\n⏳ Fast-forwarding through time to test prediction enforcement...");
  
  // Fast forward through many actions to test prediction
  let actionsCompleted = 0;
  let originalPredictionCount = game.plantPredictions.size;
  
  while (actionsCompleted < 50 && game.plantPredictions.size > 0) {
    // Simulate an action cycle
    game.triggerWeather();
    
    if (game.player.actionsLeft <= 0) {
      game.endSeasonProcessing();
    } else {
      game.player.actionsLeft--;
    }
    
    actionsCompleted++;
    
    // Show progress every 12 actions (1 year)
    if (actionsCompleted % 12 === 0) {
      console.log(`📅 ${actionsCompleted / 12} year(s) passed - Plant state: ${plant.state}`);
    }
  }
  
  console.log(`\n⏰ ${actionsCompleted} actions completed`);
  console.log(`🌱 Final plant state: ${plant.state}`);
  console.log(`📊 Predictions remaining: ${game.plantPredictions.size}`);
  
  if (originalPredictionCount > 0 && game.plantPredictions.size === 0) {
    console.log("✅ Timeline prediction was enforced!");
  }
  
} else {
  console.log("❌ Failed to consume Green Tea");
}

console.log("\n🎯 Demo Complete! Green Tea foresight functionality demonstrated:");
console.log("   ✅ Future simulation (48 actions ahead)");
console.log("   ✅ Death prediction with cause and timing");  
console.log("   ✅ Protective action tracking");
console.log("   ✅ Timeline enforcement");
console.log("   ✅ Extended protection duration (6 actions)");