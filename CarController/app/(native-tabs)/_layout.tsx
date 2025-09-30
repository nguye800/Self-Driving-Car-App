import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { StyleSheet } from "react-native";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName='controlScreen'
      screenOptions={{
        tabBarActiveTintColor: '#60a5fa',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: '#60a5fa',
        headerShown: useClientOnlyValue(false, true),
        headerTitleAlign: 'center',
      }}>
      <Tabs.Screen
        name="controlScreen"
        options={{
          title: 'Control Center',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
      <Tabs.Screen
        name="diagnosticScreen"
        options={{
          title: 'Diagnostics',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0b1220',
    borderTopWidth: 0,
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'SpaceMono', // loaded in RootLayout
  },
  header: {
    backgroundColor: '#0b1220',
  },
  headerTitle: {
    color: '#e5e7eb',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
});
