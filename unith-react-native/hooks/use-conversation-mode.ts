import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Mode } from "@unith-ai/react-native";
import { Alert } from "react-native";

interface UseConversationModeOptions {
  sendMessage: (text: string) => void;
  responseTimeoutMs?: number;
}

const STATUS_MESSAGES: Record<Mode, string> = {
  listening: "Listening...",
  thinking: "Processing...",
  speaking: "Speaking...",
  stopping: "Stopping..."
};

export function useConversationMode(options: UseConversationModeOptions) {
  const { sendMessage, responseTimeoutMs = 30000 } = options;
  const [mode, setMode] = useState<Mode>("listening");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canRecord: boolean = useMemo(() => mode === "listening", [mode]);
  const statusMessage = STATUS_MESSAGES[mode];

  const clearResponseTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startResponseTimeout = useCallback(() => {
    clearResponseTimeout();

    timeoutRef.current = setTimeout(() => {
      Alert.alert(
        "Response timed out",
        "The assistant took too long to respond. Please try again.",
        [{ text: "Ok" }]
      );

      setMode("listening");
    }, responseTimeoutMs);
  }, [responseTimeoutMs, clearResponseTimeout]);

  const safeSendMessage = useCallback(
    (text: string) => {
      if (mode !== "listening") {
        Alert.alert(
          "Cannot send message",
          "Please wait for the assistant to finish responding before sending another message.",
          [{ text: "Ok" }]
        );
        return;
      }

      if (!text.trim()) {
        Alert.alert(
          "Cannot send empty message",
          "Please enter a message before sending.",
          [{ text: "Ok" }]
        );
        return;
      }

      setMode("thinking");
      sendMessage(text);
      startResponseTimeout();
    },
    [startResponseTimeout, sendMessage, mode]
  );

  const onSpeakingStart = useCallback(() => {
    clearResponseTimeout();
    setMode("speaking");
  }, [clearResponseTimeout]);

  const onSpeakingEnd = useCallback(() => {
    clearResponseTimeout();
    setMode("listening");
  }, [clearResponseTimeout]);

  const onError = useCallback(() => {
    clearResponseTimeout();
    setMode("listening");
  }, [clearResponseTimeout]);

  useEffect(() => {
    return () => clearResponseTimeout();
  }, [clearResponseTimeout]);

  return {
    mode,
    canRecord,
    statusMessage,
    safeSendMessage,
    onSpeakingStart,
    onSpeakingEnd,
    onError
  };
}
