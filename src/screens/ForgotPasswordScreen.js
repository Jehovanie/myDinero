/**
 * ForgotPasswordScreen – Réinitialisation du mot de passe.
 *
 * 📧 Envoie un email de réinitialisation via Supabase.
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '../services/supabase';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse email.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (error) {
      Alert.alert(
        'Erreur',
        "Une erreur est survenue. Vérifiez l'adresse email et réessayez."
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View className="flex-1 bg-surface-light items-center justify-center px-8">
        <Ionicons name="checkmark-circle-outline" size={72} color="#00B894" />
        <Text className="text-xl font-bold text-gray-800 mt-4 text-center">
          Email envoyé !
        </Text>
        <Text className="text-gray-500 text-center mt-2 leading-5">
          Si un compte est associé à {email}, vous recevrez un lien de
          réinitialisation dans quelques instants.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-primary h-12 px-8 rounded-xl items-center justify-center mt-8"
        >
          <Text className="text-white font-semibold">Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-surface-light"
    >
      {/* En-tête */}
      <View className="bg-primary h-40 rounded-b-[40px] items-center justify-end pb-6">
        <Ionicons name="key-outline" size={36} color="#FFF" />
        <Text className="text-white text-lg font-bold mt-1">
          Mot de passe oublié
        </Text>
      </View>

      <View className="px-6 pt-10">
        <Text className="text-gray-500 text-sm leading-5 mb-6">
          Entrez votre adresse email et nous vous enverrons un lien pour
          réinitialiser votre mot de passe.
        </Text>

        <View className="mb-6">
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

        <TouchableOpacity
          onPress={handleReset}
          disabled={loading}
          className="bg-primary h-12 rounded-xl items-center justify-center shadow-md"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Envoyer le lien
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="items-center mt-6"
        >
          <Text className="text-primary text-sm">Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
