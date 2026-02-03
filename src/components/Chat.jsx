import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import clsx from 'clsx';

export default function Chat({ channel, playerId, playerName, players }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        if (!channel) return;

        const onMessage = ({ payload }) => {
            setMessages(prev => {
                // Deduplicate by message ID if present
                if (payload.id && prev.some(m => m.id === payload.id)) return prev;

                return [...prev, {
                    id: payload.id || Date.now() + Math.random(),
                    senderId: payload.senderId,
                    senderName: payload.senderName,
                    text: payload.text,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }].slice(-50);
            });
        };

        channel.on('broadcast', { event: 'chat_message' }, onMessage);

        return () => {
            // Supabase RealtimeChannel doesn't have an easily accessible .off() 
            // for individual broadcast listeners without re-subscribing.
            // Our deduplication logic (ID check) handles the extra listeners.
        };
    }, [channel]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = (e) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const msgId = `chat-${playerId}-${Date.now()}-${Math.random()}`;
        const msg = {
            id: msgId,
            senderId: playerId,
            senderName: playerName,
            text: input.trim()
        };

        channel.send({
            type: 'broadcast',
            event: 'chat_message',
            payload: msg
        });

        // Add locally for instant feedback
        setMessages(prev => [...prev, {
            id: msgId,
            senderId: playerId,
            senderName: playerName,
            text: input.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }].slice(-50));

        setInput('');
    };

    return (
        <div className="flex flex-col w-full max-w-sm h-[400px] bg-white border-4 border-joy-pink rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-in-right">
            {/* Header */}
            <div className="bg-joy-pink p-4 flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                    <MessageCircle className="text-white" size={20} />
                </div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Chat da Partida</h3>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-joy-bg/30 custom-scrollbar"
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-4">
                        <MessageCircle size={40} className="mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma mensagem ainda.<br />Diga oi!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === playerId;
                        const playerInfo = players[msg.senderId];
                        const playerColorClass = playerInfo?.color === 'blue' ? 'text-joy-mint' : 'text-joy-pink';

                        return (
                            <div
                                key={msg.id}
                                className={clsx(
                                    "flex flex-col max-w-[85%]",
                                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className={clsx("text-[9px] font-black uppercase tracking-wider", playerColorClass)}>
                                        {isMe ? "Você" : msg.senderName}
                                    </span>
                                    <span className="text-[8px] text-joy-deep-purple/30 font-bold">{msg.timestamp}</span>
                                </div>
                                <div className={clsx(
                                    "px-4 py-2 rounded-2xl text-[13px] font-medium shadow-sm",
                                    isMe
                                        ? "bg-joy-pink text-white rounded-tr-none"
                                        : "bg-white border-2 border-joy-pink/10 text-joy-deep-purple rounded-tl-none"
                                )}>
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t-4 border-joy-pink/5 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Eae, bora?"
                    className="flex-1 bg-joy-bg/50 border-2 border-joy-pink/20 focus:border-joy-pink rounded-xl px-4 py-2 text-sm outline-none font-medium transition-all"
                />
                <button
                    type="submit"
                    className="p-2 bg-joy-pink text-white rounded-xl hover:bg-joy-rosa2 transition-all shadow-md active:scale-90"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
