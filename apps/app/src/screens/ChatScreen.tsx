/**
 * ChatScreen - 聊天界面
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore } from '../store';
import { MessageBubble, ChatInput, ConnectionStatus } from '../components';
import type { ChatMessage } from '../types';

export function ChatScreen() {
  const {
    connectionStatus,
    clientId,
    messages,
    isLoading,
    streamingContent,
    error,
    connect,
    sendMessage,
    abortCurrentTask,
  } = useChatStore();

  const flatListRef = useRef<FlatList>(null);

  // 连接到服务器
  useEffect(() => {
    connect();
  }, []);

  // 滚动到底部
  useEffect(() => {
    if (messages.length > 0 || streamingContent) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, streamingContent]);

  // 构建显示的消息列表（包括流式消息）
  const displayMessages: ChatMessage[] = [
    ...messages,
    ...(streamingContent
      ? [
          {
            id: 'streaming',
            role: 'assistant' as const,
            content: streamingContent,
            timestamp: Date.now(),
            isStreaming: true,
          },
        ]
      : []),
  ];

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <MessageBubble message={item} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Claude 助手</Text>
      <Text style={styles.emptySubtitle}>
        发送消息开始对话
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* 顶部状态栏 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Claude</Text>
          <ConnectionStatus status={connectionStatus} clientId={clientId} />
        </View>

        {/* 错误提示 */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 消息列表 */}
        <FlatList
          ref={flatListRef}
          style={styles.messageList}
          data={displayMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={
            displayMessages.length === 0 ? styles.emptyList : styles.messageListContent
          }
        />

        {/* 加载指示器 */}
        {isLoading && !streamingContent && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>思考中...</Text>
          </View>
        )}

        {/* 输入框 */}
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          onAbort={abortCurrentTask}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  errorContainer: {
    backgroundColor: '#FFEBE9',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#D1242F',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 12,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
});
