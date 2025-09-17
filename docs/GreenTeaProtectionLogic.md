# Green Tea Protection Logic Documentation

## Summary

The Green Tea timeline predictions **DO correctly consider existing protection conditions** on plants. The protection logic is working as intended.

## How Protection Works

### Protection Types
- **Water Protection**: Applied via `water` action, provides `water` condition for 6 actions, protects against drought
- **Shelter Protection**: Applied via `shelter` action, provides `sunlight` condition for 6 actions, protects against frost

### Protection Duration
- Protections have limited duration (default: 6 actions)
- Duration counts down each action
- When duration reaches 0, protection is removed
- Plants become vulnerable again after protection expires

### Timeline Logic
1. Timeline checks each action for weather events
2. If weather event matches plant vulnerability:
   - Check if plant has active protection against that event
   - If protected: plant survives, protection duration decreases
   - If not protected: plant dies
3. Protection durations tick down at the end of each action

## Expected Behavior

### ✅ Correct Scenarios
- Plant with water protection (6 actions) + drought at action 3 → **SURVIVES**
- Plant with shelter protection (6 actions) + frost at action 5 → **SURVIVES**
- Plant with water protection (6 actions) + drought at action 8 → **DIES** (protection expired)
- Plant with both protections + mixed threats within 6 actions → **SURVIVES**

### 🔧 Common Misunderstandings
- **"Protection ignored"**: Usually means protection expired before the death event
- **"Timeline shows death"**: Death events after protection expires are correct behavior
- **"Bug in protection"**: Often due to misunderstanding protection duration vs threat timing

## Code Validation

The following methods correctly handle protections:
- `Timeline._determineOutcomeFromForecast()` - Core protection logic
- `consumeGreenTeaWithPlantSelection()` - Forces timeline regeneration with active protections
- `simulateFutureHarvestTimeline()` - Oolong tea inherits same protection logic

## Test Coverage

Comprehensive tests added to validate:
- Water protection prevents drought deaths within protection period
- Shelter protection prevents frost deaths within protection period  
- Both protections work together for mixed threats
- Protection expiration correctly allows death from previously protected events
- Green Tea consumption integration works correctly
- Oolong Tea inherits the same protection logic consistently

All 39 tests pass, confirming the protection logic is working correctly.