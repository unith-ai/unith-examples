import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from "react-native-webview";
import { ConversationOptions, Mode, Status, useConversation, } from "@unith-ai/react-native";

const ORG_ID = "unith";
const HEAD_ID = "samantha-17493";
const API_KEY = "6e9cbx92a61b475089ef4413c08626ea";

type ChatMessage = {
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  visible?: boolean;
};

export default function HomeScreen() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [status, setStatus] = useState<Status>("disconnected");
  const [mode, setMode] = useState<Mode>("listening");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micStatus, setMicStatus] = useState<"OFF" | "PROCESSING" | "ON">("OFF");
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageCounter, setMessageCounter] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [timeOutWarning, setTimeOutWarning] = useState(false);
  const [timeOutBanner, setTimeOutBanner] = useState(false);

  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const options: ConversationOptions = useMemo(
    () => ({
      orgId: ORG_ID,
      headId: HEAD_ID,
      apiKey: API_KEY,
      username: "React Native User",
    }),
    []
  );

  const conversation = useConversation(options, {
    onStatusChange: data => setStatus(data.status),
    onConnect: (prop) => {
      setStatus("connected")
    },
    onStoppingEnd: () => { },
    onDisconnect: () => {
      setStatus("disconnected");
      setSessionStarted(false);
    },
    onMessage: payload => {
      const next: ChatMessage = {
        sender: payload.sender || "ai",
        text: payload.text || "",
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        visible: payload.visible !== false,
      };
      setMessages(prev => [...prev, next]);
      setMessageCounter(prev => prev + 1);
    },
    onSuggestions: payload => setSuggestions(payload.suggestions || []),
    onSpeakingStart: () => {
      setIsSpeaking(true);
      setMode("speaking");
      setMessages(prev =>
        prev.map((msg, index) =>
          index === prev.length - 1 ? { ...msg, visible: true } : msg
        )
      );
    },
    onSpeakingEnd: () => {
      setIsSpeaking(false);
      setMode("listening");
    },
    onTimeoutWarning: () => setTimeOutWarning(true),
    onTimeout: () => setTimeOutBanner(true),
    onKeepSession: payload => {
      if (payload.granted) {
        setTimeOutWarning(false);
        setTimeOutBanner(false);
      }
    },
    onMuteStatusChange: payload => setIsMuted(payload.isMuted),
    onError: payload =>
      Alert.alert("Unith", payload.message || "Unknown error"),
  });

  const handleSend = () => {
    if (!inputText.trim()) return;
    conversation.sendMessage(inputText.trim());
    setInputText("");
  };

  const handleStartSession = () => {
    //clear messages from previous session 
    setMessages([]);
    setMessageCounter(0);
    conversation.startSession();
    setSessionStarted(true);
  };

  const handleEndSession = () => {
    conversation.endSession();
    setSessionStarted(false);
  };

  const handleToggleMic = () => {
    //implement custom here 
  };

  const handleToggleMute = () => {
    conversation.toggleMute();
  };

  const handleKeepSession = () => {
    conversation.keepSession();
  };

  const handleSuggestion = (text: string) => {
    conversation.sendMessage(text);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Digital Human Chat</Text>
          <Text style={styles.subtitle}>Experience AI-powered conversation</Text>
        </View>

        <View style={[styles.grid, isWide && styles.gridWide]}>
          <View style={[styles.card, styles.videoCard]}>
            <View style={styles.videoWrap}>
              <WebView
                ref={conversation.webViewRef}
                {...conversation.webViewProps}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                javaScriptCanOpenWindowsAutomatically={true}
                allowsFullscreenVideo={true}
                javaScriptEnabled={true}
                bounces={false}
                scrollEnabled={false}
                style={[
                  styles.webview,
                  status === "connecting" && { opacity: 0 }
                ]}
              />
              {status === "connecting" && (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loaderText}>Loading digital human...</Text>
                </View>
              )}
            </View>

            <View style={styles.statusBar}>
              <View style={styles.statusRow}>
                <View style={[styles.pill, styles.pillBlue]}>
                  <Text style={styles.pillText}>{status}</Text>
                </View>
                <View style={[styles.pill, styles.pillPurple]}>
                  <Text style={styles.pillText}>{mode}</Text>
                </View>
                <View
                  style={[
                    styles.pill,
                    micStatus === "ON"
                      ? styles.pillGreen
                      : micStatus === "PROCESSING"
                        ? styles.pillAmber
                        : styles.pillSlate,
                  ]}
                >
                  <Text style={styles.pillText}>Mic: {micStatus}</Text>
                </View>
              </View>
              {isSpeaking && (
                <View style={[styles.pill, styles.pillGreen, styles.speakingPill]}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.pillText}>Speaking...</Text>
                </View>
              )}
            </View>

            {(status === "connected" || status === "disconnected") && !sessionStarted && (
              <View style={styles.actionBar}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleStartSession}>
                  <Text style={styles.primaryButtonText}>Start Conversation</Text>
                </TouchableOpacity>
              </View>
            )}

            {timeOutWarning && (
              <View style={styles.warningBar}>
                <Text style={styles.warningText}>Your session will timeout soon</Text>
                <TouchableOpacity style={styles.warningButton} onPress={handleKeepSession}>
                  <Text style={styles.warningButtonText}>Keep Active</Text>
                </TouchableOpacity>
              </View>
            )}

            {suggestions.length > 0 && (
              <View style={styles.suggestions}>
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={`${s}-${i}`}
                    style={styles.suggestionPill}
                    onPress={() => handleSuggestion(s)}
                    disabled={mode !== "listening"}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {sessionStarted && (
              <View style={styles.chatControls}>
                <View style={styles.inputRow}>
                  <TextInput
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type your message..."
                    placeholderTextColor="#7a8394"
                    style={styles.input}
                    editable={mode === "listening"}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSend}
                    disabled={mode !== "listening"}
                  >
                    <Text style={styles.sendButtonText}>Send</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleToggleMic}
                    disabled={mode !== "listening"}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {micStatus === "OFF"
                        ? "Enable Microphone"
                        : micStatus === "ON"
                          ? "Disable Microphone"
                          : "Loading..."}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.muteButton} onPress={handleToggleMute}>
                    <Text style={styles.secondaryButtonText}>
                      {isMuted ? "Unmute" : "Mute"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.ghostButton} onPress={handleEndSession}>
                    <Text style={styles.ghostButtonText}>End Session</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {timeOutBanner && (
              <View style={styles.timeoutBanner}>
                <Text style={styles.timeoutText}>Session timed out</Text>
              </View>
            )}
          </View>

          <View style={[styles.card, styles.messagesCard]}>
            <View style={styles.messagesHeader}>
              <Text style={styles.messagesTitle}>Messages</Text>
              <View style={[styles.pill, styles.pillPurple]}>
                <Text style={styles.pillText}>{messageCounter}</Text>
              </View>
            </View>
            <ScrollView style={styles.messagesBody}>
              {messages.length === 0 ? (
                <Text style={styles.emptyText}>No messages yet</Text>
              ) : (
                messages.map((msg, idx) =>
                  msg.visible !== false ? (
                    <View
                      key={`${msg.sender}-${idx}`}
                      style={msg.sender === "user" ? styles.userMsg : styles.aiMsg}
                    >
                      <View style={styles.msgHeader}>
                        <Text
                          style={msg.sender === "user" ? styles.userName : styles.aiName}
                        >
                          {msg.sender === "user" ? "You" : "Assistant"}
                        </Text>
                        <Text style={styles.msgTime}>
                          {msg.timestamp.toLocaleTimeString()}
                        </Text>
                      </View>
                      <Text style={styles.msgText}>{msg.text}</Text>
                    </View>
                  ) : null
                )
              )}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0b1020" },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    color: "#ffffff",
    fontFamily: Platform.select({ ios: "AvenirNext-DemiBold", android: "serif" }),
  },
  subtitle: {
    marginTop: 4,
    color: "#b7c0d0",
    fontSize: 14,
    fontFamily: Platform.select({ ios: "AvenirNext-Regular", android: "serif" }),
  },
  grid: {
    flexDirection: "column",
    gap: 16,
  },
  gridWide: {
    flexDirection: "row",
  },
  card: {
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(71, 85, 105, 0.6)",
    overflow: "hidden",
  },
  videoCard: {
    flex: 2,
  },
  messagesCard: {
    flex: 1,
  },
  videoWrap: {
    height: 420,
    backgroundColor: "#0b1020",
  },
  webview: { flex: 1, backgroundColor: "transparent" },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b1020",
    gap: 16,
  },
  loaderText: {
    color: "#b7c0d0",
    fontSize: 16,
    fontFamily: Platform.select({ ios: "AvenirNext-Regular", android: "serif" }),
  },
  statusBar: {
    padding: 12,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(71, 85, 105, 0.6)",
    gap: 10,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    color: "#dbe2f0",
    fontSize: 12,
    fontWeight: "600",
  },
  pillBlue: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  pillPurple: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderColor: "rgba(168, 85, 247, 0.4)",
  },
  pillGreen: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  pillAmber: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  pillSlate: {
    backgroundColor: "rgba(100, 116, 139, 0.2)",
    borderColor: "rgba(100, 116, 139, 0.4)",
  },
  speakingPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#4ade80",
  },
  actionBar: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(71, 85, 105, 0.6)",
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  warningBar: {
    padding: 12,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderTopWidth: 1,
    borderTopColor: "rgba(245, 158, 11, 0.35)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  warningText: {
    color: "#fcd34d",
    fontSize: 12,
  },
  warningButton: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  warningButtonText: {
    color: "#0b1020",
    fontWeight: "700",
    fontSize: 12,
  },
  suggestions: {
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.5)",
    backgroundColor: "rgba(168, 85, 247, 0.2)",
  },
  suggestionText: {
    color: "#e9d5ff",
    fontSize: 12,
  },
  chatControls: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(71, 85, 105, 0.6)",
    gap: 10,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.7)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#ffffff",
  },
  sendButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  muteButton: {
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 12,
  },
  ghostButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.6)",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  ghostButtonText: {
    color: "#cbd5f5",
    fontWeight: "600",
  },
  timeoutBanner: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(244, 63, 94, 0.4)",
    backgroundColor: "rgba(244, 63, 94, 0.15)",
  },
  timeoutText: {
    color: "#fecdd3",
    fontWeight: "700",
  },
  messagesHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(71, 85, 105, 0.6)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  messagesTitle: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  messagesBody: {
    padding: 12,
    maxHeight: 520,
  },
  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 20,
  },
  userMsg: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.4)",
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    marginBottom: 10,
    marginLeft: 16,
  },
  aiMsg: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.6)",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    marginBottom: 10,
    marginRight: 16,
  },
  msgHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  userName: {
    color: "#93c5fd",
    fontWeight: "700",
    fontSize: 12,
  },
  aiName: {
    color: "#c4b5fd",
    fontWeight: "700",
    fontSize: 12,
  },
  msgTime: {
    color: "#94a3b8",
    fontSize: 10,
  },
  msgText: {
    color: "#e2e8f0",
    fontSize: 12,
  },
});
