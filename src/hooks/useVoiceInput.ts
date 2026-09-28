import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ── Browser API detection (module-level, runs once) ───────────

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognitionAPI(): any | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// ── Types ─────────────────────────────────────────────────────

export interface UseVoiceInputReturn {
  isRecording: boolean;
  isSupported: boolean;
  transcript: string;
  toggleRecording: () => void;
  clearTranscript: () => void;
}

// ── Hook ──────────────────────────────────────────────────────

export function useVoiceInput(onTranscript: (text: string) => void): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any | null>(null);
  // Computed once into a stable ref — avoids conditional expression in render
  const apiRef = useRef(getSpeechRecognitionAPI());
  const isSupported = !!apiRef.current;

  // Cleanup on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  const startRecording = useCallback(() => {
    const API = apiRef.current;
    if (!API) {
      toast.error("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.");
      return;
    }

    const recognition = new API();
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = "";

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim = result[0].transcript;
        }
      }
      onTranscript(finalText + interim);
      setTranscript(finalText + interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        toast.error("Vui lòng cấp quyền truy cập microphone.");
      } else if (event.error === "no-speech") {
        toast.info("Không phát hiện giọng nói. Thử lại nhé!");
      } else if (event.error !== "aborted") {
        toast.error(`Lỗi nhận diện giọng nói: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      toast.error("Không thể khởi động microphone. Kiểm tra quyền truy cập.");
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const clearTranscript = useCallback(() => setTranscript(""), []);

  return { isRecording, isSupported, transcript, toggleRecording, clearTranscript };
}
