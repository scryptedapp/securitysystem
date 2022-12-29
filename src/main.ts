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
    this.removeListeners();
    monitoredDeviceIds.forEach((deviceId) => {
      const device = systemManager.getDeviceById(deviceId);
      device.interfaces.forEach((intf) => {
        if (supportedInterfaces.includes(intf as ScryptedInterface)) {
          this.listeners.push(device.listen({event: intf}, (eventSource: ScryptedDevice | undefined, eventDetails: EventDetails, eventData: any) => {
            if (!!eventData) {
              this.console.log(`[${new Date()}] Alarm triggered by ${eventDetails.eventInterface}=${eventData} on '${eventSource?.name}'`)
              this.trigger(eventSource, eventDetails, eventData);
            } else {
              this.console.log(`[${new Date()}] Alarm detected ${eventDetails.eventInterface}=${eventData} on '${eventSource?.name}'`)
            }
          }));
        }
      })
    });

    // Enable system
    this.securitySystemState = Object.assign(this.securitySystemState, {
      mode: mode,
    })

    this.console.log(`[${new Date()}] System ${this.securitySystemState.mode}. Monitoring ${monitoredDeviceIds.length} devices.`)
    this.notifyDevices(this.securitySystemState.mode.replace(/([A-Z])/g, ' $1').trim(), `Monitoring ${monitoredDeviceIds.length} devices.`)
  }
  
  async disarmSecuritySystem(): Promise<void> {
    // Reset system to not triggered and disarmed
    this.securitySystemState = Object.assign(this.securitySystemState, {
      mode: SecuritySystemMode.Disarmed,
      triggered: false,
    })

    this.removeListeners()
    this.console.log(`[${new Date()}] System ${SecuritySystemMode.Disarmed}`)
    this.notifyDevices("Disarmed", "System Disarmed")
  }

  async removeListeners(): Promise<void> {
    // Remove all event listeners
    this.listeners.forEach((listener) => {
      listener.removeListener();
    })
    this.listeners = [];
  }

  async trigger(eventSource: ScryptedDevice | undefined, eventDetails: EventDetails, eventData: any): Promise<void> {
    this.securitySystemState = Object.assign(this.securitySystemState, {
      triggered: true,
    });

    this.notifyDevices(
      eventSource?.name,
      `${eventDetails.eventInterface?.replace(/([A-Z])/g, ' $1').trim()} detected ${eventDetails.property.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`,
    )
  }

  async notifyDevices(subtitle: string, body: string): Promise<void> {
    const devices = this.storage.getItem("push_notify").split(",");
    devices.forEach((deviceId) => {
      const device = systemManager.getDeviceById(deviceId);
      device.sendNotification("Security System", {subtitle, body});
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
        deviceFilter: `interfaces.some(r => '${supportedInterfaces}'.includes(r))`
      },
      {
        title: "Away Mode Devices",
        description: "Devices that will trigger the alarm in 'away' mode.",
        value: this.storage.getItem("away_devices") ? this.storage.getItem("away_devices").split(",") : "",
        key: "away_devices",
        type: "device",
        multiple: true,
        deviceFilter: `interfaces.some(r => '${supportedInterfaces}'.includes(r))`
      },
      {
        title: "Night Mode Devices",
        description: "Devices that will trigger the alarm in 'night' mode.",
        value: this.storage.getItem("night_devices") ? this.storage.getItem("night_devices").split(",") : "",
        key: "night_devices",
        type: "device",
        multiple: true,
        deviceFilter: `interfaces.some(r => '${supportedInterfaces}'.includes(r))`
      },
      {
        title: "Push Notification Devices",
        description: "Devices that will recieve a push notification.",
        value: this.storage.getItem("push_notify") ? this.storage.getItem("push_notify").split(",") : "",
        key: "push_notify",
        type: "device",
        multiple: true,
        deviceFilter: `deviceFilter: interfaces.includes('${ScryptedInterface.Notifier}') && type === '${ScryptedDeviceType.Notifier}`
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
