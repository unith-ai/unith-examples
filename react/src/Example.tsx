import { useConversation } from '@unith-ai/react';
import { useRef, useEffect, useState } from 'react';

export function UnithChat() {
    const videoRef = useRef(null);
    const [inputText, setInputText] = useState('');

    const conversation = useConversation({
        orgId: import.meta.env.VITE_ORG_ID,
        headId: import.meta.env.VITE_HEAD_ID,
        apiKey: import.meta.env.VITE_API_KEY,
        microphoneProvider: 'eleven_labs',
        microphoneEvents: {
            onMicrophoneError(prop) {
                console.log(`Microphone error: ${prop.message}`);
            },
            onMicrophoneSpeechRecognitionResult(prop) {
                conversation?.sendMessage(prop.transcript);
            },
            onMicrophoneStatusChange(prop) {
                console.log('Microphone status changed:', prop.status);
            },
        }
    });



    useEffect(() => {
        if (videoRef.current) {
            conversation.startDigitalHuman(videoRef.current, {
                onConnect: ({ userId, headInfo, }) => {
                    console.log('Connected with user ID:', userId);
                    console.log('Digital human:', headInfo.name);
                },
                onMessage: ({ sender, text, }) => {
                    console.log(`[${sender}] ${text}`);
                },
                onSpeakingStart: () => {
                    console.log('Digital human started speaking');
                },
                onSpeakingEnd: () => {
                    console.log('Digital human finished speaking');
                },
                onTimeoutWarning: () => {
                    console.log('Session will timeout soon');
                },
                onTimeout: () => {
                    console.log('Session timed out');
                },
                onError: ({ message, type }) => {
                    if (type === 'toast') {
                        alert(message);
                    }
                },
            });
        }
    }, []);

    const handleSendMessage = async () => {
        if (inputText.trim()) {
            await conversation.sendMessage(inputText);
            setInputText('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleKeepSession = () => {
        conversation.keepSession();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Digital Human Chat</h1>
                    <p className="text-slate-300">Experience AI-powered conversation</p>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Video Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
                            <div
                                ref={videoRef}
                                className="w-full h-96 md:h-[500px] bg-slate-900"
                            />

                            {/* Status Bar */}
                            <div className="p-4 bg-slate-800/80 border-t border-slate-700">
                                <div className="flex flex-wrap gap-3 items-center justify-between">
                                    <div className="flex gap-3">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                            {conversation.status}
                                        </span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                            {conversation.mode}
                                        </span>
                                    </div>
                                    {conversation.isSpeaking && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                            Speaking...
                                        </span>
                                    )}
                                </div>
                            </div>

                            {conversation.isConnected && !conversation.sessionStarted && (
                                <div className="p-4 bg-slate-800/80 border-t border-slate-700">
                                    <button
                                        onClick={() => conversation.startSession()}
                                        className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                                    >
                                        Start Conversation
                                    </button>
                                </div>
                            )}

                            {conversation.timeOutWarning && (
                                <div className="p-4 bg-amber-500/10 border-t border-amber-500/30">
                                    <div className="flex items-center justify-between">
                                        <p className="text-amber-300 text-sm">⚠️ Your session will timeout soon</p>
                                        <button
                                            onClick={handleKeepSession}
                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Keep Active
                                        </button>
                                    </div>
                                </div>
                            )}

                            {conversation.sessionStarted && (
                                <div className="p-4 bg-slate-800/80 border-t border-slate-700">
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={inputText}
                                                onChange={(e) => setInputText(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                disabled={conversation.mode !== 'listening'}
                                                placeholder="Type your message..."
                                                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={conversation.mode !== 'listening'}
                                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                                            >
                                                Send
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => conversation.toggleMuteStatus()}
                                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                {conversation.isMuted ? '🔇 Unmute' : '🔊 Mute'}
                                            </button>
                                            {conversation.isSpeaking && (
                                                <button
                                                    onClick={() => conversation.stopResponse()}
                                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                                                >
                                                    ⏹ Stop Response
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700 h-full flex flex-col">
                            <div className="p-4 border-b border-slate-700">
                                <h3 className="text-lg font-semibold text-white flex items-center justify-between">
                                    <span>Messages</span>
                                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                                        {conversation.messageCounter}
                                    </span>
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[600px]">
                                {conversation.messages.length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center py-8">No messages yet</p>
                                ) : (
                                    conversation.messages.map((msg, index) => (
                                        msg.visible && (
                                            <div
                                                key={index}
                                                className={`p-3 rounded-lg ${msg.sender === 'user'
                                                    ? 'bg-blue-500/20 border border-blue-500/30 ml-4'
                                                    : 'bg-slate-700/50 border border-slate-600 mr-4'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <strong className={`text-sm font-semibold ${msg.sender === 'user' ? 'text-blue-300' : 'text-purple-300'
                                                        }`}>
                                                        {msg.sender === 'user' ? 'You' : 'Assistant'}
                                                    </strong>
                                                    <small className="text-xs text-slate-400">
                                                        {msg.timestamp.toLocaleTimeString()}
                                                    </small>
                                                </div>
                                                <p className="text-sm text-slate-200">{msg.text}</p>
                                            </div>
                                        )
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}