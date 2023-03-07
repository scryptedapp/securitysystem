# HomeKit Security System for Scrypted

Monitor sensors in [Scrypted](https://github.com/koush/scrypted) and trigger a security alarm in HomeKit.

## Getting Started
1. Install the Security System plugin to Scrypted
2. In *Settings/General* select devices that should be included for each system mode (see below for details on modes).
3. Select *HomeKit* and/or *Alexa* in *Integrations and Extensions* to publish the system in the Home app.
3. In HomeKit or Alexa, set the security system mode. Any sensors selected for that mode will be monitored and trigger an alarm when opened.

## System modes
- **Disarmed** No sensors are monitored, alarm cannot be triggered.
- **Home** 'Home Mode Devices' are monitored. *Suggestion:* use this when you are home, and just want to monitor door/window sensors
- **Away** 'Away Mode Devices' are monitored. *Suggestion:* use this mode when you're not home. Include motion sensors as well as door/window sensors.
- **Night** 'Night Mode Devices' are monitored. *Suggestion:* use this mode when at night. Include door/window sensors, and motion sensors outside of the bedroom.

## Disarm A Triggered Alarm
When the alarm is triggered, just set the mode to *Disarmed* to clear the alarm

## Supported Devices
Monitored devices must implement one or more of the following interfaces to be monitored:
- EntrySensor
- BinarySensor
- MotionSensor
- TamperSensor

---

---

## Possible upcoming features
- Indicate which device triggered the alarm (currently available in the console)
- Select whether sensors should be monitored for 'open' state only, or if any change should trigger the alarm (i.e. a door closing).
- Select a Siren or other notification device in Scrypted to trigger when the alarm is triggered
- Use a button device in Scrypted to set or un-set the alarm
- Set a timer for each system mode. *Example: Don't trigger the alarm 30 seconds after away mode is set*

Have a feature suggestion? [Join the Scrypted Discord](https://discord.gg/DcFzmBHYGq) and suggest it in the #securitysystem room.