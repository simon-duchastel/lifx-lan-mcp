export type Color = {
  hue: number;
  saturation: number;
  brightness: number;
  kelvin?: number;
}

export type Light = {
  label: string;
  location: {
    label: string;
  };
  group: {
    label: string;
  };
}

export type LightState = Light & {
  color: Color;
  isOn: boolean;
}

export type DeviceAddress = {
  mac: string;
  ip: string;
  lastUpdated: number;
}

export type DeviceCache = {
  [label: string]: DeviceAddress;
} 