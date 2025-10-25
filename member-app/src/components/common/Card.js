import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * Card component for content containers
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {Object} props.style - Additional styles
 * @param {Function} props.onPress - Optional press handler (makes card touchable)
 * @param {string} props.variant - Card variant (default, elevated, outlined)
 */
const Card = ({
  children,
  style,
  onPress,
  variant = 'default',
}) => {
  const cardStyles = [
    styles.card,
    variant === 'elevated' && styles.cardElevated,
    variant === 'outlined' && styles.cardOutlined,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyles}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardOutlined: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});

export default Card;
