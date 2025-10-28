import { IBluetoothAdapter, ScanResult } from './_types';

// Define UUIDs here 
const PI_PING_SERVICE_UUID = "b07498ca-ad5b-474e-940d-16f1a71141e0";
const PI_PING_CHAR_UUID = "c1ff12bb-3ed8-46e5-b4f9-a6ca6092d345";
const APP_PONG_CHAR_UUID = "d7add780-b042-4876-aae1-112855353cc1";


export class WebBluetoothAdapter implements IBluetoothAdapter {
  private device?: BluetoothDevice;
  private server?: BluetoothRemoteGATTServer;

  private listeners = new Map<string, (event: Event) => void>();

  async isAvailable() {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth;
  }

  async scan(onDevice: (d: ScanResult) => void, options?: { serviceUUIDs?: string[] }) {
    // Web Bluetooth doesn't do passive scans; it shows a chooser.
    const filters = (options?.serviceUUIDs ?? []).map(u => ({ services: [u] }));
    // If no filters, use acceptAllDevices to show everything (Chrome requires one or the other)
    const device = await navigator.bluetooth.requestDevice(
      filters.length ? { filters } : { acceptAllDevices: true, optionalServices: options?.serviceUUIDs }
    );
    onDevice({ id: device.id, name: device.name ?? null });
    this.device = device;
  }

  async stopScan() {
    // No-op for Web Bluetooth (chooser is user-driven)
  }

  async connect(_: string) {
    if (!this.device) throw new Error('No device selected yet (call scan first)');
    
    this.device.addEventListener('gattserverdisconnected', () => {
      this.listeners.clear();
      this.server = undefined;
    });

    const server = await this.device.gatt!.connect();
    this.server = server;
  }

  async write(serviceUUID: string, characteristicUUID: string, data: ArrayBuffer, withoutResponse: boolean = false) {
    if (!this.server) throw new Error('Not connected');
    const svc = await this.server.getPrimaryService(serviceUUID);
    const ch = await svc.getCharacteristic(characteristicUUID);
    if (withoutResponse) {
      await ch.writeValueWithoutResponse(data);
    } else {
      await ch.writeValue(data);
    }
  }

  async subscribe(serviceUUID: string, characteristicUUID: string, onData: (data: DataView) => void) {
    if (!this.server) throw new Error('Not connected');

    const svc = await this.server.getPrimaryService(serviceUUID);
    const ch = await svc.getCharacteristic(characteristicUUID);
  
    const handler = (event: Event) => {
      const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
      if (value) {
        onData(value); // Pass the raw DataView to the callback
      }
    };

    //store the handler so we can remove it later
    const key = `${serviceUUID}/${characteristicUUID}`;
    this.listeners.set(key, handler);

    await ch.startNotifications();
    ch.addEventListener('characteristicvaluechanged', handler);
  }

  async unsubscribe(serviceUUID: string, characteristicUUID: string) {
    if (!this.server) return; // not connected, nothing to do

    try {
      const svc = await this.server.getPrimaryService(serviceUUID);
      const ch = await svc.getCharacteristic(characteristicUUID);
      
      const key = `${serviceUUID}/${characteristicUUID}`;
      const handler = this.listeners.get(key);

      if (handler) {
        await ch.stopNotifications();
        ch.removeEventListener('characteristicvaluechanged', handler);
        //remove from our map
        this.listeners.delete(key);
      }
    } catch (err) {
      console.error(`Error unsubscribing: ${err}`);
    }
  }

  async disconnect() {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
  }
}
