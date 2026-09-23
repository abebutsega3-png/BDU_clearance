import { useState } from 'react';
import axios from 'axios';
import { Bot, ChevronDown, Minimize2, Send, X } from 'lucide-react';

const initialMessages = [
  {
    role: 'assistant',
    content: "Hello! I'm your Bahir Dar University Employee Clearance Assistant. How can I help you today?",
  },
  {
    role: 'assistant',
    content: 'You can ask me about clearance requests, clearance status, Finance, Library, Property, ICT, and certificate downloads.',
  },
];

export default function EmployeeClearanceChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async (event) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    const nextMessages = [...messages, { role: 'user', content: message }];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const response = await axios.post('/api/ai/chat', {
        message,
        history: nextMessages.slice(-8),
      });
      setMessages((current) => [...current, { role: 'assistant', content: response.data.reply }]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: 'The assistant is temporarily unavailable. Please contact the support office during working hours.' },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section className="flex h-[min(620px,calc(100vh-110px))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-2xl shadow-blue-950/20" aria-label="Employee Clearance Assistant">
          <header className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25"><Bot size={22} /></span>
              <div>
                <h2 className="text-sm font-bold">Employee Clearance Assistant</h2>
                <p className="text-[11px] text-blue-100">Powered by your clearance help center</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-md p-2 text-blue-100 hover:bg-white/15 hover:text-white" aria-label="Minimize assistant" title="Minimize assistant"><Minimize2 size={17} /></button>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-md p-2 text-blue-100 hover:bg-white/15 hover:text-white" aria-label="Close assistant" title="Close assistant"><X size={18} /></button>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-3 py-4" aria-live="polite">
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`flex items-end gap-2 ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {item.role === 'assistant' && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Bot size={15} /></span>}
                <div className={`max-w-[82%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${item.role === 'user' ? 'rounded-br-sm bg-blue-600 text-white' : 'rounded-bl-sm bg-white text-slate-700 shadow-sm ring-1 ring-slate-200'}`}>
                  {item.content}
                </div>
              </div>
            ))}
            {isSending && <div className="ml-9 text-xs text-slate-400">Assistant is typing...</div>}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 bg-white p-3">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type your message..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" aria-label="Message" />
            <button type="submit" disabled={!input.trim() || isSending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message" title="Send message"><Send size={17} /></button>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setIsOpen((current) => !current)} className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/30 ring-4 ring-white transition hover:scale-105 hover:bg-blue-700" aria-label={isOpen ? 'Close assistant' : 'Open assistant'} title={isOpen ? 'Close assistant' : 'Open assistant'}>
        {isOpen ? <ChevronDown size={25} /> : <Bot size={27} />}
      </button>
    </div>
  );
}
