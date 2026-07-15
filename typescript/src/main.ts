import { Session, type SessionConfig } from "@unith-ai/core-client";
import "./style.css";


const config: SessionConfig = {
  orgId: import.meta.env.VITE_ORG_ID,
  headId: import.meta.env.VITE_HEAD_ID,
  apiKey: import.meta.env.VITE_API_KEY,
  language: "en-US",
  username: "TypeScript User",
  allowWakeLock: true,
  microphone: {
    provider: "eleven_labs",
    mode: "always-on",
    voiceInterruptions: true,
  },
};

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};

const avatar = $("avatar");
const statusEl = $("status");
const turnBadge = $("turn-badge");
const micBadge = $("mic-badge");
const captionEl = $("caption");
const startBtn = $<HTMLButtonElement>("start");
const timeoutEl = $("timeout");
const keepBtn = $<HTMLButtonElement>("keep");
const suggestionsEl = $("suggestions");
const messagesEl = $<HTMLUListElement>("messages");
const composer = $("composer");
const input = $<HTMLInputElement>("input");
const sendBtn = $<HTMLButtonElement>("send");
const controls = $("controls");
const micBtn = $<HTMLButtonElement>("mic");
const muteBtn = $<HTMLButtonElement>("mute");
const captionsBtn = $<HTMLButtonElement>("captions");
const stopBtn = $<HTMLButtonElement>("stop");
const endBtn = $<HTMLButtonElement>("end");


async function main() {
  statusEl.textContent = "connecting…";

  let session: Session;
  try {
    session = await Session.startDigitalHuman(avatar, config);
  } catch (err) {
    statusEl.textContent = "failed to connect";
    console.error("Failed to start digital human:", err);
    return;
  }

  // handle session state changes
  session.session.subscribe((state) => {
    statusEl.textContent =
      state.status === "connected"
        ? `connected · ${state.headInfo.name}`
        : state.status === "disconnected"
          ? `ended (${state.reason})`
          : state.status;
  });
 
  // handle connection 
  session.isSessionStarted.subscribe((started) => {
    startBtn.hidden = started || session.session.value.status !== "connected";
    composer.hidden = !started;
    controls.hidden = !started;
  });

 
  // turn state 
  session.turn.subscribe((turn) => {
    turnBadge.textContent = `turn: ${turn.state}`;
    // A new message is only accepted while idle.
    const idle = turn.state === "idle";
    input.disabled = !idle;
    sendBtn.disabled = !idle;
    stopBtn.hidden = turn.state !== "ai-speaking";
  });

  // message transcript (only visible messages are shown)
  session.messages.subscribe((messages) => {
    messagesEl.replaceChildren(
      ...messages
        .filter((m) => m.visible)
        .map((m) => {
          const li = document.createElement("li");
          li.className = `msg msg--${m.role}`;
          li.innerHTML = `<strong>${m.role === "user" ? "You" : "Assistant"}</strong> ${escapeHtml(m.text)}`;
          return li;
        })
    );
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  // chat suggestions
  session.suggestions.subscribe((suggestions) => {
    suggestionsEl.replaceChildren(
      ...suggestions.map((text) => {
        const b = document.createElement("button");
        b.className = "chip";
        b.textContent = text;
        b.onclick = () => {
          if (session.turn.value.state === "idle") session.sendMessage(text);
        };
        return b;
      })
    );
  });

  // mic status
  session.microphone.subscribe((mic) => {
    micBadge.textContent = `mic: ${mic.status}`;
    micBtn.textContent = mic.status === "off" ? "Enable mic" : "Disable mic";
  });


  session.isMuted.subscribe((muted) => {
    muteBtn.textContent = muted ? "Unmute" : "Mute";
  });
  session.captionsEnabled.subscribe((enabled) => {
    captionsBtn.textContent = `Captions: ${enabled ? "on" : "off"}`;
    if (!enabled) captionEl.textContent = "";
  });

  // captions/subtitles
  session.caption.subscribe((text) => {
    captionEl.textContent = text;
  });

  session.errors.subscribe((err) => {
    statusEl.textContent = `error: ${err.message}`;
  });


  session.timeout.subscribe((t) => {
    timeoutEl.hidden = !(t.active && t.kind === "warning");
  });

 
  // startSession() must run inside a user gesture (mobile audio policy).
  startBtn.onclick = () => session.startSession();

  const send = () => {
    const text = input.value.trim();
    if (text && session.turn.value.state === "idle") {
      session.sendMessage(text);
      input.value = "";
    }
  };
  sendBtn.onclick = send;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });

  micBtn.onclick = () => session.toggleMicrophone();
  muteBtn.onclick = () => session.toggleMute();
  captionsBtn.onclick = () => session.toggleCaptions();
  stopBtn.onclick = () => session.stopResponse();
  endBtn.onclick = () => session.endSession();
  keepBtn.onclick = () => session.keepSession();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

main();
