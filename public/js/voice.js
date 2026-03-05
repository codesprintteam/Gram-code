/* ============================================================
   GramSeva - Voice Assistant Module (voice.js)
   Web Speech API for speech-to-text input
   ============================================================ */

let recognition = null;
let isListening = false;
let activeField = null;

function initVoice() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn("Speech Recognition not supported in this browser.");
    // Hide voice buttons if not supported
    document.querySelectorAll(".voice-btn, .voice-fab").forEach((el) => {
      el.style.display = "none";
    });
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    updateVoiceUI(true);
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (activeField) {
      activeField.value = transcript;
      activeField.dispatchEvent(new Event("input"));
    }
  };

  recognition.onerror = (event) => {
    console.warn("Speech recognition error:", event.error);
    isListening = false;
    updateVoiceUI(false);
    if (event.error === "not-allowed") {
      showToast("Microphone access denied. Please allow microphone permissions.", "error");
    }
  };

  recognition.onend = () => {
    isListening = false;
    updateVoiceUI(false);
  };
}

function startListening(fieldElement) {
  if (!recognition) {
    showToast("Voice input is not supported in this browser.", "info");
    return;
  }

  if (isListening) {
    recognition.stop();
    return;
  }

  activeField = fieldElement;
  const lang = getCurrentLang();
  recognition.lang = speechLangCodes[lang] || "en-IN";

  try {
    recognition.start();
  } catch (e) {
    console.warn("Speech recognition start error:", e);
  }
}

function updateVoiceUI(listening) {
  document.querySelectorAll(".voice-btn").forEach((btn) => {
    if (listening) {
      btn.classList.add("voice-btn--active");
      btn.setAttribute("aria-label", "Stop listening");
    } else {
      btn.classList.remove("voice-btn--active");
      btn.setAttribute("aria-label", "Start voice input");
    }
  });

  const fab = document.querySelector(".voice-fab");
  if (fab) {
    if (listening) {
      fab.classList.add("voice-fab--active");
    } else {
      fab.classList.remove("voice-fab--active");
    }
  }
}

// Voice button HTML generator for form fields
function voiceButtonHTML(fieldId) {
  return `<button type="button" class="voice-btn" onclick="startListening(document.getElementById('${fieldId}'))" aria-label="Start voice input" title="Voice input">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  </button>`;
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initVoice);
