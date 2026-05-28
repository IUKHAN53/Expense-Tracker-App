import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium_Italic,
} from '@expo-google-fonts/newsreader';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { AuthProvider } from './src/context/AuthContext';
import { ConnectivityProvider } from './src/context/ConnectivityContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';
import { colors } from './src/theme';

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader: Newsreader_400Regular,
    'Newsreader-Medium': Newsreader_500Medium,
    'Newsreader-Italic': Newsreader_400Regular_Italic,
    'Newsreader-MediumItalic': Newsreader_500Medium_Italic,
    Geist: Geist_400Regular,
    'Geist-Medium': Geist_500Medium,
    'Geist-SemiBold': Geist_600SemiBold,
    GeistMono: GeistMono_400Regular,
    'GeistMono-Medium': GeistMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <ConnectivityProvider>
            <NavigationContainer theme={navTheme}>
              <View style={{ flex: 1 }}>
                <OfflineBanner />
                <RootNavigator />
              </View>
            </NavigationContainer>
            <StatusBar style="dark" />
          </ConnectivityProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
