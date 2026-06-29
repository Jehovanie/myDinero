/**
 * RegisterScreen – Écran d'inscription.
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
import { signUp } from '../services/supabase';
import useStore from '../store/useStore';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setUser = useStore((s) => s.setUser);
  const setSession = useStore((s) => s.setSession);

  const handleRegister = async () => {
    // Validations
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { user, session } = await signUp(
        email.trim(),
        password,
        name.trim()
      );
      setUser(user);
      setSession(session);

      Alert.alert(
        'Inscription réussie',
        'Votre compte a été créé avec succès !',
        [{ text: 'OK' }]
      );
      // La navigation sera automatiquement mise à jour
    } catch (error) {
      Alert.alert(
        'Erreur',
        error.message || "Une erreur est survenue lors de l'inscription."
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
        {/* En-tête */}
        <View className="bg-primary h-40 rounded-b-[40px] items-center justify-end pb-6">
          <Ionicons name="person-add-outline" size={36} color="#FFF" />
          <Text className="text-white text-lg font-bold mt-1">
            Créer un compte
          </Text>
        </View>

        <View className="px-6 pt-8">
          {/* Nom */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm mb-1.5 ml-1">Nom</Text>
            <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-4 h-12">
              <Ionicons name="person-outline" size={18} color="#999" />
              <TextInput
                className="flex-1 ml-2 text-gray-800 text-base"
                placeholder="Votre nom"
                placeholderTextColor="#BBB"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Email */}
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

          {/* Mot de passe */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm mb-1.5 ml-1">
              Mot de passe
            </Text>
            <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-4 h-12">
              <Ionicons name="lock-closed-outline" size={18} color="#999" />
              <TextInput
                className="flex-1 ml-2 text-gray-800 text-base"
                placeholder="6 caractères minimum"
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

          {/* Confirmation */}
          <View className="mb-6">
            <Text className="text-gray-600 text-sm mb-1.5 ml-1">
              Confirmer le mot de passe
            </Text>
            <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-4 h-12">
              <Ionicons name="lock-closed-outline" size={18} color="#999" />
              <TextInput
                className="flex-1 ml-2 text-gray-800 text-base"
                placeholder="••••••••"
                placeholderTextColor="#BBB"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          {/* Bouton */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            className="bg-primary h-12 rounded-xl items-center justify-center shadow-md"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text className="text-white font-semibold text-base">
                S'inscrire
              </Text>
            )}
          </TouchableOpacity>

          {/* Lien connexion */}
          <View className="flex-row justify-center mt-6 mb-10">
            <Text className="text-gray-500">Déjà un compte ? </Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
            >
              <Text className="text-primary font-semibold">Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
