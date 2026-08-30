import { useState, useRef, useEffect } from "react";
import { useGameStore } from "../../store/game-store";
import styles from "./game.module.css";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const chatMessages = useGameStore((s) => s.chatMessages);
  const sendChatMessage = useGameStore((s) => s.sendChatMessage);
  const myPlayerId = useGameStore((s) => s.playerId);
  const mode = useGameStore((s) => s.mode);
  const connected = useGameStore((s) => s.connected);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (mode !== "multiplayer") return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !connected) return;
    
    // Only send if within arbitrary max char limit (200 is server limit)
    if (input.length > 200) {
      alert("Message too long");
      return;
    }

    sendChatMessage(input.trim());
    setInput("");
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatMessages}>
        {chatMessages.length === 0 && (
          <div style={{ opacity: 0.5, fontSize: "0.85rem", textAlign: "center", marginTop: "1rem" }}>
            No messages yet.
          </div>
        )}
        {chatMessages.map((m, i) => {
          const isMe = m.playerId === myPlayerId;
          return (
            <div key={i} className={styles.chatMessage} style={{
              alignSelf: isMe ? "flex-end" : "flex-start",
              backgroundColor: isMe ? "var(--ink)" : "var(--muted)",
              color: isMe ? "var(--paper)" : "var(--paper)",
              padding: "0.5rem 0.75rem",
              borderRadius: "4px",
              marginBottom: "0.5rem",
              maxWidth: "85%",
              wordBreak: "break-word"
            }}>
              {!isMe && (
                <div style={{ fontSize: "0.7rem", opacity: 0.8, marginBottom: "0.15rem", textTransform: "uppercase" }}>
                  {m.playerName}
                </div>
              )}
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                <span>{m.message}</span>
                <span style={{ fontSize: "0.6rem", opacity: 0.6, whiteSpace: "nowrap" }}>
                  {formatTime(m.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className={styles.chatForm} style={{ display: "flex", gap: "0.5rem", padding: "0.5rem", borderTop: "2px solid var(--ink)" }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder={connected ? "Send message..." : "Reconnecting..."}
          disabled={!connected}
          maxLength={200}
          className={styles.chatInput}
          style={{ flex: 1, padding: "0.5rem", border: "2px solid var(--ink)", background: "transparent", color: "var(--ink)", outline: "none", fontFamily: "var(--font-ui)" }}
        />
        <button 
          type="submit" 
          disabled={!input.trim() || !connected}
          className={styles.chatButton}
          style={{ background: "var(--ink)", color: "var(--paper)", border: "none", padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "var(--font-ui)", textTransform: "uppercase", fontWeight: 700 }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
