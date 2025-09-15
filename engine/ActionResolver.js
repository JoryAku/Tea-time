// Receives an action string and mutates Game/player state accordingly.
module.exports = {
  resolve(actionString, game) {
    if (!actionString) return false;

    // wait is special: end the remaining actions this season
    if (actionString === "wait") {
      game.player.actionsLeft = 0;
      console.log("You chose to wait. Season will advance.");
      return true;
    }

    // parse: "action zone index" e.g. "clone hand 0"
    const parts = actionString.split(" ");
    const action = parts[0];
    const zone = parts[1];
    const index = parseInt(parts[2], 10);

    const card = game.player.findCard(zone, index);
    if (!card) {
      console.log("❌ No card found for that action.");
      return false;
    }

    const actions = card.getActions();
    const actionDef = actions[action];
    if (!actionDef) {
      console.log(`❌ Action "${action}" not available for ${card.name} [${card.state}].`);
      return false;
    }

    // Check if player has enough actions left
    const actionCost = actionDef.cost || 1;
    if (game.player.actionsLeft < actionCost) {
      console.log(`❌ Not enough actions left. This action requires ${actionCost} action(s).`);
      return false;
    }

    // Special handling for oxidation continuation
    if (card.definition.id === 'tea_leaf_oxidizing' && card.oxidationActionsLeft > 0) {
      // Only continue oxidation if action is not 'dry' or 'fix' (which can interrupt oxidation)
      if (action !== 'dry' && action !== 'fix') {
        // For oxidizing tea, progress the oxidation
        card.oxidationActionsLeft--;
        card.oxidationProgress++;
        console.log(`🫖 Continuing oxidation... ${card.oxidationActionsLeft} actions remaining.`);
        return true;
      }
    }

    // Handle action effects defined in JSON:
    switch (actionDef.effect) {
      case "move_card":
        // move card to a new zone, optionally set new state
        game.player.removeCardFromCurrentLocation(card);
        if (actionDef.newState) card.state = actionDef.newState;
        game.player.addCardToLocation(card, actionDef.location);
        break;

      case "add_card":
        // create a new card instance and put it in a location
        try {
          const newCard = game.createCard(actionDef.target, actionDef.state);
          game.player.addCardToLocation(newCard, actionDef.location);
          // Remove the original card if it's a consumption action
          if (actionDef.removeOriginal !== false) {
            game.player.removeCardFromCurrentLocation(card);
          }
          
          // If this was a harvest action, set harvestReady to false
          if (action === 'harvest' && card.state === 'mature') {
            card.harvestReady = false;
            console.log(`🌿 ${card.name} has been harvested and is no longer ready to harvest until next spring.`);
          }
        } catch (err) {
          console.error("Failed to add card:", err.message);
          return false;
        }
        break;

      case "transform_card":
        // Transform the current card into a different card type
        try {
          const newCard = game.createCard(actionDef.target);
          // Preserve any relevant properties from the original card
          if (card.oxidationProgress) newCard.oxidationProgress = card.oxidationProgress;
          // Remove old card and add new one in same location
          const currentLocation = game.player.findCardLocation(card);
          game.player.removeCardFromCurrentLocation(card);
          game.player.addCardToLocation(newCard, currentLocation);
        } catch (err) {
          console.error("Failed to transform card:", err.message);
          return false;
        }
        break;

      case "start_oxidation":
        // Start the oxidation process (2 actions required)
        try {
          const newCard = game.createCard(actionDef.target);
          newCard.oxidationProgress = 1; // First action of oxidation
          newCard.oxidationActionsLeft = actionDef.cost - 1; // Remaining actions
          const currentLocation = game.player.findCardLocation(card);
          game.player.removeCardFromCurrentLocation(card);
          game.player.addCardToLocation(newCard, currentLocation);
          console.log(`🫖 Started oxidation process. ${newCard.oxidationActionsLeft} more action(s) needed.`);
        } catch (err) {
          console.error("Failed to start oxidation:", err.message);
          return false;
        }
        break;

      case "apply_effect":
        // e.g. consume tea effects
        const target = actionDef.target;
        if (target.type === "peek_weather") {
          game.peekWeather(target.value);
        } else if (target.type === "past_action") {
          // For the terminal prototype we will grant a free extra action now
          console.log("🔮 You consumed a tea that allows 1 past action (implemented as +1 action now).");
          game.player.actionsLeft += target.value;
        } else if (target.type === "future_action") {
          console.log("⏩ Consumed a tea that allows 1 future action (applies as +1 action now).");
          game.player.actionsLeft += target.value;
        } else {
          console.log("Unknown apply_effect target:", target);
        }
        // If the action was consume, remove the consumed tea card from its zone
        // (actionDef expects this action to be on the tea card itself)
        if (card.definition && card.definition.type === "Tea") {
          game.player.removeCardFromCurrentLocation(card);
        }
        break;

      case "future_simulation":
        // Green Tea future simulation effect
        const simTarget = actionDef.target;
        if (simTarget.type === "plant_future") {
          // This effect requires plant selection, defer to special handling in CLI
          return "plant_selection_required";
        }
        break;

      case "protect_plant":
        // Apply protective condition to the plant
        const condition = actionDef.condition;
        const duration = actionDef.duration || 2; // Default to 2 actions like weather events
        card.activeConditions[condition] = duration;
        console.log(`🛡️ Applied ${condition} protection to ${card.name} for ${duration} actions.`);
        break;

      default:
        console.log("Unknown effect type:", actionDef.effect);
        return false;
    }

    // Deduct action cost
    game.player.actionsLeft -= actionCost;
    
    return true;
  },
};
