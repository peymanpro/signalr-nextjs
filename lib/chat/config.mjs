export const chatConfig = {
  hubUrl: process.env.NEXT_PUBLIC_SIGNALR_HUB_URL ?? "http://localhost:5000/chat",
  maxMessageLength: 2000,
  maxUsernameLength: 32,
  typingTimeoutMs: 1400,
};
