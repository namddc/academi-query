import { useState, useEffect, useRef, useCallback } from "react";
import { normalizeForSpeech, splitIntoSpeechSentences } from "@/lib/textNormalizer";

export type TTSVoiceGender = "female" | "male";

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  speakingId: string | null;
  isSupported: boolean;
  rate: number;
  voiceGender: TTSVoiceGender;
  currentVoiceName: string | null;
  setRate: (rate: number) => void;
  setVoiceGender: (gender: TTSVoiceGender) => void;
  speak: (text: string, id?: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
}

const STORAGE_KEY_RATE = "ibot_tts_rate";
const STORAGE_KEY_GENDER = "ibot_tts_gender";

// Shared module-level state to synchronize all message action bars
let sharedSpeakingId: string | null = null;
let sharedIsSpeaking = false;
let sharedIsPaused = false;
let sharedRate = 1.0;
let sharedGender: TTSVoiceGender = "female";
let sharedVoiceName: string | null = null;
let sharedVoices: SpeechSynthesisVoice[] = [];
let queue: string[] = [];
let currentChunkIndex = 0;
let shouldContinue = true;
let isVoicesInitialized = false;

// Initialize preferences from localStorage
try {
  if (typeof window !== "undefined") {
    const savedRate = localStorage.getItem(STORAGE_KEY_RATE);
    if (savedRate) sharedRate = parseFloat(savedRate);
    const savedGender = localStorage.getItem(STORAGE_KEY_GENDER);
    if (savedGender === "male" || savedGender === "female") sharedGender = savedGender;
  }
} catch {}

const listeners = new Set<() => void>();
function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

function pickBestVoice(voices: SpeechSynthesisVoice[], gender: TTSVoiceGender): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const viVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith("vi") ||
      v.lang.toLowerCase().includes("vietnam") ||
      v.lang.toLowerCase().includes("vi-vn"),
  );

  if (viVoices.length === 0) return null;

  if (gender === "female") {
    // 1. Edge/Windows Natural Female
    const hoaiMy = viVoices.find(
      (v) =>
        v.name.toLowerCase().includes("hoaimy") ||
        (v.name.toLowerCase().includes("natural") && v.name.toLowerCase().includes("female")),
    );
    if (hoaiMy) return hoaiMy;

    // 2. Google Tiếng Việt
    const googleVi = viVoices.find((v) => v.name.toLowerCase().includes("google"));
    if (googleVi) return googleVi;

    // 3. Fallback any non-male
    const anyFemale = viVoices.find(
      (v) => !v.name.toLowerCase().includes("namminh") && !v.name.toLowerCase().includes("male"),
    );
    return anyFemale || viVoices[0];
  } else {
    // 1. Edge/Windows Natural Male
    const namMinh = viVoices.find(
      (v) =>
        v.name.toLowerCase().includes("namminh") ||
        (v.name.toLowerCase().includes("natural") && v.name.toLowerCase().includes("male")),
    );
    if (namMinh) return namMinh;

    // 2. Fallback male or first
    const anyMale = viVoices.find((v) => v.name.toLowerCase().includes("male"));
    return anyMale || viVoices[0];
  }
}

function updateVoiceDisplayName() {
  const voice = pickBestVoice(sharedVoices, sharedGender);
  if (voice) {
    let name = voice.name;
    if (name.includes("HoaiMy")) name = "Hoài My (Tự nhiên)";
    else if (name.includes("NamMinh")) name = "Nam Minh (Tự nhiên)";
    else if (name.includes("Google")) name = "Google Tiếng Việt";
    sharedVoiceName = name;
  } else {
    sharedVoiceName = null;
  }
}

function stopGlobalSpeech() {
  shouldContinue = false;
  queue = [];
  currentChunkIndex = 0;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  sharedIsSpeaking = false;
  sharedIsPaused = false;
  sharedSpeakingId = null;
  notifyListeners();
}

function playChunk() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!shouldContinue) return;

  if (currentChunkIndex >= queue.length) {
    // Finished all chunks
    stopGlobalSpeech();
    return;
  }

  const chunkText = queue[currentChunkIndex];
  const utterance = new SpeechSynthesisUtterance(chunkText);
  utterance.lang = "vi-VN";
  utterance.rate = sharedRate;
  utterance.pitch = 1.0;

  const voice = pickBestVoice(sharedVoices, sharedGender);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => {
    if (shouldContinue) {
      currentChunkIndex += 1;
      playChunk();
    }
  };

  utterance.onerror = (e) => {
    if (e.error === "canceled" || e.error === "interrupted") return;
    console.warn("TTS chunk playback warning:", e);
    if (shouldContinue) {
      currentChunkIndex += 1;
      playChunk();
    }
  };

  window.speechSynthesis.speak(utterance);
}

export function useTTS(): TTSState {
  const [, setTick] = useState(0);
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    const onUpdate = () => setTick((t) => t + 1);
    listeners.add(onUpdate);

    if (isSupported && !isVoicesInitialized) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          sharedVoices = v;
          isVoicesInitialized = true;
          updateVoiceDisplayName();
          notifyListeners();
        }
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      listeners.delete(onUpdate);
    };
  }, [isSupported]);

  const setRate = useCallback((newRate: number) => {
    sharedRate = newRate;
    try {
      localStorage.setItem(STORAGE_KEY_RATE, newRate.toString());
    } catch {}
    notifyListeners();
  }, []);

  const setVoiceGender = useCallback((gender: TTSVoiceGender) => {
    sharedGender = gender;
    try {
      localStorage.setItem(STORAGE_KEY_GENDER, gender);
    } catch {}
    updateVoiceDisplayName();
    notifyListeners();
  }, []);

  const pause = useCallback(() => {
    if (isSupported && sharedIsSpeaking && !sharedIsPaused) {
      window.speechSynthesis.pause();
      sharedIsPaused = true;
      notifyListeners();
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported && sharedIsSpeaking && sharedIsPaused) {
      window.speechSynthesis.resume();
      sharedIsPaused = false;
      notifyListeners();
    }
  }, [isSupported]);

  const togglePause = useCallback(() => {
    if (sharedIsPaused) {
      resume();
    } else {
      pause();
    }
  }, [pause, resume]);

  const stop = useCallback(() => {
    stopGlobalSpeech();
  }, []);

  const speak = useCallback(
    (rawText: string, id?: string) => {
      if (!isSupported) return;

      // If already speaking this message, toggle stop
      if (sharedIsSpeaking && sharedSpeakingId === id) {
        stopGlobalSpeech();
        return;
      }

      // Stop any active speech first
      stopGlobalSpeech();

      // 1. Normalize through Academic Text Normalizer
      const normalized = normalizeForSpeech(rawText);
      if (!normalized) return;

      // 2. Split into sentence chunks to bypass Chrome 15s timeout
      const sentences = splitIntoSpeechSentences(normalized);
      if (sentences.length === 0) return;

      // 3. Initialize state and queue
      queue = sentences;
      currentChunkIndex = 0;
      shouldContinue = true;
      sharedIsSpeaking = true;
      sharedIsPaused = false;
      sharedSpeakingId = id || null;
      notifyListeners();

      // 4. Start playback
      playChunk();
    },
    [isSupported],
  );

  return {
    isSpeaking: sharedIsSpeaking,
    isPaused: sharedIsPaused,
    speakingId: sharedSpeakingId,
    isSupported,
    rate: sharedRate,
    voiceGender: sharedGender,
    currentVoiceName: sharedVoiceName,
    setRate,
    setVoiceGender,
    speak,
    stop,
    pause,
    resume,
    togglePause,
  };
}
