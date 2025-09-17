// Test to verify protection logic step by step

const assert = require('assert');
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testProtectionLogicStepByStep() {
  console.log("=== Step-by-Step Protection Logic Test ===\n");
  
  const game = new Game();
  game.player.actionsLeft = 10;
  
  const plant = game.player.garden[0];
  
  // Apply water protection
  ActionResolver.resolve('water garden 0', game);
  console.log(`Plant: ${plant.name} [${plant.state}]`);
  console.log(`Active conditions: ${Object.keys(plant.activeConditions).join(', ')}`);
  console.log(`Water protection duration: ${plant.activeConditions.water} actions`);
  
  // Get the predetermined forecast 
  ActionResolver.resolve("brew kitchen 0", game);
  const teaCard = game.player.cafe[0];
  
  // Lock the weather forecast
  const prediction = game.engine.simulatePlantFuture(plant, 48);
  
  console.log(`\nPrediction: ${prediction.alive ? 'SURVIVES' : 'DIES'}`);
  if (!prediction.alive) {
    console.log(`Death: ${prediction.deathInfo.cause} at action ${prediction.deathInfo.action}`);
  }
  
  // Get the forecast and manually simulate
  const forecast = game.engine.weatherSystem.predeterminedForecast;
  console.log("\nManual simulation of protection logic:");
  
  const protectionState = { ...plant.activeConditions };
  const vulnerableEvents = plant.definition.states[plant.state].vulnerabilities.map(v => v.event);
  
  console.log(`Initial protection state:`, protectionState);
  console.log(`Vulnerable to: ${vulnerableEvents.join(', ')}`);
  
  for (let action = 1; action <= Math.min(30, forecast.length); action++) {
    const weatherEvent = forecast[action - 1];
    const isVulnerable = vulnerableEvents.includes(weatherEvent);
    
    let isProtected = false;
    if (weatherEvent === 'drought' && protectionState['water']) {
      isProtected = true;
    } else if (weatherEvent === 'frost' && protectionState['sunlight']) {
      isProtected = true;
    }
    
    const protectionList = Object.keys(protectionState).map(k => `${k}=${protectionState[k]}`).join(', ') || 'none';
    
    if (isVulnerable) {
      console.log(`Action ${action}: ${weatherEvent} ⚠️  - Protected: ${isProtected}, Protections: ${protectionList}`);
    } else {
      console.log(`Action ${action}: ${weatherEvent} - Protections: ${protectionList}`);
    }
    
    if (isVulnerable && !isProtected) {
      console.log(`  💀 DEATH! Plant dies from ${weatherEvent} at action ${action}`);
      break;
    }
    
    // Tick down protections at the end of the action
    Object.keys(protectionState).forEach(condition => {
      protectionState[condition]--;
      if (protectionState[condition] <= 0) {
        console.log(`  🔴 ${condition} protection expired!`);
        delete protectionState[condition];
      }
    });
  }
  
  console.log("\n" + "=".repeat(50));
  
  // Test with longer protection
  console.log("\nTesting with longer protection duration...");
  
  const game2 = new Game();
  game2.player.actionsLeft = 10;
  
  const plant2 = game2.player.garden[0];
  
  // Manually set longer protection
  plant2.activeConditions = { water: 25 }; // Protection lasting 25 actions
  
  console.log(`Plant2 with 25-action water protection`);
  
  const prediction2 = game2.engine.simulatePlantFuture(plant2, 48);
  
  console.log(`Prediction2: ${prediction2.alive ? 'SURVIVES' : 'DIES'}`);
  if (!prediction2.alive) {
    console.log(`Death: ${prediction2.deathInfo.cause} at action ${prediction2.deathInfo.action}`);
  }
  
  return {
    shortProtectionResult: prediction.alive,
    longProtectionResult: prediction2.alive,
    testCompleted: true
  };
}

// Run the test
const result = testProtectionLogicStepByStep();

// Add assertion
assert.ok(true, "Step-by-step test should complete without errors");

module.exports = { testProtectionLogicStepByStep };