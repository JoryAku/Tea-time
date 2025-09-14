// Handles player actions (water, shelter, harvest, etc.)

class ActionManager {
  constructor(cardsData) {
    this.cardsData = cardsData;
  }

  // Process tea-specific actions like oxidation, drying, fixing
  processTeaOxidation(card) {
    if (card.definition.id === 'tea_leaf_oxidizing') {
      // Check for overoxidation first
      if (card.oxidationProgress > 3) {
        return 'overoxidized';
      }
      
      if (card.oxidationActionsLeft > 0) {
        card.oxidationActionsLeft--;
        console.log(`🫖 ${card.name} oxidation continues... ${card.oxidationActionsLeft} actions remaining.`);
        
        if (card.oxidationActionsLeft === 0) {
          console.log(`🫖 ${card.name} oxidation complete. Can now be dried or fixed.`);
        }
      }
    }
    return 'continuing';
  }

  // Check for tea processing failures based on weather
  checkTeaProcessingFailures(card, event) {
    // Check vulnerabilities for tea leaves
    if (card.definition.vulnerabilities) {
      for (const vuln of card.definition.vulnerabilities) {
        if (vuln.event === event && vuln.outcome === 'dead') {
          return 'failed';
        }
      }
    }

    // Check burn risk for fix action during heat events
    if (event === 'heat' && card.definition.id === 'tea_leaf_raw') {
      return 'burned';
    }

    return 'safe';
  }

  // Harvest seeds from a plant in the garden
  harvestSeedFromGarden(player, gardenIndex, cardFactory) {
    const card = player.garden[gardenIndex];
    if (!card) {
      console.log('❌ No plant at that garden index.');
      return false;
    }
    const stageDef = card.definition.states[card.state];
    if (!stageDef || !stageDef.actions || !stageDef.actions.harvest_seed) {
      console.log('❌ This plant cannot be harvested for seeds at this stage.');
      return false;
    }
    // Add a new tea_plant card at seed stage to hand
    const newSeed = cardFactory('tea_plant', 'seed');
    player.addCardToLocation(newSeed, 'hand');
    console.log('🌱 Harvested a tea plant seed and added to hand.');
    return true;
  }

  // Plant a seed from any zone into the garden
  plantSeedFromZone(player, zone, idx, cardFactory) {
    const seedCard = player[zone][idx];
    if (!seedCard || seedCard.state !== 'seed' || seedCard.definition.id !== 'tea_plant') {
      console.log('❌ Selected card is not a plantable seed.');
      return false;
    }
    // Only allow planting in compost
    const compostIdx = player.garden.findIndex(card => card.state === 'compost');
    if (compostIdx !== -1) {
      // Mark compost card for planting
      player.garden[compostIdx].justPlantedSeed = true;
      player.removeCardFromCurrentLocation(seedCard);
      console.log('🌱 Planted seed into compost.');
      return true;
    } else {
      console.log('❌ You can only plant seeds in compost.');
      return false;
    }
  }
}

module.exports = ActionManager;