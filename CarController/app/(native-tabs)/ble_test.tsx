import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IBluetoothAdapter, ScanResult } from '../_ble/_types';
import { WebBluetoothAdapter } from '../_ble/_webBluetoothAdapter';

// --- UUIDs (must match Pi server) ---
const PI_PING_SERVICE_UUID = "b07498ca-ad5b-474e-940d-16f1a71141e0";
const PI_PING_CHAR_UUID = "c1ff12bb-3ed8-46e5-b4f9-a6ca6092d345";
const APP_PONG_CHAR_UUID = "d7add780-b042-4876-aae1-112855353cc1";

// --- PONG payload (pre-encode for speed) ---
const PONG_PAYLOAD = new TextEncoder().encode('PONG').buffer;

export const PiPingerView: React.FC = () => {
  // Instantiate your adapter
  // If you use React Context, you can get this from context instead.
  const adapter = useMemo(() => new WebBluetoothAdapter(), []);

  const [status, setStatus] = useState('Disconnected');
  const [error, setError] = useState<string | null>(null);
  
  // Keep track of the device ID from the scan
  const deviceIdRef = useRef<string | null>(null);

  /**
   * This is the PING listener.
   * It's called by the adapter's `subscribe` method.
   */
  const handlePing = async (data: DataView) => {
    // We don't even need to decode the data, just PONG back
    // console.log('Received PING from Pi, sending PONG');
    try {
      await adapter.write(
        PI_PING_SERVICE_UUID,
        APP_PONG_CHAR_UUID,
        PONG_PAYLOAD,
        true // Use `withoutResponse` for the fastest possible reply
      );
    } catch (err: any) {
      setError(`Failed to send PONG: ${err.message}`);
    }
  };

  const handleConnect = async () => {
    setError(null);
    setStatus('Scanning...');
    try {
      // 1. Scan
      await adapter.scan(
        (device: ScanResult) => {
          // In Web BT, scan returns the chosen device
          deviceIdRef.current = device.id;
          setStatus(`Device found: ${device.name || device.id}`);
        },
        { serviceUUIDs: [PI_PING_SERVICE_UUID], acceptAllDevices: true }
      );

      if (!deviceIdRef.current) {
        throw new Error('No device was selected from the chooser.');
      }

      // 2. Connect
      setStatus('Connecting...');
      await adapter.connect(deviceIdRef.current);
      setStatus('Connected. Subscribing...');

      // 3. Subscribe
      await adapter.subscribe(
        PI_PING_SERVICE_UUID,
        PI_PING_CHAR_UUID,
        handlePing // Pass our PING handler as the callback
      );

      setStatus('Subscribed! Listening for PINGs.');
      
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setStatus('Failed to connect');
    }
  };

  const handleDisconnect = async () => {
    try {
      // Unsubscribe isn't strictly needed if disconnect cleans up,
      // but it's good practice.
      await adapter.unsubscribe(PI_PING_SERVICE_UUID, PI_PING_CHAR_UUID);
      await adapter.disconnect();
      setStatus('Disconnected');
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    // This returns the disconnect function,
    // which React will call when the component unmounts.
    return () => {
      adapter.disconnect();
    };
  }, [adapter]);


  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      <h2>Pi-Initiated Latency Tester</h2>
      <p>
        Status: <strong>{status}</strong>
      </p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      {status.startsWith('Subscribed') || status.startsWith('Connected') ? (
         <button onClick={handleDisconnect}>Disconnect</button>
      ) : (
         <button onClick={handleConnect} disabled={status === 'Scanning...'}>
           Connect to Pi
         </button>
      )}

      {status.startsWith('Subscribed') && (
        <p style={{ marginTop: '20px' }}>
          <strong>The Pi is now in control.</strong>
          <br />
          Check your Raspberry Pi's terminal to see the latency measurements.
        </p>
      )}
    </div>
  );
};

export default PiPingerView;
