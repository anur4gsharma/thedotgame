import { useState } from "react";
import styles from "./game.module.css";

export function ChatPanel() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((prev) => [...prev, input]);
    setInput("");
  };

  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatMessages}>
        {messages.map((m, i) => (
          <div key={i} className={styles.chatMessage}>{m}</div>
        ))}
      </div>
      <form onSubmit={handleSend} className={styles.chatForm}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chat..."
          className={styles.chatInput}
        />
        <button type="submit" className={styles.chatButton}>Send</button>
      </form>
    </div>
  );
}
