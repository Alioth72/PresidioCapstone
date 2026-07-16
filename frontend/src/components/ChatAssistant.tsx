import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi, type ChatMessage } from '../api';
import { useStore } from '../store';
import { MessageSquare, X, Send, Bot, Trash2 } from 'lucide-react';

interface ChatAssistantProps {
  onRefreshCatalog?: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ onRefreshCatalog }) => {
  const { user, showToast } = useStore();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const { data: messages = [] } = useQuery({
    queryKey: ['chatHistory'],
    queryFn: () => chatApi.getHistory(),
    enabled: isOpen && !!user,
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: (text: string) => chatApi.sendMessage(text),
    onMutate: async (newText) => {
      await queryClient.cancelQueries({ queryKey: ['chatHistory'] });
      const previousHistory = queryClient.getQueryData<ChatMessage[]>(['chatHistory']) || [];

      // Optimistically append user message
      const tempUserMsg: ChatMessage = {
        id: Date.now(),
        role: 'user',
        content: newText,
        actions_taken: [],
        created_at: new Date().toISOString()
      };

      queryClient.setQueryData<ChatMessage[]>(['chatHistory'], [...previousHistory, tempUserMsg]);

      return { previousHistory };
    },
    onSuccess: (res, variables, context) => {
      const assistantMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.reply,
        actions_taken: res.actions_taken,
        created_at: new Date().toISOString()
      };

      const previousHistory = context?.previousHistory || [];
      const tempUserMsg: ChatMessage = {
        id: Date.now() - 1,
        role: 'user',
        content: variables,
        actions_taken: [],
        created_at: new Date().toISOString()
      };

      queryClient.setQueryData<ChatMessage[]>(['chatHistory'], [...previousHistory, tempUserMsg, assistantMsg]);

      if (res.actions_taken.some(act => act.toLowerCase().includes('borrow') || act.toLowerCase().includes('return'))) {
        queryClient.invalidateQueries({ queryKey: ['books'] });
        queryClient.invalidateQueries({ queryKey: ['loans'] });
        if (onRefreshCatalog) onRefreshCatalog();
      }
    },
    onError: (err: any, _variables, context) => {
      if (context?.previousHistory) {
        queryClient.setQueryData(['chatHistory'], context.previousHistory);
      }
      const msg = err.response?.data?.error?.message || 'AI assistant had trouble responding.';
      showToast(msg, 'error');
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMessageMutation.isPending) return;

    const userMsg = input.trim();
    setInput('');
    sendMessageMutation.mutate(userMsg);
  };

  const clearHistoryMutation = useMutation({
    mutationFn: () => chatApi.clearHistory(),
    onSuccess: () => {
      queryClient.setQueryData(['chatHistory'], []);
      showToast('Chat history cleared.', 'info');
    },
    onError: () => {
      showToast('Failed to clear chat history.', 'error');
    }
  });

  const handleClear = () => {
    if (window.confirm('Clear your chat history?')) {
      clearHistoryMutation.mutate();
    }
  };

  if (!user || user.role !== 'member') return null;

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="brut-card interactive"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          padding: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'var(--primary)',
          cursor: 'pointer',
          zIndex: 90
        }}
        title="Ask Assistant"
      >
        <MessageSquare size={28} strokeWidth={2.5} />
      </button>

      {/* Slide-out Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: isOpen ? 0 : '-420px',
        width: '400px',
        maxWidth: '100%',
        height: '100vh',
        backgroundColor: 'var(--bg-color)',
        borderLeft: 'var(--border-width) solid var(--border-color)',
        boxShadow: '-10px 0px 0px rgba(0, 0, 0, 0.1)',
        zIndex: 500,
        transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Drawer Header */}
        <div style={{
          padding: '1.25rem',
          borderBottom: 'var(--border-width) solid var(--border-color)',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              backgroundColor: 'var(--primary)',
              border: '2px solid #000000',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Bot size={20} strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem' }}>
              AI ASSISTANT
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="brut-btn brut-btn-flat"
                style={{ padding: '0.25rem 0.5rem', border: '1.5px solid #000000', backgroundColor: '#FEF2F2' }}
                title="Clear Chat"
              >
                <Trash2 size={16} color="#DC2626" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="brut-btn brut-btn-flat"
              style={{ padding: '0.25rem' }}
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Scrollable Conversation */}
        <div style={{
          flex: 1,
          padding: '1.25rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          backgroundColor: '#FAF7F2'
        }}>
          {messages.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              border: '2px dashed #9CA3AF',
              backgroundColor: '#FFFFFF',
              margin: '2rem 0'
            }}>
              <Bot size={40} style={{ margin: '0 auto 0.75rem auto', color: '#9CA3AF' }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>How can I help you today?</p>
              <p style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.25rem' }}>
                You can say things like:<br />
                <em>"Show me tech books"</em><br />
                <em>"Borrow the book Clean Code"</em><br />
                <em>"What are my active loans?"</em>
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    backgroundColor: isUser ? 'var(--secondary)' : 'var(--card-bg)',
                    color: 'var(--text-color)',
                    border: '2px solid #000000',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    lineHeight: 1.4,
                    boxShadow: '2px 2px 0px #000000'
                  }}>
                    {msg.content}
                  </div>
                  
                  {/* Actions Taken Logs */}
                  {!isUser && msg.actions_taken && msg.actions_taken.length > 0 && (
                    <div style={{
                      marginTop: '0.35rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.25rem'
                    }}>
                      {msg.actions_taken.map((action, ai) => (
                        <span key={ai} style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: 'var(--accent)',
                          border: '1px solid #000000',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}>
                          ⚙️ {action}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Footer */}
        <form onSubmit={handleSend} style={{
          padding: '1rem',
          borderTop: 'var(--border-width) solid var(--border-color)',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          gap: '0.5rem'
        }}>
          <input
            type="text"
            className="brut-input"
            placeholder="Type your request..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={sendMessageMutation.isPending}
            style={{ flex: 1, padding: '0.6rem 0.8rem' }}
          />
          <button
            type="submit"
            className="brut-btn brut-btn-primary"
            disabled={!input.trim() || sendMessageMutation.isPending}
            style={{ padding: '0.6rem 0.8rem', boxShadow: '2px 2px 0px #000000' }}
          >
            <Send size={16} strokeWidth={2.5} />
          </button>
        </form>
      </div>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(2px)',
            zIndex: 400
          }}
        />
      )}
    </>
  );
};
