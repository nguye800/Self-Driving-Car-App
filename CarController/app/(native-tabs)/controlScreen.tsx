// src/screens/ControlScreen.tsx
// import React, { useState } from 'react';
// import { FlatList, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { NativeBleAdapter } from '../_ble/_nativeBleAdapter';
// import { IBluetoothAdapter } from '../_ble/_types';
// import { WebBluetoothAdapter } from '../_ble/_webBluetoothAdapter';
// import Joystick from "../components/joystick";

import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// 1. Import the service, payload, and state type
import { btService, BluetoothState } from '../_ble/BluetoothService';
import Joystick from "../components/joystick"; 

// --- REMOVED: All adapter, platform, and UUID imports ---

// --- NEW: Define the props this component expects ---
interface Props {
  callRobot: () => void;
  onJoystickMove: (x: number, y: number) => void;
  onJoystickRelease?: () => void;
}

export default function ControlScreen(props: Props) {
  // 2. Create local state, just for the status
  const [status, setStatus] = useState('Loading...');
  const [currentMode, setCurrentMode] = useState<string>('MANUAL'); // Default to Manual


  const lastSentRef = React.useRef<number>(0);
  const SEND_INTERVAL_MS = 100; // Minimum interval between sends

  // 3. Subscribe to the service on mount
  useEffect(() => {
    const listener = (newState: BluetoothState) => {
      setStatus(newState.status);
      if (newState.piData?.startsWith('{')) {
        try {
          const data = JSON.parse(newState.piData);
          if (data.mode) {
            setCurrentMode(data.mode);
          }
        } catch (err) {
        } // Ignore JSON parse errors
      }
      else if(newState.piData === 'MANUAL') {
        setCurrentMode('MANUAL');
      }
    };
    btService.subscribe(listener);

    // 4. Unsubscribe on unmount
    return () => {
      btService.unsubscribe(listener);
    };
  }, []); // Empty array ensures this runs only once

  // 5. Derive connection status from the local synced state
  const isConnected = status.includes('Subscribed');

  const { callRobot, onJoystickMove, onJoystickRelease } = props;
  
  const handleAutoModePress = async () => {
    // 1. Call the original prop
    if (callRobot) callRobot();

    // 2. Call the service function to start self-driving
    if (isConnected) {
      await btService.sendAutoCommand();
    }
  };

  const handleManualModePress = async () => {
    // 1. Call the original prop
    if (callRobot) callRobot();

    // 2. Call the service function to send 'MANUAL'
    if (isConnected) {
      await btService.sendManualCommand();
    } else {
      console.warn("Not connected. Cannot send 'MANUAL' command.");
    }
  };

  const handleJoystickMove = (x: number, y: number) => {
    if (currentMode !== 'MANUAL') return;
    // 1. Always update local UI/Parents immediately
    if (onJoystickMove) onJoystickMove(x, y);

    // 2. Send to Pi (Throttled)
    const now = Date.now();
    if (isConnected && (now - lastSentRef.current > SEND_INTERVAL_MS)) {
      // Send JSON: { "x": 0.5, "y": -1.0 }
      // We invert Y here if your joystick considers 'up' as negative (common in web/canvas),
      // otherwise keep it as is. Usually Y needs inverting for "forward = positive".
      // Let's assume standard Cartesian for now.
      btService.sendJsonCommand({ x: x, y: y });
      
      lastSentRef.current = now;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.statusText}>
          Bluetooth: {isConnected ? "Connected" : status}
        </Text>
      </View>

      <View style={styles.modeIndicator}>
        <Text style={styles.modeLabel}>Current Mode:</Text>
        <Text style={[
          styles.modeValue, 
          currentMode === 'AUTO' ? styles.textRed : styles.textBlue
        ]}>
          {currentMode}
        </Text>
      </View>

      <View style={styles.topThird}>
        <TouchableOpacity 
          onPress={handleAutoModePress} 
          style={[styles.callButton, !isConnected && styles.callButtonDisabled]}
          disabled={!isConnected}
        >
          {/* This button now starts self-driving */}
          <Text style={styles.callButtonText}>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleManualModePress} 
          style={[styles.callButton, !isConnected && styles.callButtonDisabled]}
          disabled={!isConnected}
        >
          {/* This button now sends 'MANUAL' */}
          <Text style={styles.callButtonText}>Manual</Text>
        </TouchableOpacity>
        {!isConnected && (
          <Text style={styles.connectHelpText}>Go to the 'Connect' page first.</Text>
        )}
      </View>

      <View style={styles.joystickArea}>
        <Joystick
          size={220}
          knobSize={90}
          onMove={handleJoystickMove}
          onRelease={onJoystickRelease}
        />
      </View>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  header: { 
    height: 56, 
    justifyContent: "center", 
    alignItems: "center", 
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333"
  },
  statusText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  modeIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  modeLabel: { color: '#bbb', fontSize: 16, marginRight: 8 },
  modeValue: { fontSize: 18, fontWeight: 'bold' },
  textBlue: { color: '#60a5fa' },
  textRed: { color: '#f87171' },
  topThird: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  callButton: { 
    paddingVertical: 18, 
    paddingHorizontal: 28, 
    borderRadius: 16, 
    backgroundColor: "#2563eb",
    elevation: 2,
  },
  callButtonDisabled: { 
    backgroundColor: "#555" 
  },
  callButtonText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  connectHelpText: { color: "#9aa0a6", fontSize: 14, marginTop: 16, textAlign: 'center' },
  joystickArea: { flex: 2, justifyContent: "center", alignItems: "center" },
});

// let adapter: IBluetoothAdapter;

