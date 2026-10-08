import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing, Typography, BorderRadius } from "../theme/colors";
import { api } from "../api/client";

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  donationId: string;
  donationTitle?: string;
  currentUserId?: string;
}

export function ChatModal({
  visible,
  onClose,
  donationId,
  donationTitle,
  currentUserId,
}: ChatModalProps) {
  const [thread, setThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadThreadAndMessages = async () => {
    if (!donationId) return;
    try {
      setLoading(true);
      // Create or get chat thread for this donation
      const threadRes = await api.request<{
        success: boolean;
        data: { thread: any };
      }>("/chat/threads", {
        method: "POST",
        body: JSON.stringify({ donationId }),
      });

      const activeThread = threadRes.data.thread;
      setThread(activeThread);

      // Load messages
      const msgsRes = await api.request<{
        success: boolean;
        data: { messages: any[] };
      }>(`/chat/threads/${activeThread.id}/messages`);

      setMessages(msgsRes.data.messages || []);
    } catch (err: any) {
      console.warn("Error loading chat:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && donationId) {
      loadThreadAndMessages();
      // Optional polling every 5 seconds while modal is open
      const interval = setInterval(async () => {
        if (thread?.id) {
          try {
            const msgsRes = await api.request<{
              success: boolean;
              data: { messages: any[] };
            }>(`/chat/threads/${thread.id}/messages`);
            setMessages(msgsRes.data.messages || []);
          } catch {}
        }
      }, 5000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
      setThread(null);
      setInputText("");
    }
  }, [visible, donationId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !thread?.id || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const res = await api.request<{
        success: boolean;
        data: { message: any };
      }>(`/chat/threads/${thread.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });

      setMessages((prev) => [...prev, res.data.message]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      alert(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Coordination Chat</Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {donationTitle || `Donation #${donationId.slice(-6)}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Messages List */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.mutedText}>Connecting to conversation...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.centerBox}>
                  <Text style={styles.emptyIcon}>💬</Text>
                  <Text style={styles.emptyTitle}>No messages yet</Text>
                  <Text style={styles.mutedText}>
                    Coordinate logistics, pickup timing, and drop-off instructions here.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isMe = item.sender?.id === currentUserId;
                const senderName = item.sender?.name || item.sender?.role || "User";
                const roleBadge = item.sender?.role ? ` (${item.sender.role})` : "";

                return (
                  <View
                    style={[
                      styles.messageRow,
                      isMe ? styles.myMessageRow : styles.otherMessageRow,
                    ]}
                  >
                    {!isMe && (
                      <Text style={styles.senderHeader}>
                        {senderName}
                        {roleBadge}
                      </Text>
                    )}
                    <View
                      style={[
                        styles.bubble,
                        isMe ? styles.myBubble : styles.otherBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          isMe ? styles.myBubbleText : styles.otherBubbleText,
                        ]}
                      >
                        {item.content}
                      </Text>
                      <Text
                        style={[
                          styles.timeText,
                          isMe ? styles.myTimeText : styles.otherTimeText,
                        ]}
                      >
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type message here..."
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || sending) && styles.sendBtnDisabled,
              ]}
              disabled={!inputText.trim() || sending}
              onPress={handleSendMessage}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  headerTitle: {
    ...Typography.titleSmall,
    fontSize: 17,
  },
  headerSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  emptyTitle: {
    ...Typography.titleSmall,
    color: Colors.textPrimary,
  },
  mutedText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  messageRow: {
    marginVertical: 3,
    maxWidth: "82%",
  },
  myMessageRow: {
    alignSelf: "flex-end",
  },
  otherMessageRow: {
    alignSelf: "flex-start",
  },
  senderHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: "#f1f5f9",
    borderBottomLeftRadius: 2,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myBubbleText: {
    color: "#ffffff",
  },
  otherBubbleText: {
    color: Colors.textPrimary,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  myTimeText: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  otherTimeText: {
    color: Colors.textSecondary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: Spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#cbd5e1",
  },
  sendBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
});
