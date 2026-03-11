import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API_CHATBOT = "http://localhost:3001/api/chatbot";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(API_CHATBOT, { message: text });
      const reply = res.data?.reply ?? "Xin lỗi, không nhận được phản hồi.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const errMsg = err.response?.data?.reply ?? "Đã xảy ra lỗi. Vui lòng thử lại.";
      setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Nút chat - chỉ hiện khi đóng */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#d4a441] text-black shadow-lg hover:bg-[#c49431] transition-all flex items-center justify-center"
          aria-label="Mở chat"
        >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        </button>
      )}

      {/* Khung chat */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden ${
            isMinimized ? "" : "h-[70vh]"
          }`}
        >
          {/* Header - click để mở lại khi thu nhỏ */}
          <div
            onClick={() => isMinimized && setIsMinimized(false)}
            className={`px-4 py-3 bg-[#d4a441] text-black font-semibold flex items-center justify-between ${isMinimized ? "cursor-pointer" : ""}`}
          >
            <span>Chat với MenZone AI</span>
            <div className="flex items-center gap-1">
              {!isMinimized && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(true);
                  }}
                  className="p-1 rounded hover:bg-black/20 transition-colors"
                  aria-label="Thu nhỏ"
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="p-1 rounded hover:bg-black/20 transition-colors"
                aria-label="Đóng chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Body - ẩn khi thu nhỏ */}
          {!isMinimized && (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-zinc-950">
                {messages.length === 0 && (
                  <p className="text-zinc-500 text-xs text-center py-4 leading-relaxed">
                Xin chào! Tôi là trợ lý AI của MenZone. Bạn cần tôi hỗ trợ gì?
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#d4a441] text-black"
                      : "bg-zinc-800 text-zinc-100 border border-zinc-700"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-lg text-xs leading-relaxed text-zinc-400">
                  Đang suy nghĩ...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              disabled={loading}
              className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#d4a441] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-[#d4a441] text-black font-medium rounded-lg hover:bg-[#c49431] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Gửi
            </button>
          </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
