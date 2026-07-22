'use client';
import { useState, useEffect } from "react";

export default function Chatbot({ transcript, userId }) {   // 👈 pass transcript or userId
  // IMMEDIATE LOG - runs before anything else
  console.log('🚨🚨🚨 CHATBOT COMPONENT RENDERING 🚨🚨🚨');
  console.log('Current page:', typeof window !== 'undefined' ? window.location.href : 'SSR');
  console.log('Props received:', {
    transcript: { value: transcript, type: typeof transcript, length: transcript?.length || 0 },
    userId: { value: userId, type: typeof userId }
  });

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Ask any question regarding the meeting." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Log transcript prop on component mount and updates
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 CHATBOT COMPONENT RECEIVED PROP:');
    console.log('Current URL:', window.location.pathname + window.location.search);
    console.log('transcript value:', transcript);
    console.log('transcript details:', {
      hasTranscript: !!transcript,
      transcriptType: typeof transcript,
      transcriptLength: transcript?.length || 0,
      transcriptPreview: transcript?.substring(0, 150) || 'N/A',
      isEmptyString: transcript === '',
      isNull: transcript === null,
      isUndefined: transcript === undefined
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }, [transcript]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const question = input.trim();
    setMessages(prev => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📤 CHATBOT SEND MESSAGE STARTED');
      console.log('Question:', question);
      console.log('Transcript prop:', {
        exists: !!transcript,
        type: typeof transcript,
        length: transcript?.length || 0,
        preview: transcript?.substring(0, 100) || 'N/A'
      });

      const payload = transcript
        ? { question, transcript }                    // 👈 Saved meeting - pass transcript
        : userId
          ? { question, user_id: userId, mode: 'live' } // 👈 Live mode - pass user_id + mode
          : { question };                                // 👈 Fallback - just question

      console.log('📦 Payload created:', {
        keys: Object.keys(payload),
        hasTranscript: !!payload.transcript,
        hasUserId: !!payload.user_id,
        transcriptLength: payload.transcript?.length || 0
      });

      // Call chatbot service via Next.js API proxy
      console.log('🌐 Fetching /api/backend/ask...');
      const res = await fetch("/api/backend/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Response received:', {
        status: res.status,
        ok: res.ok,
        statusText: res.statusText
      });

      let answer = "Failed to fetch answer.";
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Success response data:', data);
        answer = data.answer || "No answer found.";
      } else {
        const error = await res.json();
        console.error("❌ Error response data:", error);
        answer = error.detail || error.error || "Failed to fetch answer.";
      }

      console.log('💬 Final answer:', answer);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setMessages(prev => [...prev, { role: "bot", text: answer }]);
    } catch (err) {
      console.error("❌ CHATBOT ERROR:", err);
      console.error("Error details:", {
        message: err.message,
        stack: err.stack
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      setMessages(prev => [...prev, { role: "bot", text: "Error fetching answer." }]);
    } finally {
      setLoading(false);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    setMessages([{ role: "bot", text: "Ask any question regarding the meeting." }]); // reset
  };

  return (
    <div>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-violet-600 hover:bg-violet-700 text-white rounded-full p-4 shadow-lg text-2xl"
        >
          💬
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className="
            fixed bottom-6 right-6
            w-[90vw] max-w-sm md:w-96
            h-96 max-h-[80vh]
            bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl
            flex flex-col overflow-hidden
          "
        >
          {/* Header */}
          <div className="flex justify-between items-center bg-violet-700 text-white px-4 py-2">
            <span className="font-semibold">Meeting Assistant</span>
            <button onClick={closeChat} className="text-lg font-bold">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg max-w-[80%] ${m.role === "user"
                    ? "ml-auto bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-200"
                  }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="bg-zinc-800 text-zinc-400 p-2 rounded-lg max-w-[80%]">
                Searching for answer...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex border-t border-zinc-700">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your question..."
              className="flex-1 bg-zinc-900 text-zinc-200 px-3 py-2 text-sm focus:outline-none"
            />
            <button
              onClick={sendMessage}
              className="px-4 bg-violet-600 hover:bg-violet-700 text-white text-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
