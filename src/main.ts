import sdk, { Device, DeviceInformation, ScryptedDeviceBase, ScryptedDeviceType, Settings, Setting, ScryptedInterface, SecuritySystem, SecuritySystemMode, SecuritySystemObstruction, SecuritySystemState, EventListenerOptions, EventListenerRegister, ScryptedDevice, EventDetails, EventListener } from '@scrypted/sdk';
const { deviceManager, systemManager, log } = sdk;

const supportedInterfaces = [
  ScryptedInterface.EntrySensor,
  ScryptedInterface.BinarySensor,
  ScryptedInterface.MotionSensor,
  ScryptedInterface.IntrusionSensor
]

class SecuritySystemController extends ScryptedDeviceBase implements SecuritySystem, Settings {
  listeners: Array<EventListenerRegister>

  constructor() {
    super()
    this.securitySystemState = {
      mode: SecuritySystemMode.Disarmed,
      triggered: false,
      supportedModes: this.getSupportedModes(),
    }
    this.listeners = [];
  }

  getSupportedModes(): Array<SecuritySystemMode> {
    let modes = [SecuritySystemMode.Disarmed];

    if (this.storage.getItem("home_devices") && this.storage.getItem("home_devices").length > 0) modes.push(SecuritySystemMode.HomeArmed)
    if (this.storage.getItem("away_devices") && this.storage.getItem("away_devices").length > 0) modes.push(SecuritySystemMode.AwayArmed)
    if (this.storage.getItem("night_devices") && this.storage.getItem("night_devices").length > 0) modes.push(SecuritySystemMode.NightArmed)

    return modes;
  }

  async armSecuritySystem(mode: SecuritySystemMode): Promise<void> {
    /* example: if doors aren't closed
    if (obstructed) {
      this.securitySystemState = Object.assign(this.securitySystemState, {
        obstruction: SecuritySystemObstruction.Error,
      })
    }
    */
    // Different sets of monitored devices in home/away/night
    let monitoredDeviceIds = []
    switch(mode) {
      case SecuritySystemMode.HomeArmed:
        monitoredDeviceIds = this.storage.getItem("home_devices").split(",");
        break;
      case SecuritySystemMode.AwayArmed:
        monitoredDeviceIds = this.storage.getItem("away_devices").split(",");
        break;
      case SecuritySystemMode.NightArmed:
        monitoredDeviceIds = this.storage.getItem("night_devices").split(",");
        break;
      default:
        return;
    }

    // Establish listeners for supported interfaces on monitored devices
    monitoredDeviceIds.forEach((deviceId) => {
      const device = systemManager.getDeviceById(deviceId);
      device.interfaces.forEach((intf) => {
        if (supportedInterfaces.includes(intf as ScryptedInterface)) {
          this.listeners.push(device.listen({event: intf}, (eventSource: ScryptedDevice | undefined, eventDetails: EventDetails, eventData: any) => {
            this.console.log("Heard event");
            this.console.log(eventSource, eventDetails, eventData);
            this.trigger(true)
          }));
        }
      })
    });

    // Enable system
    this.securitySystemState = Object.assign(this.securitySystemState, {
      mode: mode,
    })
  }
  
  async disarmSecuritySystem(): Promise<void> {
    // Remove all event listeners
    this.listeners.forEach((listener) => {
      listener.removeListener();
    })
    this.listeners = [];

    // Reset system to not triggered and disarmed
    this.trigger(false);
    this.securitySystemState = Object.assign(this.securitySystemState, {
      mode: SecuritySystemMode.Disarmed,
    })
  }

  async trigger(triggered: boolean): Promise<void> {
    this.securitySystemState = Object.assign(this.securitySystemState, {
      triggered
    })
  }

  async getSettings(): Promise<Setting[]> {
    return [
      {
        title: "Home Mode Devices",
        description: "Devices that will trigger the alarm in 'home' mode.",
        value: this.storage.getItem("home_devices") ? this.storage.getItem("home_devices").split(",") : "",
        key: "home_devices",
        type: "device",
        multiple: true,
        deviceFilter: `type === '${ScryptedDeviceType.Sensor}'`
      },
      {
        title: "Away Mode Devices",
        description: "Devices that will trigger the alarm in 'away' mode.",
        value: this.storage.getItem("away_devices") ? this.storage.getItem("away_devices").split(",") : "",
        key: "away_devices",
        type: "device",
        multiple: true,
        deviceFilter: `type === '${ScryptedDeviceType.Sensor}'`
      },
      {
        title: "Night Mode Devices",
        description: "Devices that will trigger the alarm in 'night' mode.",
        value: this.storage.getItem("night_devices") ? this.storage.getItem("night_devices").split(",") : "",
        key: "night_devices",
        type: "device",
        multiple: true,
        deviceFilter: `type === '${ScryptedDeviceType.Sensor}'`
      }
    ]
  }

  async putSetting(key: string, value: string): Promise<void> {
    if (key.includes("_devices")) {
      this.securitySystemState = Object.assign(this.securitySystemState, {
        supportedModes: this.getSupportedModes(),
      })
      this.console.log(`Updated supported modes`);
    }
    this.storage.setItem(key, value.toString());
  }

}

export default new SecuritySystemController();
