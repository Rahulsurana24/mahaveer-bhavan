import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Custom Input component with validation display
 * @param {Object} props
 * @param {string} props.label - Input label
 * @param {string} props.value - Input value
 * @param {Function} props.onChangeText - Change handler
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.secureTextEntry - Secure input for passwords
 * @param {string} props.error - Error message
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.keyboardType - Keyboard type
 * @param {boolean} props.multiline - Multiline input
 * @param {number} props.numberOfLines - Number of lines for multiline
 */
const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  disabled = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  icon,
  onIconPress,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
        disabled && styles.inputContainerDisabled,
      ]}>
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          editable={!disabled}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.iconButton}
          >
            <Text style={styles.iconText}>
              {isPasswordVisible ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        )}

        {icon && onIconPress && (
          <TouchableOpacity onPress={onIconPress} style={styles.iconButton}>
            {icon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputContainerFocused: {
    borderColor: '#FF6B35',
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: '#DC2626',
  },
  inputContainerDisabled: {
    backgroundColor: '#F3F4F6',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  iconButton: {
    padding: 8,
  },
  iconText: {
    fontSize: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
});

export default Input;
