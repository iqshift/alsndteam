import React, { useState, useEffect, useRef } from 'react';
import { supportAPI } from '../services/api';
import io from 'socket.io-client';
import { LockIcon, WhatsAppIcon, MessageIcon, PackageIcon, PhoneIcon, CameraIcon, UserIcon } from '../components/common/Icons';

const socket = io(`${window.location.protocol}//${window.location.hostname}:3000`);

export default function SupportPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maintain a ref of selectedChat so WebSocket event handlers always access the latest selected chat without recreating listeners
  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Load chat list on mount
  useEffect(() => {
    loadChats();

    // Listen for WebSocket support messages
    socket.on('new_support_message', (msg: any) => {
      // Refresh chat list to update previews/unread counts
      loadChats();

      // Play sound for incoming message from driver
      if (msg.sender === 'driver') {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav');
          audio.volume = 0.4;
          audio.onerror = (err) => {
            console.log('Audio load failed (can be ignored):', err);
          };
          audio.play().catch((playErr) => {
            console.log('Audio play failed/blocked (can be ignored):', playErr);
          });
        } catch (e) {
          console.log('Audio constructor error:', e);
        }
      }

      // If this message belongs to the active chat, append it safely
      const activeChat = selectedChatRef.current;
      if (activeChat && activeChat.driver.id === msg.driverId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Call API to mark as read immediately since we are in the chat
        supportAPI.getChatMessages(msg.driverId).catch(console.error);
      }
    });

    socket.on('support_chat_read', (data: { driverId: string }) => {
      const activeChat = selectedChatRef.current;
      if (activeChat && activeChat.driver.id === data.driverId) {
        loadChats();
      }
    });

    // Listen for clear chat event
    socket.on('support_chat_cleared', (data: { driverId: string }) => {
      loadChats();
      const activeChat = selectedChatRef.current;
      if (activeChat && activeChat.driver.id === data.driverId) {
        setMessages([]);
        setSelectedChat(null);
      }
    });

    return () => {
      socket.off('new_support_message');
      socket.off('support_chat_read');
      socket.off('support_chat_cleared');
    };
  }, []);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = async () => {
    try {
      const { data } = await supportAPI.getChats();
      setChats(data);
    } catch (err) {
      console.error('Failed to load chats', err);
    } finally {
      setLoadingChats(false);
    }
  };

  const handleSelectChat = async (chat: any) => {
    setSelectedChat(chat);
    setLoadingMessages(true);
    setMessages([]);
    try {
      const { data } = await supportAPI.getChatMessages(chat.driver.id);
      setMessages(data);
      loadChats();
    } catch (err) {
      console.error('Failed to load chat messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImageFile) return;
    if (!selectedChat || sending || uploading) return;

    setSending(true);

    try {
      let activeMessages = [...messages];
      const imageToUpload = selectedImageFile;

      // Reset local preview state immediately to look responsive
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // 1. If there's an image, upload it first
      if (imageToUpload) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', imageToUpload);
        const { data: uploadRes } = await supportAPI.uploadImage(formData);
        if (uploadRes && uploadRes.url) {
          const { data: msgRes } = await supportAPI.sendAdminMessage(selectedChat.driver.id, uploadRes.url);
          activeMessages = [...activeMessages, msgRes];
          setMessages(activeMessages);
        }
        setUploading(false);
      }

      // 2. If there's text, send it next
      if (newMessage.trim()) {
        const content = newMessage.trim();
        setNewMessage('');
        const { data: msgRes } = await supportAPI.sendAdminMessage(selectedChat.driver.id, content);
        setMessages([...activeMessages, msgRes]);
      }

      loadChats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إرسال الرسالة');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClearChat = async () => {
    if (!selectedChat) return;
    const confirmed = window.confirm('تحذير: هل أنت متأكد من رغبتك في إغلاق المحادثة ومسح كافة الرسائل التي أرسلها السائق نهائياً؟');
    if (!confirmed) return;

    try {
      await supportAPI.clearChat(selectedChat.driver.id);
      setMessages([]);
      setSelectedChat(null);
      loadChats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إغلاق وتصفير المحادثة');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const translateOrderStatus = (status: string) => {
    const mapping: Record<string, string> = {
      searching_driver: 'جاري البحث عن سائق',
      assigned: 'تم التعيين للسائق',
      arrived_restaurant: 'وصل للمطعم',
      picked_up: 'تم استلام الطلب',
      delivered: 'تم التوصيل بنجاح',
      cancelled: 'ملغي',
    };
    return mapping[status] || status;
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 110px)', margin: '-24px', background: 'var(--body-bg)', fontFamily: 'Cairo' }}>
      
      {/* CSS Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseLive {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .chat-list-container {
          width: 350px;
          border-left: 1px solid var(--border);
          background: var(--card-bg);
          display: flex;
          flex-direction: column;
        }
        .chat-list-header {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .chat-list-body {
          flex: 1;
          overflow-y: auto;
        }
        .chat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          cursor: pointer;
          border-bottom: 1px solid rgba(0, 0, 0, 0.02);
          transition: all 0.2s ease;
        }
        .chat-item:hover {
          background: rgba(0, 0, 0, 0.02);
        }
        .chat-item.active {
          background: var(--primary-bg);
          border-right: 4px solid var(--primary);
        }
        .chat-window {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
        }
        .chat-window-header {
          padding: 14px 20px;
          background: var(--card-bg);
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .messages-container {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .message-bubble {
          max-width: 60%;
          padding: 10px 14px;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          line-height: 1.5;
          font-size: 13px;
        }
        .message-bubble.admin {
          align-self: flex-start;
          background: var(--primary);
          color: white;
          border-bottom-left-radius: 2px;
        }
        .message-bubble.driver {
          align-self: flex-end;
          background: var(--card-bg);
          color: var(--text);
          border-bottom-right-radius: 2px;
          border: 1px solid var(--border);
        }
        .chat-input-bar {
          padding: 14px 20px;
          background: var(--card-bg);
          border-top: 1px solid var(--border);
        }
        .badge-unread {
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
      `}} />

      {/* 1. Sidebar Chat List */}
      <div className="chat-list-container">
        <div className="chat-list-header">
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: 'var(--text)' }}>محادثات الدعم الفني</h2>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: '#ecfdf5',
            color: '#10b981',
            padding: '3px 8px',
            borderRadius: 12,
            fontSize: 10,
            fontWeight: 800
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10b981',
              animation: 'pulseLive 1.5s infinite'
            }} />
            مباشر
          </span>
        </div>

        <div className="chat-list-body">
          {loadingChats ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>جاري التحميل...</div>
          ) : chats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                <MessageIcon size={36} />
              </div>
              <p style={{ fontSize: 12, margin: 0 }}>لا توجد محادثات نشطة حالياً</p>
            </div>
          ) : (
            chats.map((chat) => {
              const isActive = selectedChat?.driver?.id === chat.driver.id;
              
              // Handle image message rendering in sidebar snippet
              const isImg = chat.lastMessage?.content?.startsWith('/uploads/support/');
              const messageText = isImg ? 'صورة' : (chat.lastMessage?.content || 'لا توجد رسائل');

              return (
                <div
                  key={chat.driver.id}
                  className={`chat-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectChat(chat)}
                >
                  {/* Photo / Avatar */}
                  {chat.driver.photo ? (
                    <img
                      src={`${window.location.protocol}//${window.location.hostname}:3000${chat.driver.photo}`}
                      alt={chat.driver.name}
                      style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                    />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserIcon size={20} style={{ color: 'var(--primary)' }} />
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {chat.driver.name}
                      </span>
                      {chat.lastMessage && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {new Date(chat.lastMessage.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{
                        fontSize: 12,
                        color: chat.unreadCount > 0 ? 'var(--text)' : 'var(--text-muted)',
                        fontWeight: chat.unreadCount > 0 ? 800 : 500,
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {chat.lastMessage?.sender === 'admin' ? 'أنت: ' : ''}
                        {isImg ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                            <CameraIcon size={12} />
                            <span>صورة</span>
                          </span>
                        ) : (
                          chat.lastMessage?.content || 'لا توجد رسائل'
                        )}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="badge-unread">{chat.unreadCount}</span>
                      )}
                    </div>
                    {chat.activeOrder && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 5,
                        fontSize: 9,
                        fontWeight: 800,
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.08)',
                        padding: '2px 8px',
                        borderRadius: 4
                      }}>
                        <PackageIcon size={10} />
                        <span>لديه طلب جاري</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Chat Window */}
      <div className="chat-window">
        {selectedChat ? (
          <>
            {/* Header info */}
            <div className="chat-window-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  {selectedChat.driver.photo ? (
                    <img
                      src={`${window.location.protocol}//${window.location.hostname}:3000${selectedChat.driver.photo}`}
                      alt={selectedChat.driver.name}
                      style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserIcon size={18} style={{ color: 'var(--primary)' }} />
                    </div>
                  )}
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: selectedChat.driver.status === 'active' ? '#10b981' : '#ef4444',
                    border: '2px solid white',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{selectedChat.driver.name}</h3>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: selectedChat.driver.status === 'active' ? 'var(--success-bg)' : 'var(--danger-bg)',
                      color: selectedChat.driver.status === 'active' ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {selectedChat.driver.status === 'active' ? 'حساب نشط' : 'معلق'}
                    </span>
                  </div>
                  <a
                    href={`tel:${selectedChat.driver.phone}`}
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      direction: 'ltr',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      textDecoration: 'none'
                    }}
                  >
                    <PhoneIcon size={12} />
                    <span>{selectedChat.driver.phone}</span>
                  </a>
                </div>
              </div>

              {/* Status & Close Chat & WhatsApp */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Close Chat Button */}
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleClearChat}
                  style={{
                    fontSize: 12,
                    height: 36,
                    padding: '0 16px',
                    background: '#ef4444',
                    borderColor: '#ef4444',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s'
                  }}
                >
                  <LockIcon size={14} />
                  <span>إغلاق وتصفير المحادثة</span>
                </button>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => window.open(`https://wa.me/${selectedChat.driver.phone}`, '_blank')}
                  style={{
                    fontSize: 12,
                    height: 36,
                    padding: '0 16px',
                    border: '1.5px solid #25d366',
                    color: '#25d366',
                    background: 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <WhatsAppIcon size={14} />
                  <span>محادثة واتساب</span>
                </button>
              </div>
            </div>

            {/* Expandable Order Information banner if has active order */}
            {selectedChat.activeOrder && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.03)',
                borderBottom: '1px solid rgba(239, 68, 68, 0.1)',
                padding: '12px 20px',
                fontSize: 12,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <PackageIcon size={14} />
                    <span>الطلب النشط:</span>
                  </span>{' '}
                  <strong>#{selectedChat.activeOrder.orderNumber || selectedChat.activeOrder.id.slice(0, 8)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>حالة الطلب:</span>{' '}
                  <strong style={{ color: 'var(--primary)' }}>{translateOrderStatus(selectedChat.activeOrder.status)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>هاتف العميل:</span>{' '}
                  <strong style={{ direction: 'ltr' }}>{selectedChat.activeOrder.customerPhone}</strong>
                </div>
                {selectedChat.activeOrder.nearestLandmark && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>نقطة دالة:</span>{' '}
                    <strong>{selectedChat.activeOrder.nearestLandmark}</strong>
                  </div>
                )}
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>أجرة التوصيل:</span>{' '}
                  <strong style={{ color: '#10b981' }}>{parseFloat(selectedChat.activeOrder.deliveryPrice).toLocaleString()} د.ع</strong>
                </div>
              </div>
            )}

            {/* Messages display */}
            <div className="messages-container">
              {loadingMessages ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>جاري تحميل الرسائل...</div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender === 'admin';
                  const isImg = msg.content.startsWith('/uploads/support/');

                  return (
                    <div
                      key={msg.id}
                      className={`message-bubble ${isMe ? 'admin' : 'driver'}`}
                    >
                      {isImg ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <img
                            src={`${window.location.protocol}//${window.location.hostname}:3000${msg.content}`}
                            alt="support attachment"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '260px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              border: '1px solid rgba(0,0,0,0.06)'
                            }}
                            onClick={() => window.open(`${window.location.protocol}//${window.location.hostname}:3000${msg.content}`, '_blank')}
                          />
                        </div>
                      ) : (
                        <div style={{ wordBreak: 'break-word', fontWeight: 600 }}>{msg.content}</div>
                      )}
                      <div style={{
                        fontSize: 9,
                        marginTop: 4,
                        textAlign: 'left',
                        color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                        fontWeight: 400
                      }}>
                        {new Date(msg.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview Container above Input Bar */}
            {imagePreviewUrl && (
              <div style={{
                padding: '10px 20px',
                background: 'white',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <div style={{ position: 'relative', width: 60, height: 60 }}>
                  <img
                    src={imagePreviewUrl}
                    alt="preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImageFile(null);
                      setImagePreviewUrl(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      position: 'absolute',
                      top: -6,
                      left: -6,
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: 18,
                      height: 18,
                      fontSize: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800 }}>صورة جاهزة للإرسال</div>
              </div>
            )}

            {/* Message input bar */}
            <div className="chat-input-bar">
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {/* Hidden File Input */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />

                {/* Upload Image Button */}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border)',
                    background: 'var(--body-bg)',
                    fontSize: 18,
                    cursor: (sending || uploading) ? 'not-allowed' : 'pointer'
                  }}
                  title="إرسال صورة"
                  disabled={sending || uploading}
                >
                  {uploading ? '⏳' : '📎'}
                </button>

                <input
                  type="text"
                  className="form-input"
                  placeholder="اكتب ردك هنا..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  style={{ flex: 1, height: 40, borderRadius: 20, padding: '0 18px', border: '1px solid var(--border)', fontSize: 13 }}
                  disabled={sending || uploading}
                  required={!selectedImageFile}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    borderRadius: 20,
                    height: 40,
                    padding: '0 24px',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--primary)',
                    borderColor: 'var(--primary)',
                    cursor: (sending || uploading) ? 'not-allowed' : 'pointer'
                  }}
                  disabled={sending || uploading}
                >
                  {sending ? 'جاري الإرسال...' : 'إرسال الرد'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <div style={{
              color: 'var(--primary)',
              background: 'white',
              width: 100,
              height: 100,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              marginBottom: 16
            }}>
              <MessageIcon size={44} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px 0' }}>مساعد السائقين المباشر</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>اختر سائقاً من القائمة الجانبية لبدء المحادثة ومساعدته فوراً.</p>
          </div>
        )}
      </div>

    </div>
  );
}
