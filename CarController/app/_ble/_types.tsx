export interface ScanResult {
  id: string;
  name?: string | null;
  rssi?: number | null;
}

export interface IBluetoothAdapter {
  isAvailable(): Promise<boolean>;
  scan(onDevice: (d: ScanResult) => void, options?: { serviceUUIDs?: string[] }): Promise<void>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<void>;
  write(
    serviceUUID: string,
    characteristicUUID: string,
    data: Uint8Array
  ): Promise<void>;
  disconnect(): Promise<void>;
}