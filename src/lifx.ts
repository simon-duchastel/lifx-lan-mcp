// @ts-ignore
import { Color, Light, LightState } from './types.js';
import { discoverAndCacheDevices, getOrDiscoverDevice } from './cache.js';

export async function getLights(): Promise<Light[]> {
  const deviceList = await discoverAndCacheDevices();
  return deviceList.map((device: any) => ({
    label: device.deviceInfo.label,
    location: {
      label: device.deviceInfo.location.label
    },
    group: {
      label: device.deviceInfo.group.label
    }
  }));
}

export async function getLightState(label: string): Promise<LightState> {
  const device = await getOrDiscoverDevice(label);
  const state = await device.getLightState();
  
  return {
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
  };
}

export async function setColorForLight(label: string, color: Color, duration: number = 0): Promise<void> {
  const device = await getOrDiscoverDevice(label);
  return device.setColor({
    color,
    duration,
  });
}

export async function turnOnLight(label: string, color: Color | undefined, duration = 0): Promise<void> {
  const device = await getOrDiscoverDevice(label);
  return device.turnOn(color, duration);
}

export async function turnOff(label: string, duration = 0): Promise<void> {
  const device = await getOrDiscoverDevice(label);
  return device.turnOff(duration);
}