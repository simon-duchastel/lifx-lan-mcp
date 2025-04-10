// @ts-ignore
import Lifx from 'node-lifx-lan';

type DeviceAddress = {
  mac: string;
  ip: string;
  lastUpdated: number;
}

type DeviceCache = {
  [label: string]: DeviceAddress;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
let deviceCache: DeviceCache = {};

async function discoverAndCacheDevices(): Promise<any[]> {
  const deviceList = await Lifx.discover();
  const now = Date.now();

  // Update cache with all discovered devices
  deviceList.forEach((device: any) => {
    deviceCache[device.deviceInfo.label] = {
      mac: device.deviceInfo.mac,
      ip: device.deviceInfo.address,
      lastUpdated: now
    };
  });

  return deviceList;
}

async function getOrDiscoverDevice(label: string): Promise<any> {
  const cachedDevice = deviceCache[label];
  const now = Date.now();

  if (cachedDevice && (now - cachedDevice.lastUpdated) < CACHE_DURATION) {
    return Lifx.createDevice({
      mac: cachedDevice.mac,
      ip: cachedDevice.ip
    });
  }

  // Cache miss or expired, perform discovery
  const deviceList = await discoverAndCacheDevices();
  const device = deviceList.find((device: any) => device.deviceInfo.label === label);
  
  if (!device) {
    throw new Error(`No LIFX device found with label: ${label}`);
  }

  return device;
}

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