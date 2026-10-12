import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, Mail, MessageCircle, Search, Send, UserRound } from 'lucide-react';

const API_URL = '/api/hr/contact-messages';

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
};

const fetchContactMessages = async () => {
  const response = await axios.get(API_URL, authConfig());
  return response.data.data || [];
};

export default function HRContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let active = true;
    const loadMessages = async () => {
      try {
        const result = await fetchContactMessages();
        if (active) setMessages(result);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Unable to load contact messages.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadMessages();
    return () => { active = false; };
  }, []);

  const refreshMessages = async () => {
    setLoading(true);
    setError('');
    try {
      setMessages(await fetchContactMessages());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load contact messages.');
    } finally {
      setLoading(false);
    }
  };

  const submitReply = async (event) => {
    event.preventDefault();
    if (!replyingTo || !replyText.trim()) return;

    setSending(true);
    setReplyError('');
    try {
      const response = await axios.put(
        `${API_URL}/${replyingTo._id}/reply`,
        { replyMessage: replyText.trim() },
        authConfig(),
      );
      setMessages((current) => current.map((message) => (
        message._id === replyingTo._id ? response.data.data : message
      )));
      setReplyingTo(null);
      setReplyText('');
      setSuccessMessage('Reply sent and employee notified.');
      window.setTimeout(() => setSuccessMessage(''), 5000);
    } catch (requestError) {
      setReplyError(requestError.response?.data?.message || 'Unable to send reply.');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (message) => {
    try {
      const response = await axios.patch(`${API_URL}/${message._id}/read`, {}, authConfig());
      setMessages((current) => current.map((item) => item._id === message._id ? response.data.data : item));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update message status.');
    }
  };

  const unreadCount = messages.filter((message) => message.status === 'Unread').length;
  const repliedCount = messages.filter((message) => message.status === 'Replied').length;
  const normalizedSearch = search.trim().toLowerCase();
  const visibleMessages = messages.filter((message) => {
    if (activeFilter !== 'All' && message.status !== activeFilter) return false;
    return !normalizedSearch || [
      message.fullName,
      message.employeeId,
      message.email,
      message.subject,
      message.category,
      message.message,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
  });

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">HR Support Inbox</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Contact Messages</h1>
          <p className="mt-1 text-xs text-slate-500">Read employee inquiries and reply directly to their notification inbox.</p>
        </div>
        <button type="button" onClick={refreshMessages} disabled={loading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Total HR messages" value={messages.length} />
        <SummaryCard label="Unread" value={unreadCount} />
        <SummaryCard label="Replied" value={repliedCount} />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search contact messages</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, employee ID, email, or message" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
        </label>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Contact message status">
          {['All', 'Unread', 'Read', 'Replied'].map((filter) => (
            <button key={filter} type="button" role="tab" aria-selected={activeFilter === filter} onClick={() => setActiveFilter(filter)} className={`rounded-md px-3 py-2 text-xs font-semibold ${activeFilter === filter ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600'}`}>
              {filter}
            </button>
          ))}
        </div>
      </div>

      {successMessage && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading HR contact messages...</p>
      ) : visibleMessages.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{search || activeFilter !== 'All' ? 'No messages match these filters.' : 'No HR contact messages yet.'}</p>
      ) : (
        <div className="space-y-3">
          {visibleMessages.map((message) => (
            <article key={message._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">{message.subject}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${message.status === 'Replied' ? 'bg-teal-50 text-teal-700' : message.status === 'Unread' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{message.status}</span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{message.category}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><UserRound size={13} />{message.fullName} · {message.employeeId}</span>
                    <a href={`mailto:${message.email}`} className="inline-flex items-center gap-1 hover:text-teal-700"><Mail size={13} />{message.email}</a>
                    <span>{formatDate(message.createdAt)}</span>
                  </div>
                </div>
                {message.status !== 'Replied' && <div className="flex shrink-0 gap-2">
                  {message.status === 'Unread' && <button type="button" onClick={() => markAsRead(message)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Mark read</button>}
                  <button type="button" onClick={() => { setReplyingTo(message); setReplyText(''); setReplyError(''); }} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800">
                    <MessageCircle size={14} />Reply
                  </button>
                </div>}
              </div>
              <div className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{message.message}</div>
              {message.status === 'Replied' && (
                <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-teal-800"><CheckCircle2 size={14} />Your reply · {formatDate(message.repliedAt)}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-teal-950">{message.replyMessage}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {replyingTo && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !sending) setReplyingTo(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="contact-reply-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
          <h2 id="contact-reply-title" className="text-base font-bold text-slate-900">Reply to {replyingTo.fullName}</h2>
          <p className="mt-1 text-xs text-slate-500">{replyingTo.employeeId} · {replyingTo.email}</p>
          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600">{replyingTo.subject} · {replyingTo.category}</p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{replyingTo.message}</p>
          </div>
          <form onSubmit={submitReply} className="mt-4 space-y-3">
            <label htmlFor="contact-reply" className="block text-xs font-semibold text-slate-700">Your reply</label>
            <textarea id="contact-reply" required maxLength={2000} rows={5} value={replyText} onChange={(event) => setReplyText(event.target.value)} className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" placeholder="Write your response..." />
            {replyError && <p role="alert" className="text-xs text-red-700">{replyError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={sending} onClick={() => setReplyingTo(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
              <button type="submit" disabled={sending || !replyText.trim()} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                <Send size={14} />{sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </form>
        </section>
      </div>}
    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
