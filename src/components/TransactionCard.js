/**
 * TransactionCard – Affiche une transaction individuelle.
 *
 * Props :
 *  - transaction : objet { amount, description, type, category, date }
 *  - onDelete     : callback appelé lors de la suppression
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../constants/categories';

export default function TransactionCard({ transaction, onDelete }) {
  const isIncome = transaction.type === 'income';
  const iconName = transaction.category?.icon || 'wallet-outline';
  const categoryName = transaction.category?.name || 'Sans catégorie';
  const categoryColor = transaction.category?.color || (isIncome ? '#4CAF50' : '#EF4444');

  return (
    <View className="bg-white mx-4 mb-3 p-4 rounded-2xl flex-row items-center shadow-sm border border-gray-100">
      {/* Icône catégorie */}
      <View
        className="w-11 h-11 rounded-full items-center justify-center"
        style={{ backgroundColor: categoryColor + '20' }}
      >
        <Ionicons name={iconName} size={20} color={categoryColor} />
      </View>

      {/* Détails */}
      <View className="flex-1 ml-3">
        <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
          {categoryName}
        </Text>
        {transaction.description ? (
          <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
            {transaction.description}
          </Text>
        ) : null}
        <Text className="text-xs text-gray-400 mt-0.5">
          {new Date(transaction.date).toLocaleDateString('fr-FR')}
        </Text>
      </View>

      {/* Montant */}
      <View className="items-end">
        <Text
          className={`text-base font-bold ${
            isIncome ? 'text-success' : 'text-danger'
          }`}
        >
          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
        </Text>
      </View>

      {/* Bouton supprimer (glissement ou appui long serait mieux en production) */}
      {onDelete && (
        <TouchableOpacity
          onPress={() => onDelete(transaction.id)}
          className="ml-3 p-1"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color="#CCC" />
        </TouchableOpacity>
      )}
    </View>
  );
}
