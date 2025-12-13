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
