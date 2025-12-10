import { Platform } from 'react-native';
import { IBluetoothAdapter, ScanResult } from './_types';
import { WebBluetoothAdapter } from './_webBluetoothAdapter';
import { NativeBleAdapter } from './_nativeBleAdapter';

// --- Define All UUIDs and Payloads in ONE place ---
const SERVICE_UUID = 'b07498ca-ad5b-474e-940d-16f1a71141e0';
const PING_CHAR_UUID    = 'c1ff12bb-3ed8-46e5-b4f9-a6ca6092d345';
const PONG_CHAR_UUID    = 'd7add780-b042-4876-aae1-112855353cc1';
const COMMAND_CHAR_UUID = 'e2f3c4d5-6789-4abc-def0-1234567890ab';
const DATA_CHAR_UUID    = 'f1e2d3c4-b5a6-4789-8abc-0def12345678';

const commandEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const PONG_PAYLOAD = commandEncoder.encode('PONG').buffer;
// Export this so ControlScreen can import it
export const CALL_ROBOT_PAYLOAD = commandEncoder.encode('MANUAL');
export const AUTO_ROBOT_PAYLOAD = commandEncoder.encode('START');
// Your previous code used a byte [0x02], but your new spec says the *string* 'MANUAL'.
// We will use the string.

// Define the shape of the state we will share
export interface BluetoothState {
  status: string;
  error: string | null;
  piData: string | null; // This will hold 'MANUAL' or the JSON string
}

type StateListener = (state: BluetoothState) => void;

class BluetoothService {
  private adapter: IBluetoothAdapter;
  private listeners: StateListener[] = [];
  
  // This is the single source of truth for our state
  private state: BluetoothState = {
    status: 'Disconnected',
    error: null,
    piData: null,
  };

  constructor() {
    console.log("Initializing BluetoothService (Singleton)...");
    // Create the SINGLE adapter instance
    if (Platform.OS === 'web') {
      this.adapter = new WebBluetoothAdapter();
    } else {
      this.adapter = new NativeBleAdapter();
    }
  }

  // --- Internal State Management ---
  private setState(newState: Partial<BluetoothState>) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  // --- Public API for React Components ---
  public subscribe(listener: StateListener) {
    this.listeners.push(listener);
    listener(this.state); // Immediately send current state
  }

  public unsubscribe(listener: StateListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // --- Internal BLE Handlers ---
  private async handlePing(data: DataView) {
    // RTT Ping-Pong
    try {
      await this.adapter.write(SERVICE_UUID, PONG_CHAR_UUID, PONG_PAYLOAD, true);
    } catch (err: any) {
      this.setState({ error: `Failed to send PONG: ${err.message}` });
    }
  }

  private handleDataUpdate(data: DataView) {
    // Pi -> App ('MANUAL' or JSON)
    const message = textDecoder.decode(data);
    console.log('Received data from Pi:', message);
    
    // We just pass the raw string up. The UI can decide what to do.
    this.setState({ piData: message });
  }

  // --- Public BLE Functions (Called by Screens) ---
  public async connect() {
    this.setState({ error: null, piData: null, status: 'Scanning...' });
    try {
      const scanOptions =
        Platform.OS === 'web'
          ? {
              // Web Bluetooth requires the service UUID here even if we accept all devices,
              // otherwise the origin is blocked from accessing the service later.
              serviceUUIDs: [SERVICE_UUID],
              acceptAllDevices: true,
            }
          : {
              // Native scan should surface all nearby advertisements.
              acceptAllDevices: true,
            };

      await this.adapter.scan(
        (device: ScanResult) => {
          this.setState({ status: `Device found: ${device.name || device.id}` });
        },
        scanOptions
      );
      
      this.setState({ status: 'Connecting...' });
      await this.adapter.connect(''); 
      
      this.setState({ status: 'Connected. Subscribing...' });
      // Bind handlers to `this` instance
      await this.adapter.subscribe(SERVICE_UUID, PING_CHAR_UUID, this.handlePing.bind(this));
      await this.adapter.subscribe(SERVICE_UUID, DATA_CHAR_UUID, this.handleDataUpdate.bind(this));

      this.setState({ status: 'Subscribed! RTT loop active.' });
    } catch (err: any) {
      console.error(err);
      this.setState({ status: 'Failed to connect', error: err.message });
    }
  }

  public async disconnect() {
    try {
      await this.adapter.unsubscribe(SERVICE_UUID, PING_CHAR_UUID);
      await this.adapter.unsubscribe(SERVICE_UUID, DATA_CHAR_UUID);
      await this.adapter.disconnect();
      this.setState({ status: 'Disconnected', error: null, piData: null });
    } catch (err: any) {
      this.setState({ error: err.message });
    }
  }
  public async sendAutoCommand() {
    this.setState({ error: null });
    if (!this.state.status.includes('Subscribed')) return;
    try {
      await this.adapter.write(SERVICE_UUID, COMMAND_CHAR_UUID, AUTO_ROBOT_PAYLOAD.buffer, false);
    } catch (err: any) {
      this.setState({ error: `Cmd Error: ${err.message}` });
    }
  }
  public async sendManualCommand() {
    // App -> Pi ('MANUAL')
    this.setState({ error: null });
    if (!this.state.status.includes('Subscribed')) {
      this.setState({ error: "Not connected. Cannot send command." });
      return;
    }
    try {
      console.log("Sending 'MANUAL' command...");
      await this.adapter.write(SERVICE_UUID, COMMAND_CHAR_UUID, CALL_ROBOT_PAYLOAD.buffer, false);
      console.log("'MANUAL' command sent.");
    } catch (err: any) {
      this.setState({ error: `Failed to send 'MANUAL' command: ${err.message}` });
    }
  }
  public async sendJsonCommand(data: object) {
    if (!this.state.status.includes('Subscribed')) return;
    try {
      const jsonString = JSON.stringify(data);
      const payload = commandEncoder.encode(jsonString).buffer;
      // 'false' for responseRequired usually speeds up high-frequency writes like joysticks
      await this.adapter.write(SERVICE_UUID, COMMAND_CHAR_UUID, payload, false);
    } catch (err: any) {
      // Don't flood the UI with errors for joystick packets, just log it
      console.warn("Joystick Send Error:", err.message);
    }
  }
}

// --- Create and export the SINGLE instance ---
export const btService = new BluetoothService();
