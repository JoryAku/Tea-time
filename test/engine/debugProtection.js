// Debug test to understand protection logic

const Game = require("../../engine/Game");

function debugProtectionLogic() {
  console.log("=== Debug Protection Logic ===\n");

  const game = new Game();
  const plant = game.player.garden[0];
  
  // Test with 6-action water protection
  plant.activeConditions = { water: 6 };
  
  console.log(`Plant: ${plant.name} [${plant.state}]`);
  console.log(`Vulnerabilities: ${plant.definition.states[plant.state].vulnerabilities.map(v => v.event).join(', ')}`);
  console.log(`Active conditions: ${Object.keys(plant.activeConditions || {}).join(', ')}`);
  console.log(`Water protection duration: ${plant.activeConditions.water} actions`);
  console.log("");
  
  // Manually call the survival outcome method to see what it determines
  const timeline = game.engine.createTimeline(48);
  
  // Debug: Create a test timeline directly to access internal methods
  const Timeline = require("../../engine/time/Timeline");
  const testTimeline = new Timeline(
    game.engine,
    game.engine.getCurrentSeason(),
    game.player.actionsLeft
  );
  
  // Call the internal method directly
  const outcome = testTimeline._determinePlantSurvivalOutcome(plant, 48);
  
  console.log("Survival outcome determination:");
  console.log(`  Will survive: ${outcome.willSurvive}`);
  console.log(`  Death action: ${outcome.deathAction}`);
  console.log(`  Death cause: ${outcome.deathCause}`);
  console.log(`  Protected by: ${outcome.protectedBy || 'none'}`);
  console.log(`  Survival chance: ${outcome.survivalChance}%`);
  console.log(`  Protected vulnerabilities: ${outcome.protectedVulnerabilities || 0}`);
  
  // Check the actual timeline result
  const deaths = timeline.getDeathPredictions();
  console.log(`\nTimeline result: ${deaths.length > 0 ? 'DIES' : 'SURVIVES'}`);
  if (deaths.length > 0) {
    console.log(`  Death action: ${deaths[0].deathAction}, cause: ${deaths[0].cause}`);
  }
  
  console.log("\n✅ Debug complete!");
}

debugProtectionLogic();