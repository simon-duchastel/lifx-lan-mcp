// @ts-ignore
import Lifx from 'node-lifx-lan';

export function setColorForLight(label: string): Promise<any> {
  return Lifx.discover().then((deviceList: any) => {
    var toReturn: any;
    deviceList.forEach((device: any) => {
      console.log(JSON.stringify(device.deviceInfo.label));
      if (device.deviceInfo.label === label) {
        // toReturn = device.getLightState();
        toReturn = device.setColor({
          color: {
            hue: 0.00092,
            saturation: 0,
            brightness: 1,
            kelvin: 3200,
          },
        });
      }
    });
    return toReturn;
  }).then((res: any) => {
    console.log('Done! ' + JSON.stringify(res));
  }).catch((error: Error) => {
    console.error(error);
  });
}
