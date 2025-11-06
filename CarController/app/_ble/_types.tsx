export interface ScanResult {
  id: string;
  name?: string | null;
  rssi?: number | null;
}

export interface IBluetoothAdapter {
  isAvailable(): Promise<boolean>;
  scan(onDevice: (d: ScanResult) => void, options?: { serviceUUIDs?: string[], acceptAllDevices?: boolean }): Promise<void>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<void>;
  write(
    serviceUUID: string,
    characteristicUUID: string,
    data: ArrayBuffer,
    withoutResponse?: boolean
  ): Promise<void>;
  subscribe(
    serviceUUID: string,
    characteristicUUID: string,
    onData: (data: DataView) => void
  ): Promise<void>;
  unsubscribe(
    serviceUUID: string,
    characteristicUUID: string
  ): Promise<void>;
  disconnect(): Promise<void>;
}