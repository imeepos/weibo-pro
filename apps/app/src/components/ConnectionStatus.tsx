/**
 * ConnectionStatus - 连接状态指示器组件
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ConnectionStatus as ConnectionStatusType } from '../types';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  clientId?: string | null;
}

const STATUS_CONFIG = {
  disconnected: {
    color: '#8E8E93',
    text: '未连接',
  },
  connecting: {
    color: '#FF9500',
    text: '连接中...',
  },
  connected: {
    color: '#34C759',
    text: '已连接',
  },
  error: {
    color: '#FF3B30',
    text: '连接错误',
  },
};

export function ConnectionStatus({ status, clientId }: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: config.color }]} />
      <Text style={styles.text}>{config.text}</Text>
      {clientId && status === 'connected' && (
        <Text style={styles.clientId}>ID: {clientId.substring(0, 8)}...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    color: '#8E8E93',
  },
  clientId: {
    fontSize: 10,
    color: '#C7C7CC',
    marginLeft: 8,
  },
});
