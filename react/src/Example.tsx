import { useRef, useEffect, useState } from 'react';
import {
    useSession,
    useConnectionStatus,
    useTurn,
    useIsSessionStarted,
    useMessages,
    useSuggestions,
    useIsMuted,
    useMicrophoneAlwaysOn,
    useOnTimeout,
} from '@unith-ai/react-components';
import type { SessionConfig } from '@unith-ai/core-client';

// Session configuration. Credentials come from the .env file (see README).
const config: SessionConfig = {
    orgId: import.meta.env.VITE_ORG_ID,
    headId: import.meta.env.VITE_HEAD_ID,
    apiKey: import.meta.env.VITE_API_KEY,
    language: 'en-US',
    username: 'React User',
    allowWakeLock: true,
    microphone: {
        provider: 'eleven_labs',
        mode: 'always-on',
        // The user speaking automatically interrupts the avatar.
        voiceInterruptions: true,
    },
};

export function UnithChat() {
    const videoRef = useRef<HTMLDivElement>(null);

    // Session lifecycle + state, all from react-components hooks.
    const { connect, session } = useSession();
    const status = useConnectionStatus();
    const turn = useTurn();
    const sessionStarted = useIsSessionStarted();
    const { messages, sendMessage } = useMessages();
    const { suggestions, selectSuggestion } = useSuggestions();
    const { isMuted, toggleMuted } = useIsMuted();
    // Always-on mic: transcripts are recognised and sent automatically.
    const { startRecording, stopRecording, status: micStatus } =
        useMicrophoneAlwaysOn();

    const [inputText, setInputText] = useState('');
    const [timeoutWarning, setTimeoutWarning] = useState(false);

    // Connect once the video container is mounted. The avatar renders into it.
    useEffect(() => {
        if (videoRef.current) connect(videoRef.current, config);
    }, [connect]);

    // Surface inactivity timeout warnings.
    useOnTimeout((t) => {
        setTimeoutWarning(t.active && t.kind === 'warning');
    });

    const isConnected = status.status === 'connected';
    const isSpeaking = turn.state === 'ai-speaking';
    // A new message is only accepted while the conversation is idle.
    const canInteract = turn.state === 'idle';

    const handleSendMessage = () => {
        if (inputText.trim()) {
            sendMessage(inputText);
            setInputText('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleToggleMicrophone = () => {
        if (micStatus === 'off') startRecording();
        else stopRecording();
    };

    // Map the microphone status to a friendly label.
    const micLabel =
        micStatus === 'recording'
            ? 'ON'
            : micStatus === 'processing'
                ? 'PROCESSING'
                : 'OFF';

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
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
                                className="w-full h-96 md:h-125 bg-slate-900"
                            />

                            {/* Status Bar */}
                            <div className="p-4 bg-slate-800/80 border-t border-slate-700">
                                <div className="flex flex-wrap gap-3 items-center justify-between">
                                    <div className="flex gap-3">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                            {status.status}
                                        </span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                            {turn.state}
                                        </span>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${micLabel === 'ON'
                                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                            : micLabel === 'PROCESSING'
                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                                            }`}>
                                            🎤 {micLabel}
                                        </span>

                                    </div>
                                    {isSpeaking && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                            Speaking...
                                        </span>
                                    )}
                                </div>
                            </div>

                            {isConnected && !sessionStarted && (
                                <div className="p-4 bg-slate-800/80 border-t border-slate-700">
                                    <button
                                        onClick={() => session?.startSession()}
                                        className="w-full py-3 px-6 bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                                    >
                                        Start Conversation
                                    </button>
                                </div>
                            )}

                            {timeoutWarning && (
                                <div className="p-4 bg-amber-500/10 border-t border-amber-500/30">
                                    <div className="flex items-center justify-between">
                                        <p className="text-amber-300 text-sm">⚠️ Your session will timeout soon</p>
                                        <button
                                            onClick={() => session?.keepSession()}
                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Keep Active
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Suggestions */}
                            {suggestions.length > 0 && (
                                <div className="flex flex-wrap gap-2 p-4">
                                    {suggestions.map((s) => (
                                        <button
                                            key={s.id}
                                            onClick={() => selectSuggestion(s.id)}
                                            disabled={!canInteract}
                                            className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-sm rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {s.suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {sessionStarted && (
                                <div className="p-4 bg-slate-800/80 border-t border-slate-700">
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={inputText}
                                                onChange={(e) => setInputText(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                disabled={!canInteract}
                                                placeholder="Type your message..."
                                                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!canInteract}
                                                className="px-6 py-3 bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                                            >
                                                Send
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleToggleMicrophone}
                                                disabled={isSpeaking}
                                                className={`flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${micStatus !== 'off'
                                                    ? 'bg-green-600 hover:bg-green-700'
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {micLabel === 'OFF' ? 'Enable Microphone' : micLabel === 'ON' ? 'Disable Microphone' : 'Loading...'}
                                            </button>
                                            <button
                                                onClick={() => toggleMuted()}
                                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                {isMuted ? '🔇 Unmute' : '🔊 Mute'}
                                            </button>

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
                                        {messages.length}
                                    </span>
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-150">
                                {messages.length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center py-8">No messages yet</p>
                                ) : (
                                    messages.map((msg) => (
                                        msg.visible && (
                                            <div
                                                key={msg.id}
                                                className={`p-3 rounded-lg ${msg.role === 'user'
                                                    ? 'bg-blue-500/20 border border-blue-500/30 ml-4'
                                                    : 'bg-slate-700/50 border border-slate-600 mr-4'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <strong className={`text-sm font-semibold ${msg.role === 'user' ? 'text-blue-300' : 'text-purple-300'
                                                        }`}>
                                                        {msg.role === 'user' ? 'You' : 'Assistant'}
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
