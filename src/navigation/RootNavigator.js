import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { Loading } from '../components/ui';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ListDetailScreen from '../screens/ListDetailScreen';
import AddEntryScreen from '../screens/AddEntryScreen';
import ScanScreen from '../screens/ScanScreen';
import SmsScreen from '../screens/SmsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' },
};

const TAB_ICONS = {
  Home: 'home',
  Scan: 'scan',
  SMS: 'chatbubbles',
  Settings: 'settings',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerOptions,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { paddingBottom: 4, height: 58 },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Expense Tracker' }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan Receipt' }} />
      <Tab.Screen name="SMS" component={SmsScreen} options={{ title: 'SMS Import' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { ready, token } = useAuth();

  if (!ready) {
    return <Loading label="Loading…" />;
  }

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      {!token ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="ListDetail" component={ListDetailScreen} options={{ title: 'List' }} />
          <Stack.Screen name="AddEntry" component={AddEntryScreen} options={{ title: 'Add Item' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
