import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Badge component for status indicators
 * @param {Object} props
 * @param {string} props.text - Badge text
 * @param {string} props.variant - Color variant (success, warning, danger, info, default)
 * @param {Object} props.style - Additional styles
 */
const Badge = ({
  text,
  variant = 'default',
  style,
}) => {
  const badgeStyles = [
    styles.badge,
    styles[`badge${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
  ];

  return (
    <View style={badgeStyles}>
      <Text style={textStyles}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeDefault: {
    backgroundColor: '#E5E7EB',
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeDanger: {
    backgroundColor: '#FEE2E2',
  },
  badgeInfo: {
    backgroundColor: '#DBEAFE',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textDefault: {
    color: '#4B5563',
  },
  textSuccess: {
    color: '#065F46',
  },
  textWarning: {
    color: '#92400E',
  },
  textDanger: {
    color: '#991B1B',
  },
  textInfo: {
    color: '#1E40AF',
  },
});

export default Badge;
