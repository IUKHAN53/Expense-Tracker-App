import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors, fonts } from '../theme';
import { View } from 'react-native';
import { Button, EmptyState, Loading } from '../components/ui';
import HomeScreen from '../screens/HomeScreen';
import ListDetailScreen from '../screens/ListDetailScreen';
import AddEntryScreen from '../screens/AddEntryScreen';
import FuelScreen from '../screens/FuelScreen';
import FuelEntryScreen from '../screens/FuelEntryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ManageListsScreen from '../screens/ManageListsScreen';
import ManageCategoriesScreen from '../screens/ManageCategoriesScreen';
import CurrencyPickerScreen from '../screens/CurrencyPickerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: 'pie-chart',
  Fuel: 'car-sport',
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
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.rule,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Fuel" component={FuelScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { ready, dbError, retry, currency } = useApp();

  if (!ready) {
    return <Loading label="Loading…" />;
  }

  if (dbError) {
    // Never auto-recreate the database here: that would wipe the user's data.
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bg }}>
        <EmptyState
          icon="lock-closed-outline"
          title="Couldn’t open your data"
          subtitle={dbError.message}
        />
        <Button title="Try again" onPress={retry} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={stackHeader}>
      {!currency ? (
        // Distinct name from the in-app "CurrencyPicker" below. If both stacks
        // shared a name, React Navigation would keep the user on the currency
        // screen when the currency gets set (the focused route name still
        // exists), instead of resetting to Tabs/Home — the "stuck loading" bug.
        <Stack.Screen name="CurrencySetup" component={CurrencyPickerScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="ListDetail" component={ListDetailScreen} options={{ title: 'List' }} />
          <Stack.Screen name="AddEntry" component={AddEntryScreen} options={{ title: 'Add Expense' }} />
          <Stack.Screen name="FuelEntry" component={FuelEntryScreen} options={{ title: 'New refill' }} />
          <Stack.Screen name="ManageLists" component={ManageListsScreen} options={{ title: 'Lists' }} />
          <Stack.Screen name="ManageCategories" component={ManageCategoriesScreen} options={{ title: 'Categories' }} />
          <Stack.Screen name="CurrencyPicker" component={CurrencyPickerScreen} options={{ title: 'Currency' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
