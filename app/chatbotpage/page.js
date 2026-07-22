'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../header/page";

export default function ChatbotPage() {
  console.log("🔄 ChatbotPage component initialized");

  const [messages, setMessages] = useState([
    { role: "bot", text: "Hello 👋 Ask me anything about your meetings." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const sendMessage = async () => {
    console.log("📤 sendMessage called with input:", input);
    if (!input.trim()) {
      console.log("⚠️ Input is empty, returning early");
      return;
    }

    const question = input.trim();
    console.log("💬 Processing question:", question);
    setMessages(prev => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const userId = localStorage.getItem("userId");
      console.log("👤 Retrieved userId from localStorage:", userId);
      if (!userId) {
        console.log("❌ No userId found, showing login message");
        setMessages(prev => [...prev, { role: "bot", text: "⚠️ You must be logged in." }]);
        return;
      }

      console.log("🌐 Making API request via proxy to /api/backend/ask");
      const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
      const res = await fetch("/api/backend/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        body: JSON.stringify({ question, user_id: userId }),
      });
      console.log("📡 API response status:", res.status, res.statusText);

      let answer = "Failed to fetch answer.";
      if (res.ok) {
        const data = await res.json();
        console.log("✅ API response data:", data);
        answer = data.answer || "No answer found.";
      } else {
        console.log("❌ API request failed, response:", await res.text());
      }

      console.log("💬 Adding bot response:", answer);
      setMessages(prev => [...prev, { role: "bot", text: answer }]);
    } catch (err) {
      console.error("💥 Error in sendMessage:", err);
      setMessages(prev => [...prev, { role: "bot", text: "❌ Error fetching answer." }]);
    } finally {
      console.log("🏁 sendMessage completed, setting loading to false");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    console.log("🚪 handleLogout called");
    try {
      await fetch('/api/logout', { method: 'POST' });
      console.log("✅ Logout API call completed");
      router.push('/login');
      console.log("🔄 Redirecting to /login");
    } catch (err) {
      console.error("💥 Error during logout:", err);
    }
  };

  return (
    <>
      <Header handleLogout={handleLogout} />
      <div className="min-h-screen font-sans overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <main className="flex-1 px-6 sm:px-10 py-10 overflow-auto ml-0 md:ml-5">
          <div className="w-full max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Meeting Assistant</h1>

            <div className="flex flex-col h-[calc(100vh-200px)] rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm shadow-2xl overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl max-w-[80%] ${m.role === "user"
                        ? "ml-auto bg-violet-600 text-white shadow-lg"
                        : "bg-zinc-800 text-zinc-200 border border-zinc-700"
                      }`}
                  >
                    {m.text}
                  </div>
                ))}
                {loading && (
                  <div className="bg-zinc-800 text-zinc-400 p-4 rounded-xl max-w-[80%] border border-zinc-700">
                    Searching for answer...
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex border-t border-zinc-800 bg-zinc-900">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => {
                    console.log("⌨️ Input changed to:", e.target.value);
                    setInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      console.log("⏎ Enter key pressed, calling sendMessage");
                      sendMessage();
                    }
                  }}
                  placeholder="Type your question..."
                  className="flex-1 bg-zinc-900 text-white px-6 py-4 focus:outline-none focus:ring-2 focus:ring-violet-600"
                />
                <button
                  onClick={() => {
                    console.log("🖱️ Send button clicked");
                    sendMessage();
                  }}
                  className="px-8 bg-violet-600 hover:bg-violet-700 text-white font-semibold transition"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}