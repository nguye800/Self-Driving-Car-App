import { IBluetoothAdapter, ScanResult } from './_types';

export class WebBluetoothAdapter implements IBluetoothAdapter {
  private device?: BluetoothDevice;
  private server?: BluetoothRemoteGATTServer;

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
    const server = await this.device.gatt!.connect();
    this.server = server;
  }

  async write(serviceUUID: string, characteristicUUID: string, data: Uint8Array) {
    if (!this.server) throw new Error('Not connected');
    const svc = await this.server.getPrimaryService(serviceUUID);
    const ch = await svc.getCharacteristic(characteristicUUID);
    await ch.writeValue(data);
  }

  async disconnect() {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
  }
}
