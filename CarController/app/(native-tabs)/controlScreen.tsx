// src/screens/ControlScreen.tsx
import React, { useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity } from 'react-native';
import { getBluetoothAdapter } from '.';

export default function ControlScreen() {
  const bt = getBluetoothAdapter();
  const [devices, setDevices] = useState<{id:string; name?:string|null}[]>([]);
  const [connected, setConnected] = useState(false);

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
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Car Controller</Text>
      <Button title="Scan" onPress={startScan} />
      <FlatList
        style={{ marginVertical: 12 }}
        data={devices}
        keyExtractor={d => d.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => connect(item.id)} style={{ padding: 12 }}>
            <Text>{item.name || 'Unknown'}</Text>
            <Text style={{ color: '#666' }}>{item.id}</Text>
          </TouchableOpacity>
        )}
      />
      {connected && <Button title="Forward" onPress={sendForward} />}
    </View>
  );
}
