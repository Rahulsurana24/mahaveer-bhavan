import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

/**
 * Avatar component for user profile pictures
 * @param {Object} props
 * @param {string} props.uri - Image URI
 * @param {string} props.name - User name (for initials fallback)
 * @param {string} props.size - Size variant (small, medium, large)
 * @param {Object} props.style - Additional styles
 */
const Avatar = ({
  uri,
  name = '',
  size = 'medium',
  style,
}) => {
  const sizeStyles = {
    small: { width: 32, height: 32, borderRadius: 16 },
    medium: { width: 48, height: 48, borderRadius: 24 },
    large: { width: 80, height: 80, borderRadius: 40 },
    xlarge: { width: 120, height: 120, borderRadius: 60 },
  };

  const textSizes = {
    small: 14,
    medium: 18,
    large: 28,
    xlarge: 40,
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const containerStyle = [
    styles.container,
    sizeStyles[size],
    style,
  ];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={containerStyle}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[containerStyle, styles.placeholder]}>
      <Text style={[styles.initials, { fontSize: textSizes[size] }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default Avatar;
