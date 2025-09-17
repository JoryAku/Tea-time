# Tea-time Game Design Summary

## Overview

**Tea-time** is a sophisticated terminal-based garden simulation game where players cultivate tea plants through realistic seasonal cycles, manage complex weather systems, and utilize advanced timeline prediction mechanics. The game combines strategic resource management with deep botanical simulation to create an engaging tea cultivation experience.

## 🌱 Plant Design System

### Plant Lifecycle Architecture

The game features a comprehensive plant lifecycle system centered around the **Camellia sinensis** (Tea Plant) with six distinct growth states:

#### State Progression
1. **Seed** → **Seedling** (1-2 actions)
2. **Seedling** → **Mature** (36 actions / ~3 years)
3. **Mature** → **Flowering** (4-12 actions)
4. **Flowering** → **Fruiting** (3 actions)
5. **Fruiting** → **Seed** (3 actions, reproduction cycle)
6. **Dead** → **Compost** (3-6 actions, decomposition)

#### State-Based Mechanics
Each plant state has unique characteristics:

- **Needs**: Required resources (water, sunlight) and favorable seasons
- **Vulnerabilities**: Weather events that can cause death (drought, frost, pests, disease)
- **Actions**: Available player interactions (plant, water, shelter, harvest, clone)
- **Transitions**: Automated progression rules with timing ranges

#### Advanced Plant Features
- **Protective Conditions**: Players can apply water/shelter protection lasting 6 actions
- **Active Condition Tracking**: Dynamic countdown of protective effects
- **State Progress Tracking**: Gradual advancement toward next lifecycle stage
- **Unique Plant IDs**: Persistent identification for timeline consistency

### Plant Vulnerability System

Plants face seasonal threats:
- **Drought**: Fatal to seeds, seedlings, mature, flowering, and fruiting states
- **Frost**: Kills seedlings, mature, flowering, and fruiting plants
- **Pests & Disease**: Affects mature, flowering, and fruiting states
- **Rot**: Can destroy harvested tea leaves during processing

## 🌦️ Weather Design System

### Seasonal Weather Distribution

The weather system operates on realistic seasonal patterns with percentage-based event probabilities:

#### Spring Weather (Growth Season)
- **Rain**: 30% (provides water protection)
- **Sun**: 25% (provides sunlight protection)
- **Cloud**: 10% (neutral conditions)
- **Wind**: 10% (neutral conditions)

#### Summer Weather (Stress Season)
- **Sun**: 25% (beneficial but with heat stress)
- **Rain**: 15% (rare but vital water)
- **Drought**: 15% (major plant threat)
- **Thunderstorm**: 10% (intense water + wind)
- **Clear Night**: 5% (special conditions)

#### Autumn Weather (Transition Season)
- **Wind**: 20% (harvest disruption)
- **Sun**: 20% (final growth opportunity)
- **Rain**: 15% (moderate water supply)
- **Cloud**: 15% (neutral conditions)
- **Frost**: 5% (early killing frost)

#### Winter Weather (Survival Season)
- **Rain**: 30% (with rot risk)
- **Cloud**: 30% (protection from extremes)
- **Sun**: 25% (rare winter warmth)
- **Frost**: 10% (deadly to unprotected plants)
- **Snow**: 5% (extreme conditions)

### Deterministic Weather Generation

The weather system uses advanced seeded random generation:
- **Seeded RNG**: Consistent weather patterns based on game start time
- **Predetermined Forecasts**: 48-action (4-year) weather predictions
- **Seasonal Transitions**: Automatic progression every 3 actions
- **Weight-Based Selection**: Probability-driven event selection

### Weather Condition Effects

Each weather event provides specific conditions:
- **Water**: Protects against drought vulnerability
- **Sunlight**: Protects against frost vulnerability  
- **Heat**: Intensifies summer stress
- **Wind**: Can affect harvesting
- **Rot**: Damages stored ingredients

## ⏰ Timeline Design System

### Comprehensive Timeline Architecture

The timeline system represents the game's most sophisticated feature, enabling players to simulate and manipulate plant futures across 4-year periods.

#### Timeline Generation Process

1. **Plant Outcome Determination**: Calculate survival/death predictions
2. **Weather Event Generation**: Create consistent 48-action forecast
3. **Daily Progression Simulation**: Track all state changes and events
4. **Timeline Locking**: Ensure consistency across tea power usage

#### Advanced Timeline Features

