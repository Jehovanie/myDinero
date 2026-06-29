/**
 * LoginScreen – Écran de connexion.
 *
 * 🔐 Sécurité :
 *  - Validation côté client avant envoi.
 *  - Messages d'erreur génériques (ne pas divulguer si l'email existe).
 *  - Rate limiting géré côté Supabase.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signIn } from '../services/supabase';
import useStore from '../store/useStore';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setUser = useStore((s) => s.setUser);
  const setSession = useStore((s) => s.setSession);

  const handleLogin = async () => {
    // Validation basique
    if (!email.trim() || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      const { user, session } = await signIn(email.trim(), password);
      setUser(user);
      setSession(session);
      // La navigation sera automatiquement mise à jour via AppNavigator
    } catch (error) {
      // Message générique pour la sécurité (ne pas révéler si l'email existe)
      Alert.alert(
        'Connexion échouée',
        'Email ou mot de passe incorrect. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-surface-light"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* En-tête décoratif */}
        <View className="bg-primary h-56 rounded-b-[40px] items-center justify-end pb-8">
          <Ionicons name="wallet-outline" size={48} color="#FFF" />
          <Text className="text-white text-2xl font-bold mt-2">myDinero</Text>
          <Text className="text-primary-light text-sm">Votre budget, simplifié</Text>
        </View>

        {/* Formulaire */}
        <View className="px-6 pt-10">
          <Text className="text-gray-800 text-xl font-bold mb-6">
            Connexion
          </Text>

          {/* Champ Email */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm mb-1.5 ml-1">Email</Text>
            <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-4 h-12">
              <Ionicons name="mail-outline" size={18} color="#999" />
              <TextInput
                className="flex-1 ml-2 text-gray-800 text-base"
                placeholder="votre@email.com"
                placeholderTextColor="#BBB"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Champ Mot de passe */}
          <View className="mb-6">
            <Text className="text-gray-600 text-sm mb-1.5 ml-1">
              Mot de passe
            </Text>
            <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-4 h-12">
              <Ionicons name="lock-closed-outline" size={18} color="#999" />
              <TextInput
                className="flex-1 ml-2 text-gray-800 text-base"
                placeholder="••••••••"
                placeholderTextColor="#BBB"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bouton Connexion */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="bg-primary h-12 rounded-xl items-center justify-center shadow-md"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Se connecter
              </Text>
            )}
          </TouchableOpacity>

          {/* Mot de passe oublié */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            className="items-center mt-4"
          >
            <Text className="text-primary text-sm">
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>

          {/* Lien vers inscription */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500">Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text className="text-primary font-semibold">S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
