// Manual test of CLI Green Tea functionality without interactive input

const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testCLIWorkflow() {
  console.log("=== Manual CLI Workflow Test ===\n");

  const game = new Game();
  
  console.log("Initial state:");
  console.log("Garden:", game.player.garden.map(p => `${p.name} [${p.state}]`).join(", "));
  console.log("Kitchen:", game.player.kitchen.map(p => p.name).join(", "));
  console.log("Cafe:", game.player.cafe.map(p => p.name).join(", ") || "(empty)");
  console.log("Actions left:", game.player.actionsLeft);
  console.log("");

  // Step 1: Brew Green Tea
  console.log("Step 1: Brewing Green Tea (action: brew kitchen 0)");
  const brewResult = ActionResolver.resolve("brew kitchen 0", game);
  console.log("Result:", brewResult);
  console.log("Cafe:", game.player.cafe.map(p => p.name).join(", ") || "(empty)");
  console.log("Actions left:", game.player.actionsLeft);
  console.log("");

  // Step 2: Consume Green Tea to show timeline
  console.log("Step 2: Consuming Green Tea to view timeline (consume cafe 0)");
  
  // Simulate the plant selection process
  console.log("Available plants for prediction:");
  game.player.garden.forEach((plant, i) => {
    console.log(`  ${i}: ${plant.name} [${plant.state}]`);
  });
  
  const selectedPlantIndex = 0;
  console.log(`Selected plant index: ${selectedPlantIndex}`);
  console.log("");
  
  const teaCard = game.player.cafe[0];
  const consumeResult = game.consumeGreenTeaWithPlantSelection(teaCard, selectedPlantIndex);
  console.log("Green Tea consumption result:", consumeResult);
  console.log("Actions left after consumption:", game.player.actionsLeft);
  console.log("");

  // Step 3: Test intervention system
  console.log("Step 3: Testing intervention system");
  console.log("Available interventions for plants:");
  
  game.player.garden.forEach((plant, idx) => {
    const actions = plant.getActions();
    let interventions = [];
    
    if (actions.water) {
      interventions.push(`water (protect against drought)`);
    }
    if (actions.shelter) {
      interventions.push(`shelter (protect against frost)`);
    }
    
    console.log(`  Plant ${idx} (${plant.name}): ${interventions.join(', ')}`);
  });
  
  // Apply water intervention
  console.log("\nApplying water intervention to plant 0...");
  const waterResult = game.engine.applyProtectiveIntervention(0, 'water');
  console.log("Water intervention result:", waterResult.success);
  console.log("Actions left after intervention:", game.player.actionsLeft);
  console.log("");
  
  // Step 4: Apply shelter intervention
  if (game.player.actionsLeft > 0) {
    console.log("Step 4: Applying shelter intervention to plant 0...");
    const shelterResult = game.engine.applyProtectiveIntervention(0, 'shelter');
    console.log("Shelter intervention result:", shelterResult.success);
    console.log("Actions left after intervention:", game.player.actionsLeft);
    
    // Show final plant state
    const plant = game.player.garden[0];
    console.log("Final plant active conditions:", Object.keys(plant.activeConditions || {}).join(', ') || 'none');
  }
  
  console.log("\n✅ CLI workflow test completed successfully!");
}

function testInterventionLogic() {
  console.log("\n=== Testing Intervention Logic ===\n");
  
  const game = new Game();
  const plant = game.player.garden[0];
  
  console.log("Before any interventions:");
  console.log(`Plant: ${plant.name} [${plant.state}]`);
  console.log(`Vulnerabilities: ${plant.definition.states[plant.state].vulnerabilities.map(v => v.event).join(', ')}`);
  console.log(`Active conditions: ${Object.keys(plant.activeConditions || {}).join(', ') || 'none'}`);
  console.log("");
  
  // Test water protection against drought
  console.log("Testing water protection against drought:");
  const waterAction = plant.getActions().water;
  if (waterAction) {
    plant.activeConditions = plant.activeConditions || {};
    plant.activeConditions[waterAction.condition] = waterAction.duration;
    console.log(`✅ Applied ${waterAction.condition} protection for ${waterAction.duration} actions`);
    console.log(`  This protects against: drought vulnerability`);
  }
  
  // Test shelter protection against frost
  console.log("\nTesting shelter protection against frost:");
  const shelterAction = plant.getActions().shelter;
  if (shelterAction) {
    plant.activeConditions[shelterAction.condition] = shelterAction.duration;
    console.log(`✅ Applied ${shelterAction.condition} protection for ${shelterAction.duration} actions`);
    console.log(`  This protects against: frost vulnerability`);
  }
  
  console.log(`\nFinal active conditions: ${Object.keys(plant.activeConditions || {}).join(', ')}`);
  
  // Test timeline with protections
  console.log("\nGenerating timeline with protections applied:");
  const timeline = game.engine.createTimeline(48);
  const deathPredictions = timeline.getDeathPredictions();
  
  if (deathPredictions.length === 0) {
    console.log("✅ No deaths predicted - protections are working!");
  } else {
    console.log("Timeline still shows deaths:");
    deathPredictions.forEach(death => {
      console.log(`  Action ${death.deathAction}: ${death.plantId} - ${death.cause}`);
    });
  }
  
  console.log("\n✅ Intervention logic test completed!");
}

// Run the tests
testCLIWorkflow();
testInterventionLogic();