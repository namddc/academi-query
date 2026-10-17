import { useState, useEffect, useRef, useCallback } from "react";

// Helper to strip markdown and code blocks for natural speech
export function cleanTextForSpeech(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, " đoạn mã lập trình ")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove headers, bold, italics, strikethrough, blockquotes
    .replace(/[#*_~>]/g, "")
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove excessive newlines and whitespace
    .replace(/\s+/g, " ")
    .trim();
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      setIsSupported(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    (text: string, id?: string) => {
      if (!synthRef.current) return;

      // If already speaking this message, toggle stop
      if (isSpeaking && speakingId === id) {
        stop();
        return;
      }

      // Stop any current speech
      synthRef.current.cancel();

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utteranceRef.current = utterance;
      utterance.lang = "vi-VN";
      utterance.rate = 1.05; // Slightly faster for natural rhythm
      utterance.pitch = 1.0;

      // Find Vietnamese voice if available
      const voices = synthRef.current.getVoices();
      const viVoice = voices.find((v) => v.lang.includes("vi") || v.lang.includes("VI"));
      if (viVoice) {
        utterance.voice = viVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        if (id) setSpeakingId(id);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingId(null);
      };

      utterance.onerror = (e) => {
        console.warn("TTS Error:", e);
        setIsSpeaking(false);
        setSpeakingId(null);
      };

      synthRef.current.speak(utterance);
    },
    [isSpeaking, speakingId, stop],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    speakingId,
    isSupported,
  };
}