// const PI_SERVICE_UUID = "b07498ca-ad5b-474e-940d-16f1a71141e0";
// const COMMAND_CHAR_UUID = "e2f3c4d5-6789-4abc-def0-1234567890ab";
// const commandEncoder = new TextEncoder();

// export function getBluetoothAdapter(): IBluetoothAdapter {
//   if (!adapter) {
//     // Web build uses web adapter; native uses native adapter
//     if (Platform.OS === 'web') {
//       adapter = new WebBluetoothAdapter();
//     } else {
//       adapter = new NativeBleAdapter();
//     }
//   }
//   return adapter;
// }

// type Device = { id: string; name?: string | null };

// interface Props {
//   callRobot: () => void;
//   onJoystickMove: (x: number, y: number) => void;  // normalized -1..1
//   onJoystickRelease?: () => void;
// }

// export default function ControlScreen(props: Props) {
//   const bt = getBluetoothAdapter();
//   const [devices, setDevices] = useState<{id:string; name?:string|null}[]>([]);
//   const [connected, setConnected] = useState(false);
//   const { callRobot, onJoystickMove, onJoystickRelease } = props;

//   const renderDevice = ({ item }: { item: Device }) => (
//     <TouchableOpacity onPress={() => connect(item.id)} style={styles.deviceRow}>
//       <Text style={styles.deviceName}>{item.name || "Unknown"}</Text>
//       <Text style={styles.deviceId}>{item.id}</Text>
//     </TouchableOpacity>
//   );

//   const startScan = async () => {
//     setDevices([]);
//     await bt.scan(d => {
//       setDevices(prev => {
//         if (prev.find(p => p.id === d.id)) return prev;
//         return [...prev, { id: d.id, name: d.name }];
//       });
//     }, { serviceUUIDs: ['0000ffe0-0000-1000-8000-00805f9b34fb'] }); // example service
//   };

//   const connect = async (id: string) => {
//     await bt.stopScan();
//     await bt.connect(id);
//     setConnected(true);
//   };

//   const sendForward = async () => {
//     // Example write: adjust service/characteristic and payload for your car
//     const service = '0000ffe0-0000-1000-8000-00805f9b34fb';
//     const char    = '0000ffe1-0000-1000-8000-00805f9b34fb';
//     await bt.write(service, char, new Uint8Array([0x01])); // “forward” command
//   };

//   const handleCallRobot = async () => {
//     if (callRobot) {
//       callRobot();
//     }

//     if (connected) {
//       try {
//         await adapter.write(
//           PI_SERVICE_UUID,
//           COMMAND_CHAR_UUID,
//           commandEncoder.encode('START').buffer,
//           false
//         );
//         console.log('START sent');
//       } catch (err: any) {
//         console.warn(`Failed to send START command: ${err.message}`); 
//       }
//     } else {
//       console.warn('Not connected; cannot send START command');
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={startScan} style={styles.scanBtn}>
//           <Text style={styles.scanText}>Scan</Text>
//         </TouchableOpacity>
//       </View>

//       {/* (Optional) Devices list under header */}
//       <FlatList
//         style={styles.deviceList}
//         data={devices}
//         keyExtractor={(d) => d.id}
//         renderItem={renderDevice}
//         contentContainerStyle={styles.deviceListContent}
//       />

//       {/* Top third: big Call Robot */}
//       <View style={styles.topThird}>
//         <TouchableOpacity onPress={handleCallRobot} style={styles.callButton}>
//           <Text style={styles.callButtonText}>Call Robot</Text>
//         </TouchableOpacity>
//       </View>

//       {/* Middle/Bottom: centered joystick */}
//       <View style={styles.joystickArea}>
//         <Joystick
//           size={220}
//           knobSize={90}
//           onMove={onJoystickMove}
//           onRelease={onJoystickRelease}
//         />
//       </View>

//       {/* Example extra control when connected */}
//       {connected && (
//         <View style={styles.footer}>
//           <TouchableOpacity style={styles.forwardBtn} onPress={sendForward}>
//             <Text style={styles.forwardText}>Forward</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//     </SafeAreaView>
//   );
// }

// // Styling
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#0b1220" },

//   header: {
//     height: 56,
//     justifyContent: "center",
//     alignItems: "center",
//     position: "relative",
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: "#0b1220",
//   },
//   title: { fontSize: 20, fontWeight: "700", color: "#fff" },
//   scanBtn: {
//     position: "absolute",
//     right: 16,
//     top: 10,
//     paddingVertical: 6,
//     paddingHorizontal: 12,
//     borderRadius: 999,
//     backgroundColor: "#0b1220",
//   },
//   scanText: { color: "#fff", fontSize: 13, fontWeight: "600" },

//   deviceList: { maxHeight: 140 },
//   deviceListContent: { paddingHorizontal: 16, paddingVertical: 8 },
//   deviceRow: {
//     paddingVertical: 8,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: "#0b1220",
//   },
//   deviceName: { color: "#fff", fontSize: 16 },
//   deviceId: { color: "#9aa0a6", fontSize: 12, marginTop: 2 },

//   topThird: { flex: 1, justifyContent: "center", alignItems: "center" },
//   callButton: {
//     paddingVertical: 18,
//     paddingHorizontal: 28,
//     borderRadius: 16,
//     backgroundColor: "#2563eb",
//     elevation: 2,
//   },
//   callButtonText: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },

//   joystickArea: { flex: 2, justifyContent: "center", alignItems: "center" },

//   footer: {
//     padding: 16,
//     alignItems: "center",
//   },
//   forwardBtn: {
//     paddingVertical: 12,
//     paddingHorizontal: 20,
//     borderRadius: 12,
//     backgroundColor: "#10b981",
//   },
//   forwardText: { color: "#0b0b0c", fontWeight: "700", fontSize: 16 },
// });