**Plant State Tracking**:
- Records every state transition with exact timing
- Tracks age progression and lifecycle milestones
- Identifies harvest opportunities and yield predictions
- Calculates death timing and causes

**Death Prediction System**:
- Analyzes plant vulnerabilities against weather forecast
- Considers active protection durations
- Calculates intervention opportunities
- Provides detailed death cause analysis

**Timeline Consistency**:
- Shared across all tea powers (Green, Oolong, Black)
- Cached for performance optimization (9x speed improvement)
- Auto-invalidation when plant states change
- Unique plant ID system for tracking

### Timeline Caching System

**Performance Optimization**:
- First generation: ~9ms for 5 plants
- Cached access: ~1ms for 5 plants
- Memory-efficient storage with automatic cleanup
- Version-based invalidation system

**Cache Management**:
- Plant-specific timeline storage
- Automatic invalidation triggers
- Cross-session persistence potential
- Scalable architecture

## 🍃 Tea Power Integration

### Green Tea: Future Vision System
- **48-Action Simulation**: Predicts 4-year plant futures
- **Weather Forecast Locking**: Ensures prediction consistency
- **Death Prediction**: Shows when/how plants will die
- **Intervention Guidance**: Highlights protective opportunities

### Oolong Tea: Harvest Optimization
- **Future Harvest Simulation**: Predicts optimal harvest timing
- **Yield Calculation**: Estimates tea leaf production
- **Harvest Window Analysis**: Identifies peak harvesting periods

### Black Tea: Timeline Manipulation
- **State Replacement**: Replace current plant with any future state
- **Time Acceleration**: Skip to desired plant maturity
- **Harvest Retention**: Maintain harvesting capabilities
- **Safety Validation**: Prevents replacement with dead states

## 🎮 Gameplay Mechanics Integration

### Seasonal Action System
- **3 Actions per Season**: Strategic resource allocation
- **4 Seasons per Year**: Complete agricultural cycles
- **12 Actions per Year**: Balanced pacing for planning
- **48 Actions = 4 Years**: Long-term strategic depth

### Protection Strategy Layer
- **Water Protection**: 6-action drought immunity
- **Shelter Protection**: 6-action frost immunity
- **Strategic Timing**: Coordinated protection with weather forecasts
- **Resource Management**: Limited protection resources

### Garden Management Complexity
- **Multiple Plant Tracking**: Manage entire garden simultaneously
- **Individual Plant Timelines**: Unique futures for each plant
- **Cross-Plant Interactions**: Shared weather affects all plants
- **Garden-Scale Strategy**: Optimize protection across multiple plants

## 🔬 Technical Implementation Highlights

### Modular Architecture
- **Engine/Weather/WeatherSystem.js**: Weather generation and forecasting
- **Engine/Time/Timeline.js**: Timeline simulation and state tracking
- **Engine/Time/TimeManager.js**: Season and calendar management
- **Data/Cards.json**: Plant definitions and lifecycle rules
- **Data/weather.json**: Seasonal weather probability tables

### Advanced Algorithms
- **Seeded Random Generation**: Deterministic weather for consistent gameplay
- **State Machine Implementation**: Complex plant lifecycle management
- **Recursive Timeline Simulation**: Multi-year future prediction
- **Efficient Caching Systems**: Performance optimization for repeated calculations

### Error Handling & Edge Cases
- **Invalid State Protection**: Prevents corruption from invalid transitions
- **Timeline Validation**: Ensures prediction accuracy
- **Cache Invalidation**: Maintains data consistency
- **Graceful Degradation**: Fallback systems for edge cases

## 🎯 Design Philosophy

### Realism Meets Gameplay
The game balances botanical accuracy with engaging mechanics:
- **Authentic Plant Biology**: Real tea plant growth patterns and vulnerabilities
- **Seasonal Authenticity**: Weather patterns based on agricultural reality
- **Strategic Depth**: Complex systems reward planning and expertise
- **Accessibility**: Terminal interface keeps focus on mechanics over graphics

### Long-term Engagement
- **Multi-year Planning**: Timeline system encourages long-term thinking
- **Emergent Strategy**: Complex interactions create unique situations
- **Mastery Curve**: Deep systems reward continued learning
- **Replayability**: Seeded randomness creates varied experiences

This sophisticated design creates a unique gaming experience that combines the meditative nature of gardening with the strategic depth of resource management, all while maintaining scientific authenticity in its simulation of tea cultivation.