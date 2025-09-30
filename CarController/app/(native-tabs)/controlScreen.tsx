// src/screens/ControlScreen.tsx
import React, { useState } from 'react';
import { FlatList, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeBleAdapter } from '../_ble/_nativeBleAdapter';
import { IBluetoothAdapter } from '../_ble/_types';
import { WebBluetoothAdapter } from '../_ble/_webBluetoothAdapter';
import Joystick from "../components/joystick";

let adapter: IBluetoothAdapter;

export function getBluetoothAdapter(): IBluetoothAdapter {
  if (!adapter) {
    // Web build uses web adapter; native uses native adapter
    if (Platform.OS === 'web') {
      adapter = new WebBluetoothAdapter();
    } else {
      adapter = new NativeBleAdapter();
    }
  }
  return adapter;
}

type Device = { id: string; name?: string | null };

interface Props {
  callRobot: () => void;
  onJoystickMove: (x: number, y: number) => void;  // normalized -1..1
  onJoystickRelease?: () => void;
}

export default function ControlScreen(props: Props) {
  const bt = getBluetoothAdapter();
  const [devices, setDevices] = useState<{id:string; name?:string|null}[]>([]);
  const [connected, setConnected] = useState(false);
  const { callRobot, onJoystickMove, onJoystickRelease } = props;

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity onPress={() => connect(item.id)} style={styles.deviceRow}>
      <Text style={styles.deviceName}>{item.name || "Unknown"}</Text>
      <Text style={styles.deviceId}>{item.id}</Text>
    </TouchableOpacity>
  );

  const startScan = async () => {
    setDevices([]);
    await bt.scan(d => {
      setDevices(prev => {
        if (prev.find(p => p.id === d.id)) return prev;
        return [...prev, { id: d.id, name: d.name }];
      });
    }, { serviceUUIDs: ['0000ffe0-0000-1000-8000-00805f9b34fb'] }); // example service
  };

  const connect = async (id: string) => {
    await bt.stopScan();
    await bt.connect(id);
    setConnected(true);
  };

  const sendForward = async () => {
    // Example write: adjust service/characteristic and payload for your car
    const service = '0000ffe0-0000-1000-8000-00805f9b34fb';
    const char    = '0000ffe1-0000-1000-8000-00805f9b34fb';
    await bt.write(service, char, new Uint8Array([0x01])); // “forward” command
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={startScan} style={styles.scanBtn}>
          <Text style={styles.scanText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* (Optional) Devices list under header */}
      <FlatList
        style={styles.deviceList}
        data={devices}
        keyExtractor={(d) => d.id}
        renderItem={renderDevice}
        contentContainerStyle={styles.deviceListContent}
      />

      {/* Top third: big Call Robot */}
      <View style={styles.topThird}>
        <TouchableOpacity onPress={callRobot} style={styles.callButton}>
          <Text style={styles.callButtonText}>Call Robot</Text>
        </TouchableOpacity>
      </View>

      {/* Middle/Bottom: centered joystick */}
      <View style={styles.joystickArea}>
        <Joystick
          size={220}
          knobSize={90}
          onMove={onJoystickMove}
          onRelease={onJoystickRelease}
        />
      </View>

      {/* Example extra control when connected */}
      {connected && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.forwardBtn} onPress={sendForward}>
            <Text style={styles.forwardText}>Forward</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// Styling
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },

  header: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#0b1220",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#fff" },
  scanBtn: {
    position: "absolute",
    right: 16,
    top: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#0b1220",
  },
  scanText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  deviceList: { maxHeight: 140 },
  deviceListContent: { paddingHorizontal: 16, paddingVertical: 8 },
  deviceRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#0b1220",
  },
  deviceName: { color: "#fff", fontSize: 16 },
  deviceId: { color: "#9aa0a6", fontSize: 12, marginTop: 2 },

  topThird: { flex: 1, justifyContent: "center", alignItems: "center" },
  callButton: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    elevation: 2,
  },
  callButtonText: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },

  joystickArea: { flex: 2, justifyContent: "center", alignItems: "center" },

  footer: {
    padding: 16,
    alignItems: "center",
  },
  forwardBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#10b981",
  },
  forwardText: { color: "#0b0b0c", fontWeight: "700", fontSize: 16 },
});
