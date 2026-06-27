import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { api } from '../../api'
import type { ChatMsg } from '../../types'
import { AdminFieldLabel } from '../../components/AdminFieldLabel'
import { HELP } from '../../adminHelpText'
import { SendIcon } from '../../components/icons/uiIcons'

interface LiveChatPanelProps {
  eventId?: number
  flowSlug?: string
}

export function LiveChatPanel({ eventId, flowSlug = 'default' }: LiveChatPanelProps) {
  const [sessions, setSessions] = useState<Array<{ sessionId: string; lastMessage: string; lastAt: string; count: number }>>([])
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [reply, setReply] = useState('')
  const hubRef = useRef<signalR.HubConnection | null>(null)

  const loadSessions = () => {
    const req = eventId ? api.getEventChatSessions(eventId) : api.getChatSessions(flowSlug)
    return req.then(setSessions)
  }

  useEffect(() => {
    loadSessions()
    const hub = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/chat', { withCredentials: true })
      .withAutomaticReconnect()
      .build()

    hub.on('ReceiveMessage', (msg: ChatMsg & { sessionId: string }) => {
      if (msg.role === 'user' && Notification.permission === 'granted') {
        new Notification('New chat message', { body: msg.text })
      }
      loadSessions()
      if (activeSession && msg.sessionId === activeSession) {
        setMessages(prev => [...prev, {
          role: msg.role as ChatMsg['role'],
          text: msg.text,
          id: msg.id,
          source: msg.source,
        }])
      }
    })

    hub.start().then(() => hub.invoke('JoinAdmin')).catch(console.error)
    hubRef.current = hub

    if (Notification.permission === 'default') Notification.requestPermission()

    return () => { hub.stop() }
  }, [activeSession, eventId, flowSlug])

  const selectSession = async (sessionId: string) => {
    setActiveSession(sessionId)
    const msgs = await api.getSessionMessages(sessionId)
    setMessages(msgs.map(m => ({ role: m.role as ChatMsg['role'], text: m.text, id: m.id, source: m.source })))
  }

  const sendReply = async () => {
    if (!activeSession || !reply.trim()) return
    const text = reply.trim()
    setReply('')
    if (hubRef.current?.state === signalR.HubConnectionState.Connected) {
      await hubRef.current.invoke('AdminReply', activeSession, text)
    } else {
      await api.adminReply(activeSession, text)
    }
    setMessages(prev => [...prev, { role: 'assistant', text }])
  }

  return (
    <>
      <h2>Live Chat</h2>
      {eventId && (
        <p style={{ color: '#9b9d9f', fontSize: 13, marginBottom: 16 }}>
          Sessions linked to this event only.
        </p>
      )}
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ width: 280, flexShrink: 0 }}>
          <div className="admin-card">
            <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Sessions</h3>
            <div className="chat-session-list">
              {sessions.map(s => (
                <div
                  key={s.sessionId}
                  className={`chat-session-item${activeSession === s.sessionId ? ' active' : ''}`}
                  onClick={() => selectSession(s.sessionId)}
                >
                  <div>{s.lastMessage.slice(0, 60)}{s.lastMessage.length > 60 ? '...' : ''}</div>
                  <small>{s.count} messages · {new Date(s.lastAt).toLocaleString()}</small>
                </div>
              ))}
              {sessions.length === 0 && <p style={{ color: '#5f6164', fontSize: 13 }}>No chat sessions yet.</p>}
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="admin-card" style={{ minHeight: 400, display: 'flex', flexDirection: 'column' }}>
            {activeSession ? (
              <>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#9b9d9f' }}>
                  Session: {activeSession.slice(0, 8)}...
                </h3>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
                  {messages.map((m, i) => (
                    <div key={i} style={{
                      marginBottom: 8,
                      textAlign: m.role === 'user' ? 'right' : 'left',
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: m.role === 'user' ? 'rgba(85, 230, 193, 0.15)' : 'var(--admin-bg)',
                        fontSize: 13,
                        maxWidth: '80%',
                      }}>
                        {m.source && m.source !== 'demo' && m.role !== 'user' && (
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--admin-accent)', textTransform: 'uppercase', marginBottom: 2 }}>
                            {m.source}
                          </span>
                        )}
                        {m.text}
                      </span>
                    </div>
                  ))}
                </div>
                <AdminFieldLabel label="Reply" help={HELP.liveChat.reply}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="admin-input"
                      placeholder="Type a reply..."
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendReply()}
                    />
                    <button className="admin-btn btn-with-icon" onClick={sendReply}>
                      <SendIcon />
                      Send
                    </button>
                  </div>
                </AdminFieldLabel>
              </>
            ) : (
              <p style={{ color: '#5f6164' }}>Select a session to view and reply.</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
