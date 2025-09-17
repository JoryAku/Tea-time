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
  console.log(`⏰ ${game.player.getTimeString(game.actionsPerSeason)}`);
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
      
      // Add harvest readiness status for mature plants
      let statusInfo = "";
      if (card.state === 'mature') {
        if (card.harvestReady) {
          statusInfo += " - ✅ Ready to harvest";
        } else {
          statusInfo += " - ❌ Not harvestable (wait for spring)";
        }
      }
      
      if (conds.length > 0) {
        const condStr = conds.join(", ");
        console.log(`  [${idx}] ${card.name} [${card.state}]: ${condStr}${statusInfo}`);
      } else {
        console.log(`  [${idx}] ${card.name} [${card.state}]: No active conditions${statusInfo}`);
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
      if (game.player.actionsLeft > 0) game.player.useAction(1);
      // after each action, trigger weather
      game.triggerWeather();
      if (game.player.actionsLeft <= 0) {
        game.endSeasonProcessing();
      }
    } else {
      const success = ActionResolver.resolve(action, game);
      if (success === "plant_selection_required") {
        // Handle tea plant selection (Green Tea or Oolong Tea)
        const [actionName, zone, idx] = action.split(' ');
        const teaCard = game.player.findCard(zone, parseInt(idx, 10));
        
        if (game.player.garden.length === 0) {
          console.log('❌ No plants in garden to simulate!');
          return promptAction();
        }
        
        // Determine tea type and show appropriate message
        const isGreenTea = teaCard.definition.id === 'green_tea';
        const isOolongTea = teaCard.definition.id === 'oolong_tea';
        const isBlackTea = teaCard.definition.id === 'black_tea';
        
        if (isGreenTea) {
          console.log('\n🔮 Green Tea: Select a plant to see its future timeline:');
        } else if (isOolongTea) {
          console.log('\n🫖 Oolong Tea: Select a plant to harvest from the future:');
        } else if (isBlackTea) {
          console.log('\n⚫ Black Tea: Select a plant to view its 4-year timeline and replace with a future state:');
        } else {
          console.log('\n🍵 Select a plant for tea effect:');
        }
        
        game.player.garden.forEach((plant, i) => {
          let statusInfo = "";
          if (plant.state === 'mature') {
            if (plant.harvestReady) {
              statusInfo = " - ✅ Ready to harvest now";
            } else {
              statusInfo = " - ❌ Not harvestable (wait for spring)";
            }
          }
          console.log(`  ${i}: ${plant.name} [${plant.state}]${statusInfo}`);
        });
        
        rl.question('\nSelect plant index: ', (plantInput) => {
          const plantIndex = parseInt(plantInput.trim(), 10);
          if (isNaN(plantIndex) || plantIndex < 0 || plantIndex >= game.player.garden.length) {
            console.log('❌ Invalid plant selection.');
            return promptAction();
          }
          
          let consumptionSuccess = false;
          
          if (isGreenTea) {
            consumptionSuccess = game.consumeGreenTeaWithPlantSelection(teaCard, plantIndex);
            if (consumptionSuccess) {
              // After Green Tea consumption, offer intervention options
              promptIntervention();
            }
          } else if (isOolongTea) {
            const consumptionResult = game.consumeOolongTeaWithPlantSelection(teaCard, plantIndex);
            
            if (consumptionResult.success && consumptionResult.requiresSelection) {
              // Handle harvest selection
              const opportunities = consumptionResult.harvestOpportunities;
              
              if (opportunities.length === 0) {
                console.log('❌ No harvest opportunities available.');
                return promptAction();
              }
              
              console.log('\n🎯 === SELECT HARVEST TO PULL INTO PRESENT ===');
              console.log('Choose which harvest opportunity to take:');
              
              opportunities.forEach((opportunity, index) => {
                const yearsFromNow = Math.ceil(opportunity.action / 12);
                console.log(`  ${index}: Action ${opportunity.action} (Year ${yearsFromNow}, ${opportunity.season}) - Weather: ${opportunity.weather}`);
              });
              
              rl.question('\nSelect harvest index (or "cancel" to abort): ', (harvestInput) => {
                const trimmedInput = harvestInput.trim().toLowerCase();
                
                if (trimmedInput === 'cancel') {
                  console.log('🚫 Oolong Tea consumption cancelled.');
                  return promptAction();
                }
                
                const harvestIndex = parseInt(trimmedInput, 10);
                if (isNaN(harvestIndex) || harvestIndex < 0 || harvestIndex >= opportunities.length) {
                  console.log('❌ Invalid harvest selection.');
                  return promptAction();
                }
                
                // Execute the selected harvest
                const finalResult = game.consumeOolongTeaWithPlantSelection(
                  consumptionResult.teaCard, 
                  consumptionResult.plantIndex, 
                  harvestIndex,
                  {
                    success: true,
                    harvestOpportunities: consumptionResult.harvestOpportunities,
                    deathInfo: consumptionResult.deathInfo,
                    timeline: consumptionResult.timeline
                  }
                );
                
                if (finalResult.success) {
                  console.log('✅ Harvest successfully pulled from the future!');
                  consumptionSuccess = true;
                  game.player.useAction(1);
                  game.triggerWeather();
                } else {
                  console.log(`❌ Harvest execution failed: ${finalResult.message}`);
                }
                
                if (game.player.actionsLeft <= 0) {
                  game.endSeasonProcessing();
                }
                
                return promptAction();
              });
              return;
            } else {
              consumptionSuccess = consumptionResult.success;
            }
          } else if (isBlackTea) {
            const consumptionResult = game.consumeBlackTeaWithPlantSelection(teaCard, plantIndex);
            
            if (consumptionResult.success && consumptionResult.requiresSelection) {
              // Handle timeline state selection
              const timelineStates = consumptionResult.timelineStates;
              
              if (timelineStates.length <= 1) {
                console.log('❌ No selectable future states available.');
                return promptAction();
              }
              
              console.log('\n🔄 === SELECT FUTURE STATE TO REPLACE PRESENT PLANT ===');
              console.log('Choose which future state to use:');
              
              timelineStates.forEach((stateInfo, index) => {
                const yearsFromNow = Math.ceil(stateInfo.action / 12);
                const ageText = stateInfo.age ? ` (age ${stateInfo.age})` : '';
                const harvestText = stateInfo.harvestInfo && stateInfo.harvestInfo.isHarvestable ? 
                  ` - 🌾 Harvestable (${stateInfo.harvestInfo.yieldCount} items)` : '';
                const currentText = stateInfo.isCurrent ? ' (current state)' : '';
                const invalidText = !stateInfo.isValid ? ' ⚠️ INVALID (dead)' : '';
                
                console.log(`  ${index}: Action ${stateInfo.action} - ${stateInfo.state}${ageText}${currentText}${harvestText}${invalidText}`);
              });
              
              rl.question('\nSelect state index (or "cancel" to abort): ', (stateInput) => {
                const trimmedInput = stateInput.trim().toLowerCase();
                
                if (trimmedInput === 'cancel') {
                  console.log('🚫 Black Tea consumption cancelled.');
                  return promptAction();
                }
                
                const stateIndex = parseInt(trimmedInput, 10);
                if (isNaN(stateIndex) || stateIndex < 0 || stateIndex >= timelineStates.length) {
                  console.log('❌ Invalid state selection.');
                  return promptAction();
                }
                
                const selectedState = timelineStates[stateIndex];
                
                if (!selectedState.isValid) {
                  console.log('❌ Cannot select invalid state (dead plant).');
                  return promptAction();
                }
                
                if (selectedState.isCurrent) {
                  console.log('❌ Plant is already in the selected state.');
                  return promptAction();
                }
                
                // Execute the state replacement
                const finalResult = game.consumeBlackTeaWithPlantSelection(
                  consumptionResult.teaCard, 
                  consumptionResult.plantIndex, 
                  selectedState.action
                );
                
                if (finalResult.success) {
                  console.log('✅ Plant successfully replaced with future state!');
                  consumptionSuccess = true;
                  game.player.useAction(1);
                  game.triggerWeather();
                } else {
                  console.log(`❌ State replacement failed: ${finalResult.message}`);
                }
                
                if (game.player.actionsLeft <= 0) {
                  game.endSeasonProcessing();
                }
                
                return promptAction();
              });
              return;
            } else {
              consumptionSuccess = consumptionResult.success;
            }
          } else {
            // Fallback for other tea types
            consumptionSuccess = game.consumeGreenTeaWithPlantSelection(teaCard, plantIndex);
          }
          
          if (consumptionSuccess) {
            game.player.useAction(1);
            game.triggerWeather();
          }
          
          if (game.player.actionsLeft <= 0) {
            game.endSeasonProcessing();
          }
          
          return promptAction();
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
      game.player.useAction(1);
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
