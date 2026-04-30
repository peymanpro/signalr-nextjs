"use client";

import { useState, useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";

export default function Home() {
  const [connection, setConnection] = useState(null);
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (username, message, time, isOwn) => {
    setMessages(prev => [...prev, { username, message, time, isOwn }]);
  };

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, {
      username: "System",
      message: text,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      isOwn: false
    }]);
  };

  const joinChat = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      alert("Please enter a username");
      return;
    }

    setIsConnecting(true);

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5000/chat")
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Event handlers
    newConnection.on("welcome", (data) => {
      addSystemMessage(`✨ ${data.message}`);
      setOnlineUsers(data.users);
    });

    newConnection.on("user-joined", (data) => {
      addSystemMessage(`📥 ${data.message}`);
    });

    newConnection.on("user-left", (data) => {
      addSystemMessage(`📤 ${data.message}`);
    });

    newConnection.on("new-message", (data) => {
      const isOwn = data.username === trimmedUsername;
      addMessage(data.username, data.message, data.time, isOwn);
    });

    newConnection.on("online-users", (users) => {
      setOnlineUsers(users);
    });

    newConnection.on("user-typing", (data) => {
      if (data.isTyping && data.username !== trimmedUsername) {
        setTypingUser(data.username);
      } else if (!data.isTyping && typingUser === data.username) {
        setTypingUser(null);
      }
    });

    try {
      await newConnection.start();
      setConnection(newConnection);
      setConnectionStatus("connected");
      await newConnection.invoke("UserJoin", trimmedUsername);
      setIsJoined(true);
      addSystemMessage("✅ Connected to SignalR hub");
    } catch (err) {
      console.error("Connection error:", err);
      addSystemMessage(`❌ Connection failed: ${err.message}`);
      setConnectionStatus("disconnected");
    } finally {
      setIsConnecting(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !connection) return;

    try {
      await connection.invoke("SendMessage", inputMessage);
      setInputMessage("");
      await connection.invoke("TypingStop");
    } catch (err) {
      console.error("Send error:", err);
      addSystemMessage(`❌ Failed to send message: ${err.message}`);
    }
  };

  const handleTyping = async () => {
    if (!connection) return;
    
    await connection.invoke("TypingStart");
    
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    
    typingTimerRef.current = setTimeout(async () => {
      await connection.invoke("TypingStop");
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "900px",
        height: "90vh",
        background: "white",
        borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "slideIn 0.3s ease-out"
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "20px 25px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <div>
            <h1 style={{ fontSize: "1.3rem", marginBottom: "5px" }}>💬 SignalR Chat Client</h1>
            <p style={{ fontSize: "0.8rem", opacity: 0.9 }}>Next.js + SignalR Real-time Demo</p>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255,255,255,0.2)",
            padding: "8px 15px",
            borderRadius: "20px",
            fontSize: "0.8rem"
          }}>
            <div style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: connectionStatus === "connected" ? "#4ade80" : "#f87171",
              animation: connectionStatus === "connected" ? "pulse 2s infinite" : "none"
            }} />
            <span>{connectionStatus === "connected" ? "Connected" : "Disconnected"}</span>
          </div>
        </div>

        {/* Join Section */}
        {!isJoined && (
          <div style={{ background: "#f8f9fa", padding: "20px 25px", borderBottom: "1px solid #e0e0e0" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && joinChat()}
                placeholder="Enter your username..."
                maxLength={20}
                disabled={isConnecting}
                style={{
                  flex: 1,
                  padding: "12px 15px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  outline: "none"
                }}
              />
              <button
                onClick={joinChat}
                disabled={isConnecting}
                style={{
                  padding: "12px 25px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  cursor: "pointer",
                  transition: "transform 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                {isConnecting ? "Connecting..." : "🚀 Join Chat"}
              </button>
            </div>
          </div>
        )}

        {/* Online Users */}
        {isJoined && onlineUsers.length > 0 && (
          <div style={{ background: "#f8f9fa", padding: "10px 25px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "0.9rem" }}>
            <span style={{ fontWeight: "bold", color: "#667eea" }}>👥 Online:</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {onlineUsers.map((user, idx) => (
                <span key={idx} style={{ background: "#e0e7ff", color: "#4c51bf", padding: "4px 12px", borderRadius: "15px", fontSize: "0.8rem" }}>
                  {user}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 25px",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                flexDirection: "column",
                maxWidth: msg.username === "System" ? "100%" : "70%",
                alignItems: msg.username === "System" ? "center" : (msg.isOwn ? "flex-end" : "flex-start"),
                alignSelf: msg.username === "System" ? "center" : "auto",
                width: msg.username === "System" ? "100%" : "auto",
                animation: "fadeIn 0.2s ease-out"
              }}
            >
              {msg.username !== "System" && (
                <div style={{
                  fontSize: "0.7rem",
                  marginBottom: "3px",
                  padding: "0 5px",
                  textAlign: msg.isOwn ? "right" : "left",
                  color: msg.isOwn ? "#667eea" : "#6b7280"
                }}>
                  {msg.isOwn ? "You" : msg.username}
                </div>
              )}
              <div style={msg.username === "System" ? {
                color: "#6b7280",
                fontSize: "0.8rem",
                fontStyle: "italic",
                textAlign: "center",
                width: "100%"
              } : {
                padding: "10px 15px",
                borderRadius: "18px",
                wordWrap: "break-word",
                fontSize: "0.95rem",
                background: msg.isOwn ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#f3f4f6",
                color: msg.isOwn ? "white" : "#1f2937",
                borderBottomRightRadius: msg.isOwn ? "5px" : "18px",
                borderBottomLeftRadius: msg.isOwn ? "18px" : "5px"
              }}>
                {msg.message}
              </div>
              {msg.username !== "System" && (
                <div style={{
                  fontSize: "0.65rem",
                  marginTop: "3px",
                  padding: "0 5px",
                  color: "#9ca3af",
                  textAlign: msg.isOwn ? "right" : "left"
                }}>
                  {msg.time}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator */}
        {typingUser && (
          <div style={{ padding: "5px 25px", color: "#667eea", fontSize: "0.8rem", fontStyle: "italic" }}>
            {typingUser} is typing...
          </div>
        )}

        {/* Input Area */}
        {isJoined && (
          <div style={{ background: "white", padding: "15px 25px", borderTop: "1px solid #e0e0e0", display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onKeyDown={handleTyping}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: "12px 15px",
                border: "2px solid #e0e0e0",
                borderRadius: "25px",
                fontSize: "1rem",
                outline: "none"
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                padding: "12px 25px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "25px",
                fontSize: "1rem",
                cursor: "pointer",
                transition: "transform 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              📤 Send
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}