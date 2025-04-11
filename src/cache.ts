// @ts-ignore
import Lifx from 'node-lifx-lan';
import { DeviceCache } from './types.js';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
let deviceCache: DeviceCache = {};

export async function discoverAndCacheDevices(): Promise<any[]> {
  const deviceList = await Lifx.discover();
  const now = Date.now();

  // Update cache with all discovered devices
  deviceList.forEach((device: any) => {
    deviceCache[device.deviceInfo.label] = {
      mac: device.mac,
      ip: device.ip,
      lastUpdated: now
    };
  });

  return deviceList;
}

export async function getOrDiscoverDevice(label: string): Promise<any> {
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