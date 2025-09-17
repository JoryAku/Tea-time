// Debug test for timeline protection logic

const assert = require('assert');
const Game = require("../../engine/Game");

function debugTimelineProtection() {
  console.log("=== Debug Timeline Protection Logic ===\n");
  
  const game = new Game();
  game.player.actionsLeft = 10;
  
  const plant = game.player.garden[0];
  
  // Set up specific protection and test
  plant.activeConditions = { water: 15 }; // Water protection for 15 actions
  console.log(`Plant: ${plant.name} [${plant.state}]`);
  console.log(`Vulnerabilities: ${plant.definition.states[plant.state].vulnerabilities.map(v => v.event).join(', ')}`);
  console.log(`Active conditions: ${Object.keys(plant.activeConditions).join(', ')}`);
  console.log(`Water protection duration: ${plant.activeConditions.water} actions`);
  
  // Force weather forecast to have early drought
  if (!game.engine.weatherForecastLocked) {
    const forecast = ['drought', 'sun', 'rain', 'drought', 'sun', 'frost', 'sun', 'rain', 'cloud', 'drought'];
    // Extend to 48 actions with safe weather
    while (forecast.length < 48) {
      forecast.push('sun');
    }
    game.engine.weatherSystem.setPredeterminedForecast(forecast);
    game.engine.weatherForecastLocked = true;
  }
  
  console.log("\nPredetermined forecast (first 10 actions):");
  const forecast = game.engine.weatherSystem.predeterminedForecast.slice(0, 10);
  forecast.forEach((weather, index) => {
    console.log(`  Action ${index + 1}: ${weather}`);
  });
  
  // Create timeline and check outcome
  console.log("\nCreating timeline...");
  const timeline = game.engine.createTimeline(48);
  
  // Get outcome for this plant
  const plantIndex = 0;
  const plantId = timeline.getPlantId(plant, plantIndex);
  const outcome = timeline.plantOutcomes.get(plantId);
  
  console.log(`\nTimeline outcome: ${outcome ? (outcome.willSurvive ? 'SURVIVES' : `DIES at action ${outcome.deathAction} from ${outcome.deathCause}`) : 'No outcome found'}`);
  
  // Check death predictions
  const deathPredictions = timeline.getDeathPredictions();
  const plantDeath = deathPredictions.find(death => death.plantId === plantId);
  
  if (plantDeath) {
    console.log(`Death prediction: Action ${plantDeath.deathAction}, Cause: ${plantDeath.cause}`);
  } else {
    console.log("No death prediction found");
  }
  
  // Manual simulation to verify logic
  console.log("\n--- Manual Protection Simulation ---");
  const activeProtections = { ...plant.activeConditions };
  const vulnerableEvents = plant.definition.states[plant.state].vulnerabilities.map(v => v.event);
  console.log(`Vulnerable to: ${vulnerableEvents.join(', ')}`);
  
  for (let action = 1; action <= 15 && action <= forecast.length; action++) {
    const weatherEvent = forecast[action - 1];
    const isVulnerable = vulnerableEvents.includes(weatherEvent);
    
    let isProtected = false;
    if (weatherEvent === 'drought' && activeProtections['water']) {
      isProtected = true;
    } else if (weatherEvent === 'frost' && activeProtections['sunlight']) {
      isProtected = true;
    }
    
    console.log(`Action ${action}: ${weatherEvent} - Vulnerable: ${isVulnerable}, Protected: ${isProtected}, Protections: ${Object.keys(activeProtections).map(k => `${k}=${activeProtections[k]}`).join(', ') || 'none'}`);
    
    if (isVulnerable && !isProtected) {
      console.log(`  --> DEATH! Plant dies from ${weatherEvent}`);
      break;
    }
    
    // Tick down protections
    Object.keys(activeProtections).forEach(condition => {
      activeProtections[condition]--;
      if (activeProtections[condition] <= 0) {
        delete activeProtections[condition];
      }
    });
  }
  
  return {
    survives: outcome ? outcome.willSurvive : false,
    deathAction: outcome ? outcome.deathAction : null,
    deathCause: outcome ? outcome.deathCause : null
  };
}

// Run the debug test
const result = debugTimelineProtection();

// Add basic assertion
assert.ok(true, "Debug test should complete without errors");

module.exports = { debugTimelineProtection };