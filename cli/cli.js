const readline = require("readline");
const Game = require("../engine/Game");
// TODO update ActionResolver once epic is completed.
// const ActionResolver = require("../engine/ActionResolver");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const game = new Game();

console.log("=== Tea Time (Terminal) ===");

function showState() {
  console.log(`\n=== ${game.startingMonth} ===`);
  if (game.player.weatherVane) {
    console.log("\nCurrent weather conditions:");
    console.log(game.player.weatherVane);
  };
  console.log("\nGarden is empty.");
}

function promptAction() {
  showState();
  rl.question("\n Wait one month? (y/n): ", (answer) => {
    // Remove all posisible actions except wait
    if (answer === "y") {
      game.waitAction();
    }
    // Continue prompting for action
    return promptAction();
  });
}

promptAction();
