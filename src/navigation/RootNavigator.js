import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { colors, fonts } from '../theme';
import { Loading } from '../components/ui';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import ListDetailScreen from '../screens/ListDetailScreen';
import AddEntryScreen from '../screens/AddEntryScreen';
import FuelScreen from '../screens/FuelScreen';
import FuelEntryScreen from '../screens/FuelEntryScreen';
import ScanScreen from '../screens/ScanScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: 'pie-chart',
  Fuel: 'car-sport',
  Scan: 'scan',
  Settings: 'settings',
};

const stackHeader = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.ink,
  headerTitleStyle: { fontFamily: fonts.serifMediumItalic, fontSize: 21 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.rule,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Fuel" component={FuelScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
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
    <Stack.Navigator screenOptions={stackHeader}>
      {!token ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Create account' }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset password' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="ListDetail" component={ListDetailScreen} options={{ title: 'List' }} />
          <Stack.Screen name="AddEntry" component={AddEntryScreen} options={{ title: 'Add Expense' }} />
          <Stack.Screen name="FuelEntry" component={FuelEntryScreen} options={{ title: 'New refill' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
