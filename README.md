# Tea Time

**Tea Time** is a single-player deck-building puzzle game where you are trapped in a year-long time loop. Your goal is to grow, harvest, and process ingredients to brew the legendary Time Tea and break the loop.

## Objective

* Grow and harvest tea plants.
* Process and brew ingredients into teas.
* Consume Green Tea to take actions in the past, and Black Tea to take actions in the future.
* Plan your actions carefully to complete the Time Tea recipe and break the time loop.

## Gameplay Mechanics

* The game is divided into **four seasons**: Spring, Summer, Autumn, Winter.

* You have **3 actions per season**.

* **Actions you can take**:

  * `plant` – Plant a Seedling in the field.
  * `harvest` – Harvest a Mature Plant into a Raw Ingredient.
  * `processRaw` – Process a Raw Ingredient into a Processed Ingredient.
  * `brewRaw` – Brew a Raw Ingredient into a tea.
  * `brewProcessed` – Brew a Processed Ingredient into a tea.
  * `consume` – Consume a tea to trigger past or future effects.
  * `clone` – Clone a Seedling to get an extra Seedling in your hand.
  * `wait` – Skip remaining actions to advance to the next season.

* **Teas**:

  * Green Tea: Allows one action in the past.
  * Black Tea: Allows one action in the future.

## Installation

1. Clone the repository:

```bash
git clone https://git@github.com:JoryAku/Tea-time.git
```

2. Navigate to the project folder:

```bash
cd tea-time
```

3. Install dependencies (if any; currently uses Node.js only):

```bash
npm install
```

## Running the Game

Run the CLI to start the game:

```bash
node cli/cli.js
```

Follow the prompts to choose actions each season. The game will display your hand, field, ingredients, and teas after each action.

## Project Structure

```
tea-time/
├─ engine/        # Core game logic (Game.js, Player.js, Card.js, utils.js)
├─ data/          # Cards and recipes JSON files
├─ cli/           # CLI interface (cli.js)
└─ tea-time.js    # Entry point to start the game
```

## License

MIT License
