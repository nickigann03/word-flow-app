'use client'
import { useState, useRef, useEffect } from 'react';
import {
    MessageSquare, Send, X, Trash2, Book, Sparkles,
    ChevronDown, Info, BookOpen, Maximize2, Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import reformedAIService, { ChatMessage, WordDefinition } from '@/services/reformedAIService';
import bibleService from '@/services/bibleService';

interface ReformedAIChatProps {
    isOpen: boolean;
    onClose: () => void;
    onInsertVerse?: (verse: string, reference: string) => void;
    noteContext?: string; // Current note content for context-aware responses
    noteTitle?: string;   // Current note title
}

export function ReformedAIChat({ isOpen, onClose, onInsertVerse, noteContext, noteTitle }: ReformedAIChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hoveredWord, setHoveredWord] = useState<{
        word: string;
        definition: WordDefinition | null;
        x: number;
        y: number;
    } | null>(null);

    // Quick questions
    const [showQuickQuestions, setShowQuickQuestions] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const QUICK_QUESTIONS = noteContext ? [
        "What is the main theme of my note?",
        "Suggest related Bible verses for my note",
        "What theological concepts are in my note?",
        "How can I improve this sermon outline?",
        "What are the key points in my note?",
        "Explain any doctrine mentioned in my note",
    ] : [
        "What is justification by faith?",
        "Explain the five points of Calvinism",
        "What does it mean to be elect?",
        "How does covenant theology work?",
        "What is the sovereignty of God?",
        "Explain total depravity",
    ];

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = inputValue.trim();
        setInputValue('');
        setShowQuickQuestions(false);
        setIsLoading(true);

        // Optimistically add user message
        const tempUserMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            const response = await reformedAIService.chat(userMessage, noteContext);
            setMessages(prev => [...prev.slice(0, -1), tempUserMsg, response]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'I apologize, but I encountered an error. Please try again.',
                timestamp: new Date()
            }]);
        }

        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleWordHover = async (word: string, event: React.MouseEvent) => {
        const cleanWord = word.replace(/[^a-zA-Z]/g, '');
        if (cleanWord.length < 4) return;

        const rect = (event.target as HTMLElement).getBoundingClientRect();
        setHoveredWord({
            word: cleanWord,
            definition: null,
            x: rect.left,
            y: rect.bottom + 5
        });

        try {
            const definition = await reformedAIService.getWordDefinition(cleanWord);
            setHoveredWord(prev => prev ? { ...prev, definition } : null);
        } catch (error) {
            setHoveredWord(null);
        }
    };

    const clearChat = () => {
        reformedAIService.clearHistory();
        setMessages([]);
        setShowQuickQuestions(true);
    };

    const handleVerseClick = async (verse: string) => {
        if (onInsertVerse) {
            try {
                const verseData = await bibleService.getVerse(verse);
                onInsertVerse(verseData.text, verse);
            } catch (error) {
                console.error('Failed to fetch verse:', error);
            }
        }
    };

    // Parse message content to highlight Bible references
    const renderMessageContent = (content: string) => {
        // Regex for Bible references: Handles "Book Ch", "Book Ch:V", "Book Ch:V-V", "Book Ch-Ch"
        const verseRegex = /(?:(?:1|2|3|I|II|III)\s*)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of (?:Solomon|Songs)|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d+(?:[:]\d+(?:[-]\d+)?|[-]\d+(?:[:]\d+)?)?/gi;

        const parts = content.split(verseRegex);
        const matches = content.match(verseRegex) || [];

        return parts.map((part, i) => (
            <span key={i}>
                {part.split(' ').map((word, wi) => (
                    <span
                        key={wi}
                        className="hover:text-amber-300 cursor-help transition-colors"
                        onDoubleClick={(e) => handleWordHover(word, e)}
                    >
                        {word}{' '}
                    </span>
                ))}
                {matches[i] && (
                    <span
                        className="text-amber-400 hover:text-amber-300 hover:underline cursor-pointer font-medium"
                        onClick={() => handleVerseClick(matches[i])}
                        title="Click to insert into note"
                    >
                        {matches[i]}
                    </span>
                )}
            </span>
        ));
    };

    if (!isOpen) return null;

    return (
        <div className={cn(
            "flex flex-col h-full bg-zinc-900 border-l border-zinc-800 transition-all duration-300",
            isExpanded ? "w-[550px]" : "w-[380px]"
        )}>
            {/* Header */}
            <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-gradient-to-r from-purple-950/50 to-amber-950/30 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <span className="font-semibold text-sm">Reformed AI</span>
                        <span className="block text-[10px] text-zinc-500">
                            {noteContext ? `Viewing: ${noteTitle || 'Current Note'}` : 'Evangelical • Sola Scriptura'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={clearChat}
                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Clear chat"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {messages.length === 0 && showQuickQuestions && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-amber-500/20 flex items-center justify-center mb-4">
                            <BookOpen className="w-8 h-8 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Reformed AI Assistant</h3>
                        <p className="text-sm text-zinc-500 mb-6 max-w-xs">
                            {noteContext
                                ? "I can see your current note. Ask me questions about it, or for theological insights!"
                                : "Ask theological questions rooted in the Reformed tradition. I'll provide Scripture-based answers."
                            }
                        </p>
                        {noteContext && (
                            <div className="mb-4 px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-left">
                                <p className="text-[10px] uppercase tracking-wider text-purple-400 mb-1">Note Context Active</p>
                                <p className="text-xs text-zinc-400 line-clamp-2">
                                    {noteTitle ? `"${noteTitle}"` : 'Current note'} - {noteContext.length} characters
                                </p>
                            </div>
                        )}
                        <div className="w-full space-y-2">
                            <p className="text-xs text-zinc-600 uppercase tracking-wider mb-3">Quick Questions</p>
                            {QUICK_QUESTIONS.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setInputValue(q);
                                        inputRef.current?.focus();
                                    }}
                                    className="w-full text-left px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/30 rounded-lg text-sm text-zinc-400 hover:text-white transition-all"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn(
                            "flex",
                            msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                    >
                        <div
                            className={cn(
                                "max-w-[85%] rounded-2xl px-4 py-3",
                                msg.role === 'user'
                                    ? "bg-purple-600 text-white rounded-br-md"
                                    : "bg-zinc-800 text-zinc-200 rounded-bl-md"
                            )}
                        >
                            {msg.role === 'assistant' ? (
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {renderMessageContent(msg.content)}
                                </div>
                            ) : (
                                <p className="text-sm">{msg.content}</p>
                            )}

                            {/* Bible References */}
                            {msg.role === 'assistant' && msg.references && msg.references.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-zinc-700/50">
                                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Scripture References</p>
                                    <div className="flex flex-wrap gap-1">
                                        {msg.references.map((ref, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleVerseClick(ref.verse)}
                                                className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs hover:bg-amber-500/20 transition-colors"
                                            >
                                                {ref.verse}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <span className="block text-[10px] mt-2 opacity-50">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-75" />
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-150" />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a theological question..."
                        className="flex-1 resize-none px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-purple-500 placeholder:text-zinc-600 min-h-[48px] max-h-32"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                        className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-[10px] text-zinc-600 mt-2 text-center">
                    Double-click words for definitions • Click verse references to insert
                </p>
            </div>

            {/* Word Definition Popup */}
            {hoveredWord && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setHoveredWord(null)}
                    />
                    <div
                        className="fixed bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl z-50 w-80 max-w-[90vw] animate-in fade-in zoom-in-95"
                        style={{
                            left: Math.min(hoveredWord.x, window.innerWidth - 340),
                            top: Math.min(hoveredWord.y, window.innerHeight - 300)
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-gradient-to-r from-purple-950/30 to-transparent">
                            <div className="flex items-center gap-2">
                                <Info className="w-4 h-4 text-purple-400" />
                                <span className="font-bold text-purple-300">{hoveredWord.word}</span>
                            </div>
                            <button onClick={() => setHoveredWord(null)} className="text-zinc-500 hover:text-white">×</button>
                        </div>
                        <div className="p-4 max-h-60 overflow-y-auto custom-scrollbar">
                            {hoveredWord.definition ? (
                                <>
                                    {hoveredWord.definition.original && (
                                        <div className="mb-3">
                                            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Original</span>
                                            <p className="text-sm text-zinc-300 font-mono mt-1">
                                                {hoveredWord.definition.original}
                                                {hoveredWord.definition.transliteration && (
                                                    <span className="text-zinc-500 ml-2">({hoveredWord.definition.transliteration})</span>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    <div className="mb-3">
                                        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Definition</span>
                                        <p className="text-sm text-zinc-300 leading-relaxed mt-1">{hoveredWord.definition.definition}</p>
                                    </div>
                                    {hoveredWord.definition.theologicalSignificance && (
                                        <div className="mb-3">
                                            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Theological Significance</span>
                                            <p className="text-sm text-zinc-400 leading-relaxed mt-1 italic">{hoveredWord.definition.theologicalSignificance}</p>
                                        </div>
                                    )}
                                    {hoveredWord.definition.relatedVerses && hoveredWord.definition.relatedVerses.length > 0 && (
                                        <div>
                                            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Related Verses</span>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {hoveredWord.definition.relatedVerses.map((v, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleVerseClick(v)}
                                                        className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs hover:bg-purple-500/20"
                                                    >
                                                        {v}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center py-4">
                                    <div className="w-5 h-5 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mr-3" />
                                    <span className="text-sm text-zinc-500">Looking up definition...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
