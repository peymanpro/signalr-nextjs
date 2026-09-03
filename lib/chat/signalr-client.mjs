import * as signalR from "@microsoft/signalr";

const retryDelays = [0, 2_000, 5_000, 10_000];

export function createChatConnection(hubUrl) {
  return new signalR.HubConnectionBuilder()
    .withUrl(hubUrl)
    .withAutomaticReconnect({ nextRetryDelayInMilliseconds: ({ previousRetryCount }) => retryDelays[previousRetryCount] ?? null })
    .configureLogging(process.env.NODE_ENV === "development" ? signalR.LogLevel.Information : signalR.LogLevel.Warning)
    .build();
}
