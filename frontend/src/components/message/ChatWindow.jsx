import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { messagesAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

const Bubble = ({ msg, isMine }) => (
  <div style={{
    display: 'flex',
    flexDirection: isMine ? 'row-reverse' : 'row',
    gap: 8, marginBottom: 10, alignItems: 'flex-end',
  }}>
    {!isMine && (
      <Avatar user={{ username: msg.username, avatar_url: msg.avatar_url }} size="xs" />
    )}
    <div style={{ maxWidth: '68%' }}>
      <div style={{
        padding: '10px 14px',
        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isMine ? 'var(--text-1)' : 'var(--surface)',
        color: isMine ? '#fff' : 'var(--text-1)',
        fontSize: 14, lineHeight: 1.5,
        border: isMine ? 'none' : '1px solid var(--border)',
        wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
      <div style={{
        fontSize: 11, color: 'var(--text-3)',
        marginTop: 4,
        textAlign: isMine ? 'right' : 'left',
      }}>
        {timeAgo(msg.created_at)}
      </div>
    </div>
  </div>
);

const ChatWindow = ({ conversation }) => {
  const { user }   = useAuth();
  const socketCtx  = useSocket();

  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [typing,   setTyping]   = useState(false);

  const bottomRef    = useRef(null);
  const typingTimer  = useRef(null);
  const sentIds      = useRef(new Set()); // track IDs we already added optimistically

  const convId = conversation?.id;
  const other  = conversation?.members?.[0];

  // ── Load messages ──────────────────────────────────────────
  useEffect(() => {
    if (!convId) return;
    setMessages([]);
    sentIds.current.clear();
    setLoading(true);
    messagesAPI.getMessages(convId, { limit: 50 })
      .then(({ data }) => {
        const msgs = data.messages || [];
        msgs.forEach(m => sentIds.current.add(m.id));
        setMessages(msgs);
      })
      .catch(() => toast.error('Could not load messages'))
      .finally(() => setLoading(false));
  }, [convId]);

  // ── Join / leave socket room ───────────────────────────────
  useEffect(() => {
    if (!convId || !socketCtx) return;
    socketCtx.joinConversation(convId);
    return () => socketCtx.leaveConversation(convId);
  }, [convId, socketCtx]);

  // ── Listen for incoming messages (from OTHER user only) ────
  useEffect(() => {
    if (!convId || !socketCtx) return;

    const handler = (msg) => {
      // Only add if it belongs to this conversation
      if (msg.conversation_id !== convId) return;
      // Skip if we already have this message (sent by us optimistically)
      if (sentIds.current.has(msg.id)) return;
      // Skip our own messages — we add them optimistically in handleSend
      if (msg.sender_id === user?.id) return;
      sentIds.current.add(msg.id);
      setMessages(prev => [...prev, msg]);
    };

    const off = socketCtx.onEvent('new_message', handler);
    return off;
  }, [convId, socketCtx, user]);

  // ── Typing indicator ───────────────────────────────────────
  useEffect(() => {
    if (!convId || !socketCtx) return;
    const off = socketCtx.onEvent('typing', ({ convId: cid, userId: uid, typing: t }) => {
      if (cid === convId && uid !== user?.id) setTyping(t);
    });
    return off;
  }, [convId, socketCtx, user]);

  // ── Scroll to bottom ───────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // ── Send message ───────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    setText('');
    setSending(true);

    // Stop typing indicator
    if (socketCtx) socketCtx.sendTyping(convId, false);
    clearTimeout(typingTimer.current);

    // Optimistic temp message
    const tempId = 'temp-' + Date.now();
    const tempMsg = {
      id: tempId,
      conversation_id: convId,
      sender_id: user.id,
      content,
      type: 'text',
      created_at: new Date().toISOString(),
      username: user.username,
      avatar_url: user.avatar_url,
    };
    sentIds.current.add(tempId);
    setMessages(prev => [...prev, tempMsg]);

    try {
      const { data } = await messagesAPI.sendMessage(convId, { content, type: 'text' });
      // Mark real ID so socket doesn't duplicate it
      sentIds.current.add(data.id);
      sentIds.current.delete(tempId);
      // Replace temp with real message
      setMessages(prev => prev.map(m =>
        m.id === tempId
          ? { ...data, username: user.username, avatar_url: user.avatar_url }
          : m
      ));
    } catch (err) {
      toast.error('Failed to send message');
      sentIds.current.delete(tempId);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (!socketCtx) return;
    socketCtx.sendTyping(convId, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socketCtx.sendTyping(convId, false), 1500);
  };

  // ── Empty state ────────────────────────────────────────────
  if (!conversation) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column',
        gap: 14, color: 'var(--text-3)',
      }}>
        <div style={{ fontSize: 52, animation: 'float 3s ease-in-out infinite' }}>✉</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-2)' }}>
          Your messages
        </div>
        <div style={{ fontSize: 14 }}>
          Go to a profile and click Message to start a chat
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface)', flexShrink: 0,
      }}>
        {other && (
          <>
            <Avatar user={other} size="sm" />
            <Link to={`/profile/${other.username}`} style={{ fontWeight: 600, fontSize: 15 }}>
              {other.username}
            </Link>
          </>
        )}
        {conversation.is_group && (
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {conversation.name || 'Group chat'}
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <Spinner size={28} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            <div style={{ fontSize: 14 }}>
              Say hello to <strong>{other?.username}</strong>!
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <Bubble key={msg.id} msg={msg} isMine={msg.sender_id === user?.id} />
            ))}
            {typing && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <Avatar user={other} size="xs" />
                <div style={{
                  padding: '8px 14px',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: 13, color: 'var(--text-3)',
                }}>
                  typing…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10,
          background: 'var(--surface)', flexShrink: 0,
        }}
      >
        <input
          className="input"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          style={{ flex: 1, fontSize: 14 }}
          autoFocus
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          style={{
            padding: '10px 20px', fontSize: 14, fontWeight: 600,
            background: text.trim() ? 'var(--text-1)' : 'var(--border)',
            color: text.trim() ? '#fff' : 'var(--text-3)',
            border: 'none', borderRadius: 'var(--radius-sm)',
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            transition: 'all .15s',
            display: 'flex', alignItems: 'center', gap: 6,
            flexShrink: 0,
          }}
        >
          {sending ? <Spinner size={14} color="#fff" /> : 'Send'}
        </button>
      </form>

    </div>
  );
};

export default ChatWindow;
