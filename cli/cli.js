const readline = require("readline");
const Game = require("../engine/Game");
const ActionResolver = require("../engine/ActionResolver");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const game = new Game();

console.log("=== Tea Time (Terminal) ===");
console.log("Objective: grow plants and brew teas to eventually craft the Time Tea (prototype).");
console.log("Actions per season:", game.actionsPerSeason);
console.log("");

function showState() {
  console.log(`\n=== ${game.currentSeason.toUpperCase()} | Actions left: ${game.player.actionsLeft} ===`);
  game.player.listCards();
  // Log current active weather conditions for all plants in the garden
  if (game.player.garden.length > 0) {
    console.log("\nCurrent garden conditions:");
    game.player.garden.forEach((card, idx) => {
      // Collect all conditions, including duplicates for different durations
      let conds = [];
      if (card.activeConditions) {
        for (const [cond, turns] of Object.entries(card.activeConditions)) {
          conds.push(`${cond} (${turns} turns left)`);
        }
      }
      if (conds.length > 0) {
        const condStr = conds.join(", ");
        console.log(`  [${idx}] ${card.name} [${card.state}]: ${condStr}`);
      } else {
        console.log(`  [${idx}] ${card.name} [${card.state}]: No active conditions`);
      }
    });
  } else {
    console.log("\nGarden is empty.");
  }
}

function promptAction() {
  showState();

  // Show plant actions for seeds in hand and shed
  let plantActions = [];
  game.player.hand.forEach((card, idx) => {
    if (card.state === 'seed') plantActions.push(`plant hand ${idx}`);
  });
  game.player.shed.forEach((card, idx) => {
    if (card.state === 'seed') plantActions.push(`plant shed ${idx}`);
  });
  // Add all other available actions
  let otherActions = [];
  game.player.getAvailableActions().forEach((a) => {
    if (a === 'wait' || !a.startsWith('plant')) otherActions.push(a);
  });
  // Ensure wait is always at index 0
  let possibleActions = [];
  const waitIdx = otherActions.indexOf('wait');
  if (waitIdx !== -1) {
    possibleActions.push('wait');
    otherActions.splice(waitIdx, 1);
  }
  possibleActions = possibleActions.concat(plantActions, otherActions);
  console.log("\nPossible actions (type the number):");
  possibleActions.forEach((a, i) => {
    if (a === "wait") {
      console.log(`  ${i}: wait`);
    } else {
      const [action, zone, idx] = a.split(" ");
      console.log(`  ${i}: ${action} ${idx} (${zone})`);
    }
  });

  rl.question("\nChoose an action: ", (input) => {
    const choice = parseInt(input.trim(), 10);
    const action = possibleActions[choice];
    if (typeof action === "undefined") {
      console.log("❌ Invalid choice. Type the number shown.");
      return promptAction();
    }

    if (action === "wait") {
      game.waitAction();
    } else if (action.startsWith('plant')) {
      const [_, zone, idx] = action.split(' ');
      game.plantSeedFromZone(zone, parseInt(idx, 10));
      // reduce action only if action succeeded
      if (game.player.actionsLeft > 0) game.player.actionsLeft -= 1;
      // after each action, trigger weather
      game.triggerWeather();
      if (game.player.actionsLeft <= 0) {
        game.endSeasonProcessing();
      }
    } else {
      const success = ActionResolver.resolve(action, game);
      if (success === "plant_selection_required") {
        // Handle Green Tea plant selection
        const [actionName, zone, idx] = action.split(' ');
        const teaCard = game.player.findCard(zone, parseInt(idx, 10));
        
        if (game.player.garden.length === 0) {
          console.log('❌ No plants in garden to simulate!');
          return promptAction();
        }
        
        console.log('\n🔮 Select a plant to see its future:');
        game.player.garden.forEach((plant, i) => {
          console.log(`  ${i}: ${plant.name} [${plant.state}]`);
        });
        
        rl.question('\nSelect plant index: ', (plantInput) => {
          const plantIndex = parseInt(plantInput.trim(), 10);
          if (isNaN(plantIndex) || plantIndex < 0 || plantIndex >= game.player.garden.length) {
            console.log('❌ Invalid plant selection.');
            return promptAction();
          }
          
          const success = game.consumeGreenTeaWithPlantSelection(teaCard, plantIndex);
          if (success) {
            game.player.actionsLeft -= 1;
            game.triggerWeather();
            
            // After Green Tea consumption, offer intervention options
            promptIntervention();
          }
          
          if (game.player.actionsLeft <= 0) {
            game.endSeasonProcessing();
          }
          
          return;
        });
        return;
      } else if (success) {
        // Action cost is handled inside ActionResolver now
        // after each action, trigger weather
        game.triggerWeather();
      }
      // If no actions remain, end-season processing will run
      if (game.player.actionsLeft <= 0) {
        game.endSeasonProcessing();
      }
    }
    // Continue
    return promptAction();
  });
}

function promptIntervention() {
  console.log('\n🛡️ INTERVENTION OPTIONS:');
  console.log('Would you like to apply protective actions to change the timeline?');
  console.log('  0: Continue with normal game (no intervention)');
  
  if (game.player.garden.length > 0) {
    game.player.garden.forEach((plant, idx) => {
      const actions = plant.getActions();
      let interventions = [];
      
      if (actions.water) {
        interventions.push(`water (protect against drought)`);
      }
      if (actions.shelter) {
        interventions.push(`shelter (protect against frost)`);
      }
      
      if (interventions.length > 0) {
        console.log(`  Plant ${idx} (${plant.name}): ${interventions.join(', ')}`);
      }
    });
  }
  
  rl.question('\nApply intervention? (format: "plantIndex actionType" or "0" to continue): ', (input) => {
    const trimmedInput = input.trim();
    
    if (trimmedInput === '0') {
      return promptAction();
    }
    
    const parts = trimmedInput.split(' ');
    if (parts.length !== 2) {
      console.log('❌ Invalid format. Use "plantIndex actionType" (e.g., "0 water") or "0" to continue.');
      return promptIntervention();
    }
    
    const plantIndex = parseInt(parts[0], 10);
    const actionType = parts[1];
    
    if (isNaN(plantIndex) || plantIndex < 0 || plantIndex >= game.player.garden.length) {
      console.log('❌ Invalid plant index.');
      return promptIntervention();
    }
    
    if (actionType !== 'water' && actionType !== 'shelter') {
      console.log('❌ Invalid action type. Use "water" or "shelter".');
      return promptIntervention();
    }
    
    // Check if player has enough actions
    if (game.player.actionsLeft <= 0) {
      console.log('❌ No actions left to apply interventions.');
      return promptAction();
    }
    
    // Apply the intervention
    const result = game.engine.applyProtectiveIntervention(plantIndex, actionType);
    if (result.success) {
      game.player.actionsLeft -= 1;
      game.triggerWeather();
      
      if (game.player.actionsLeft <= 0) {
        game.endSeasonProcessing();
      }
      
      // Ask if they want to apply more interventions
      if (game.player.actionsLeft > 0) {
        promptIntervention();
      } else {
        promptAction();
      }
    } else {
      console.log(`❌ ${result.message}`);
      promptIntervention();
    }
  });
}

promptAction();
