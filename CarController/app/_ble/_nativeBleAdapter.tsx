import { BleManager, Device } from 'react-native-ble-plx';
import { IBluetoothAdapter, ScanResult } from './_types';
import { Platform } from 'react-native';

// Define UUIDs here 
const PI_PING_SERVICE_UUID = "b07498ca-ad5b-474e-940d-16f1a71141e0";
const PI_PING_CHAR_UUID = "c1ff12bb-3ed8-46e5-b4f9-a6ca6092d345";
const APP_PONG_CHAR_UUID = "d7add780-b042-4876-aae1-112855353cc1";

export class NativeBleAdapter implements IBluetoothAdapter {
  private manager = new BleManager();
  private connected?: Device;
  private scanning = false;

  async isAvailable() {
    // If we’re on native platforms, assume BLE stack exists.
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  async scan(onDevice: (d: ScanResult) => void, options?: { serviceUUIDs?: string[] }) {
    if (this.scanning) return;
    this.scanning = true;
    this.manager.startDeviceScan(options?.serviceUUIDs ?? null, null, (error, device) => {
      if (error) {
        console.warn('BLE scan error:', error);
        this.scanning = false;
        return;
      }
      if (device) {
        onDevice({ id: device.id, name: device.name, rssi: device.rssi });
      }
    });
  }

  async stopScan() {
    if (!this.scanning) return;
    this.manager.stopDeviceScan();
    this.scanning = false;
  }

  async connect(deviceId: string) {
    const dev = await this.manager.connectToDevice(deviceId, { timeout: 10000 });
    this.connected = await dev.discoverAllServicesAndCharacteristics();
  }

  async write(serviceUUID: string, characteristicUUID: string, data: ArrayBuffer) {
    if (!this.connected) throw new Error('Not connected');
    const base64 = Buffer.from(data).toString('base64'); // polyfill via 'buffer' if needed
    await this.connected.writeCharacteristicWithResponseForService(serviceUUID, characteristicUUID, base64);
  }

  async subscribe(serviceUUID: string, characteristicUUID: string, onData: (data: DataView) => void) {  }

  async unsubscribe(serviceUUID: string, characteristicUUID: string) {  } 

  async disconnect() {
    if (this.connected) {
      await this.manager.cancelDeviceConnection(this.connected.id);
      this.connected = undefined;
    }
  }
}
