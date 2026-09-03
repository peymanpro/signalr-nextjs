import test from "node:test";
import assert from "node:assert/strict";
import { chatReducer, CONNECTION_STATUS, createMessage, initialChatState } from "../lib/chat/reducer.mjs";

test("normalizes valid realtime messages and rejects empty payloads", () => {
  assert.equal(createMessage({ username: "A", message: "   " }), null);
  const message = createMessage({ username: "  Ada  ", message: " hello ", time: "2026-01-01T10:00:00.000Z" });
  assert.deepEqual(message.username, "Ada");
  assert.equal(message.message, "hello");
});

test("deduplicates messages and defensively cleans presence data", () => {
  const message = createMessage({ id: "m-1", username: "Ada", message: "Hello" });
  const once = chatReducer(initialChatState, { type: "message", message });
  const twice = chatReducer(once, { type: "message", message });
  assert.equal(twice.messages.length, 1);
  const withUsers = chatReducer(twice, { type: "users", users: ["Ada", " Ada ", null, "Ben", ""] });
  assert.deepEqual(withUsers.users, ["Ada", "Ben"]);
});

test("models connection transitions and error state explicitly", () => {
  const connecting = chatReducer(initialChatState, { type: "status", status: CONNECTION_STATUS.CONNECTING });
  const failed = chatReducer(connecting, { type: "status", status: CONNECTION_STATUS.FAILED, error: "Unavailable" });
  assert.equal(failed.status, "failed");
  assert.equal(failed.error, "Unavailable");
  assert.deepEqual(chatReducer(failed, { type: "reset" }), initialChatState);
});
