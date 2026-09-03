export const CONNECTION_STATUS = Object.freeze({
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  FAILED: "failed",
});

export const initialChatState = {
  status: CONNECTION_STATUS.DISCONNECTED,
  messages: [],
  users: [],
  typingUser: null,
  error: null,
};


export function createMessage({ username, message, time, id, isOwn = false, type = "message" }) {
  const content = typeof message === "string" ? message.trim() : "";
  if (!content) return null;
  return {
    id: typeof id === "string" && id ? id : `${type}-${username ?? "system"}-${time ?? Date.now()}-${content}`,
    username: typeof username === "string" && username.trim() ? username.trim() : "Unknown participant",
    message: content,
    time: typeof time === "string" && time ? time : new Date().toISOString(),
    isOwn,
    type,
  };
}

export function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Just now";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function uniqueUsers(users) {
  if (!Array.isArray(users)) return [];
  return [...new Set(users.filter((user) => typeof user === "string" && user.trim()).map((user) => user.trim()))]
    .sort((a, b) => a.localeCompare(b));
}

export function chatReducer(state, action) {
  switch (action.type) {
    case "status":
      return { ...state, status: action.status, error: action.error ?? null };
    case "users":
      return { ...state, users: uniqueUsers(action.users) };
    case "typing":
      return { ...state, typingUser: action.username ?? null };
    case "message": {
      if (!action.message || state.messages.some((item) => item.id === action.message.id)) return state;
      return { ...state, messages: [...state.messages, action.message] };
    }
    case "reset":
      return { ...initialChatState };
    default:
      return state;
  }
}
