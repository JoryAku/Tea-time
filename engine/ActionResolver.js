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

    // Deduct action cost
    game.player.actionsLeft -= actionCost;
    
    return true;
  },
};
