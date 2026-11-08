import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_800ExtraBold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { AppProvider } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ToastProvider } from './src/components/Toast';
import { colors } from './src/theme';

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Geist: Geist_400Regular,
    'Geist-Medium': Geist_500Medium,
    'Geist-SemiBold': Geist_600SemiBold,
    'Geist-ExtraBold': Geist_800ExtraBold,
    GeistMono: GeistMono_400Regular,
    'GeistMono-Medium': GeistMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <ToastProvider>
            <NavigationContainer theme={navTheme}>
              <RootNavigator />
            </NavigationContainer>
            <StatusBar style="dark" />
          </ToastProvider>
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
