import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { colors, fonts } from '../theme';
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

// Plain white header: centred medium title, no shadow (matches the Paper designs).
const stackHeader = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.ink,
  headerTitleAlign: 'center',
  headerTitleStyle: { fontFamily: fonts.sansMedium, fontSize: 16 },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.bg },
};

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
        // exists), instead of resetting to Home — the "stuck loading" bug.
        <Stack.Screen name="CurrencySetup" component={CurrencyPickerScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ListDetail" component={ListDetailScreen} options={{ title: '' }} />
          <Stack.Screen
            name="AddEntry"
            component={AddEntryScreen}
            options={{ title: 'New expense', presentation: 'modal' }}
          />
          <Stack.Screen name="Fuel" component={FuelScreen} options={{ title: 'Car · Fuel' }} />
          <Stack.Screen
            name="FuelEntry"
            component={FuelEntryScreen}
            options={{ title: 'New refill', presentation: 'modal' }}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '' }} />
          <Stack.Screen name="ManageLists" component={ManageListsScreen} options={{ title: 'Lists' }} />
          <Stack.Screen name="ManageCategories" component={ManageCategoriesScreen} options={{ title: 'Categories' }} />
          <Stack.Screen name="CurrencyPicker" component={CurrencyPickerScreen} options={{ title: 'Currency' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
