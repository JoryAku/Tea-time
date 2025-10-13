**Goal**
Build the foundation for a vector-based simulation system that drives both weather and plant growth in monthly time steps.
The player’s current interaction loop will be:

**View their garden**
Check weather readings (via a weather vane)
Press “Wait” to advance time by one month
Each month, the weather system evolves using vector dynamics, and the plants respond to these vectors (sunlight, water, temperature, etc.).

_Core Concepts_
**Weather System**
Represent weather as vectors (e.g., light, humidity, temp, pressure) that evolve over time.
Include variability and thresholds for transitions between conditions.
Provide current weather readings to the player through the weather vane UI.
Expose APIs or data structures so plant systems can query conditions per month.

**Plant System**
Represent each plant’s growth stage (Seed → Seedling → Sapling → Mature → Dead) using growth vectors.
Each stage evolves based on cumulative weather vectors (e.g., sunlight accelerates growth; drought reduces health).
Provide a simple simulation loop where each month updates plant vectors according to weather.