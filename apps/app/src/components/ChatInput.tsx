/**
 * ChatInput - 聊天输入框组件
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  onAbort?: () => void;
}

export function ChatInput({ onSend, isLoading, onAbort }: ChatInputProps) {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    const trimmedText = inputText.trim();
    if (trimmedText && !isLoading) {
      onSend(trimmedText);
      setInputText('');
    }
  };

  const handleAbort = () => {
    if (isLoading && onAbort) {
      onAbort();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入消息..."
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={4000}
          editable={!isLoading}
        />
      </View>
      {isLoading ? (
        <TouchableOpacity style={styles.abortButton} onPress={handleAbort}>
          <Ionicons name="stop-circle" size={32} color="#FF3B30" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons
            name="send"
            size={24}
            color={inputText.trim() ? '#007AFF' : '#C7C7CC'}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 120,
  },
  input: {
    fontSize: 16,
    color: '#000000',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  abortButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
