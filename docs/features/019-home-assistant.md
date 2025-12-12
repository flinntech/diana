# 019: Home Assistant Integration

**Phase**: 5 (Advanced Capabilities)
**Score**: 2.33
**Value**: 7 | **Effort**: 3

## Overview

Integrate with Home Assistant for smart home control. Environmental awareness and control through DIANA.

## Dependencies

- 004-agent-mcp-foundation
- Home Assistant instance (user provides)

## Enables

- "Turn off the lights"
- "What's the temperature?"
- "Set the thermostat to 72"
- Scene and automation control

---

## speckit.specify Prompt

```
Home Assistant Integration for DIANA

Connect to Home Assistant for smart home control:

1. Entity Access
   - List available entities (lights, switches, sensors, etc.)
   - Get entity state (on/off, temperature, etc.)
   - Filter by domain, area, or label

2. Control Operations
   - Turn on/off devices
   - Set values (brightness, temperature, etc.)
   - Trigger scenes
   - Run automations

3. Tool Interface
   - ha_list_entities: Get available entities
   - ha_get_state: Get entity state
   - ha_turn_on: Turn on entity
   - ha_turn_off: Turn off entity
   - ha_set_value: Set entity attribute
   - ha_run_scene: Activate scene

4. Authentication
   - Long-lived access token in config
   - Secure token storage
   - Connection to HA API (REST)

Constraints:
- Human-in-the-loop for control actions (optional, configurable)
- Local network: HA runs locally
- Graceful degradation if HA unavailable
- No cloud: Direct local API connection
```

---

## speckit.plan Prompt

```
Create implementation plan for Home Assistant Integration

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- HA API: REST API with long-lived access token
- Existing: Config system, agent pattern

Research needed:
- Home Assistant REST API documentation
- Entity domain types and capabilities
- Service call patterns
- WebSocket API for real-time (optional)

Key deliverables:
1. src/agents/home/index.ts - Agent implementation
2. src/agents/home/api.ts - HA REST API client
3. src/agents/home/entities.ts - Entity management
4. src/agents/home/tools.ts - Tool definitions
5. Config additions for HA URL and token
6. Tests with mocked HA responses
```
