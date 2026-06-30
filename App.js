/**
 * App.js – Point d'entrée de l'application myDinero.
 *
 * Ordre d'initialisation :
 *  1. Polyfills (URL, etc.) et styles globaux (NativeWind)
 *  2. Écoute de l'état d'authentification Supabase
 *  3. Rendu du navigateur principal
 */

import "react-native-url-polyfill/auto";

// ⚠️ Patch URL Hermes – corrige les propriétés readonly sur Android
import './src/services/urlPatch';

// ⚠️ Imports natifs obligatoires (New Architecture)
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import 'react-native-screens';

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator } from 'react-native';
import * as Font from 'expo-font';
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";

// Import du CSS Tailwind (obligatoire pour NativeWind)
import './global.css';

// Services et store
import { supabase } from './src/services/supabase';
import useStore from './src/store/useStore';
import { setupNotifications } from './src/services/notifications';
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const setUser = useStore((s) => s.setUser);
  const setSession = useStore((s) => s.setSession);
  const setLoading = useStore((s) => s.setLoading);

  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialIcons.font,
    ...FontAwesome.font,
  });

  useEffect(() => {
		if (fontsLoaded) {
			SplashScreen.hideAsync();
		}
  }, [fontsLoaded]);

  useEffect(() => {
    // Configurer les notifications locales
    setupNotifications().catch(console.warn);

    // Guard : si le client Supabase n'a pas pu être créé, on sort
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Récupère la session existante au lancement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Écoute les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Nettoyage à la destruction du composant
    return () => {
      subscription?.unsubscribe();
    };
  }, [setUser, setSession, setLoading]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
