// @ts-ignore
import Lifx from 'node-lifx-lan';

type Color = {
  hue: number,
  saturation: number, 
  brightness: number,
  kelvin?: number
}

type Light = {
  label: string,
  location: {
    label: string
  },
  group: {
    label: string
  }
}

type LightState = Light & {
  color: Color,
  isOn: boolean
}

export function getLights(): Promise<Light[]> {
  return Lifx.discover()
    .then((deviceList: any) => {
      return deviceList.map((device: any) => ({
        label: device.deviceInfo.label,
        location: {
          label: device.deviceInfo.location.label
        },
        group: {
          label: device.deviceInfo.group.label
        }
      }));
    });
}

export function getLightState(label: string): Promise<LightState> {
  return Lifx.discover()
    .then((deviceList: any) => {
      const device = deviceList.find((device: any) => device.deviceInfo.label === label);
      
      if (!device) {
        throw new Error(`No LIFX device found with label: ${label}`);
      }

      return device.getLightState()
        .then((state: any) => ({
          label: device.deviceInfo.label,
          location: {
            label: device.deviceInfo.location.label
          },
          group: {
            label: device.deviceInfo.group.label
          },
          color: {
            hue: state.color.hue,
            saturation: state.color.saturation,
            brightness: state.color.brightness,
            kelvin: state.color.kelvin
          },
          isOn: state.power === 1
        }));
    });
}

export function setColorForLight(label: string, color: Color, duration: number = 0): Promise<void> {
  return Lifx.discover()
    .then((deviceList: any) => {
      const device = deviceList.find((device: any) => device.deviceInfo.label === label);
      
      if (!device) {
        throw new Error(`No LIFX device found with label: ${label}`);
      }

      return device.setColor({
        color,
        duration,
      });
    })
}

export function turnOnLight(label: string, color: Color | undefined, duration = 0): Promise<void> {
  return Lifx.discover()
    .then((deviceList: any) => {
      const device = deviceList.find((device: any) => device.deviceInfo.label === label);
      
      if (!device) {
        throw new Error(`No LIFX device found with label: ${label}`);
      }

      return device.turnOn(color, duration);
    })
}


export function turnOff(label: string, duration = 0): Promise<void> {
  return Lifx.discover()
    .then((deviceList: any) => {
      const device = deviceList.find((device: any) => device.deviceInfo.label === label);
      
      if (!device) {
        throw new Error(`No LIFX device found with label: ${label}`);
      }

      return device.turnOff(duration);
    })
}