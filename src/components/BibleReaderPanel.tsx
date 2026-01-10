'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Book, ChevronLeft, ChevronRight, X, Settings, Search,
    BookOpen, ChevronDown, Bookmark, Copy, Check, Maximize2, Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import bibleService, { BIBLE_VERSIONS, BIBLE_BOOKS, BibleVersionId, BibleVerse } from '@/services/bibleService';

interface BibleReaderProps {
    isOpen: boolean;
    onClose: () => void;
    onInsertVerse?: (verse: string, reference: string) => void;
}

export function BibleReader({ isOpen, onClose, onInsertVerse }: BibleReaderProps) {
    // Navigation state
    const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS[39]); // Matthew
    const [selectedChapter, setSelectedChapter] = useState(1);
    const [selectedVersion, setSelectedVersion] = useState<BibleVersionId>('esv');

    // UI state
    const [showBookPicker, setShowBookPicker] = useState(false);
    const [showVersionPicker, setShowVersionPicker] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<BibleVerse[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [bookFilter, setBookFilter] = useState(''); // For filtering books in the picker

    // Content state
    const [chapterContent, setChapterContent] = useState<BibleVerse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedVerse, setCopiedVerse] = useState<number | null>(null);

    // Word meaning hover
    const [hoveredWord, setHoveredWord] = useState<{
        word: string;
        meaning: any;
        x: number;
        y: number;
    } | null>(null);

    // Settings
    const [fontSize, setFontSize] = useState(16);
    const [lineHeight, setLineHeight] = useState(1.8);

    const contentRef = useRef<HTMLDivElement>(null);

    // Load chapter content
    useEffect(() => {
        if (isOpen && selectedBook && selectedChapter) {
            loadChapter();
        }
    }, [selectedBook, selectedChapter, selectedVersion, isOpen]);

    const loadChapter = async () => {
        setIsLoading(true);
        try {
            const content = await bibleService.getChapter(
                selectedBook.name,
                selectedChapter,
                selectedVersion
            );
            setChapterContent(content);
        } catch (error) {
            console.error('Failed to load chapter:', error);
        }
        setIsLoading(false);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const results = await bibleService.searchVerses(searchQuery, selectedVersion);
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        }
        setIsSearching(false);
    };

    const handleWordClick = async (word: string, event: React.MouseEvent) => {
        const cleanWord = word.replace(/[^a-zA-Z]/g, '');
        if (cleanWord.length < 3) return;

        const rect = (event.target as HTMLElement).getBoundingClientRect();
        setHoveredWord({
            word: cleanWord,
            meaning: null,
            x: rect.left,
            y: rect.bottom + 5
        });

        const meaning = await bibleService.getWordMeaning(cleanWord, chapterContent?.text);
        setHoveredWord(prev => prev ? { ...prev, meaning } : null);
    };

    const copyVerse = (verseNum: number, text: string) => {
        const reference = `${selectedBook.name} ${selectedChapter}:${verseNum}`;
        navigator.clipboard.writeText(`"${text}" - ${reference} (${selectedVersion.toUpperCase()})`);
        setCopiedVerse(verseNum);
        setTimeout(() => setCopiedVerse(null), 2000);
    };

    const insertVerseToNote = (verseNum: number, text: string) => {
        if (onInsertVerse) {
            const reference = `${selectedBook.name} ${selectedChapter}:${verseNum}`;
            onInsertVerse(text, reference);
        }
    };

    const navigateChapter = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            if (selectedChapter > 1) {
                setSelectedChapter(selectedChapter - 1);
            } else {
                const currentIndex = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
                if (currentIndex > 0) {
                    const prevBook = BIBLE_BOOKS[currentIndex - 1];
                    setSelectedBook(prevBook);
                    setSelectedChapter(prevBook.chapters);
                }
            }
        } else {
            if (selectedChapter < selectedBook.chapters) {
                setSelectedChapter(selectedChapter + 1);
            } else {
                const currentIndex = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
                if (currentIndex < BIBLE_BOOKS.length - 1) {
                    setSelectedBook(BIBLE_BOOKS[currentIndex + 1]);
                    setSelectedChapter(1);
                }
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className={cn(
            "flex flex-col h-full bg-zinc-900 border-l border-zinc-800 transition-all duration-300 overflow-hidden",
            isExpanded ? "w-[600px]" : "w-[400px]"
        )}>
            {/* Header */}
            <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950/80 backdrop-blur shrink-0">
                <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold text-sm">Bible Reader</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        title={isExpanded ? "Minimize" : "Expand"}
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Navigation Bar */}
            <div className="flex items-center gap-2 p-3 border-b border-zinc-800 bg-zinc-950/50">
                {/* Book Selector */}
                <div className="relative flex-1">
                    <button
                        onClick={() => setShowBookPicker(!showBookPicker)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
                    >
                        <span className="truncate">{selectedBook.name} {selectedChapter}</span>
                        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                    </button>

                    {showBookPicker && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 max-h-80 overflow-hidden">
                            <div className="p-2 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
                                <input
                                    type="text"
                                    value={bookFilter}
                                    onChange={(e) => setBookFilter(e.target.value)}
                                    placeholder="Search books... (e.g., Titus)"
                                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-sm focus:outline-none focus:border-amber-500"
                                    autoFocus
                                />
                            </div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                                {BIBLE_BOOKS
                                    .filter(book =>
                                        book.name.toLowerCase().includes(bookFilter.toLowerCase()) ||
                                        book.id.toLowerCase().includes(bookFilter.toLowerCase())
                                    )
                                    .map(book => (
                                        <div key={book.id} className="mb-1">
                                            <button
                                                onClick={() => {
                                                    setSelectedBook(book);
                                                    setSelectedChapter(1);
                                                    setShowBookPicker(false);
                                                    setBookFilter(''); // Clear filter when selecting
                                                }}
                                                className={cn(
                                                    "w-full text-left px-3 py-1.5 rounded text-sm hover:bg-zinc-800 transition-colors",
                                                    book.id === selectedBook.id && "bg-amber-500/10 text-amber-400"
                                                )}
                                            >
                                                {book.name}
                                                <span className="text-xs text-zinc-500 ml-2">({book.chapters} ch)</span>
                                            </button>
                                        </div>
                                    ))}
                                {BIBLE_BOOKS.filter(book =>
                                    book.name.toLowerCase().includes(bookFilter.toLowerCase()) ||
                                    book.id.toLowerCase().includes(bookFilter.toLowerCase())
                                ).length === 0 && (
                                        <div className="text-center py-4 text-zinc-500 text-sm">
                                            No books found for "{bookFilter}"
                                        </div>
                                    )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Chapter Selector */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => navigateChapter('prev')}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <select
                        value={selectedChapter}
                        onChange={(e) => setSelectedChapter(Number(e.target.value))}
                        className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-sm focus:outline-none focus:border-amber-500"
                    >
                        {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
                            <option key={ch} value={ch}>{ch}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => navigateChapter('next')}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Version Selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowVersionPicker(!showVersionPicker)}
                        className="px-3 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-bold transition-colors"
                    >
                        {selectedVersion.toUpperCase()}
                    </button>

                    {showVersionPicker && (
                        <div className="absolute top-full right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 w-56 overflow-hidden">
                            <div className="p-2">
                                {BIBLE_VERSIONS.map(version => (
                                    <button
                                        key={version.id}
                                        onClick={() => {
                                            setSelectedVersion(version.id);
                                            setShowVersionPicker(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded text-sm hover:bg-zinc-800 transition-colors flex items-center justify-between",
                                            version.id === selectedVersion && "bg-amber-500/10 text-amber-400"
                                        )}
                                    >
                                        <span>{version.name}</span>
                                        <span className="text-xs font-bold text-zinc-500">{version.abbreviation}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 animate-in slide-in-from-top-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Display Settings</h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-300">Font Size</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="px-2 py-1 bg-zinc-800 rounded text-sm">A-</button>
                                <span className="text-xs text-zinc-500 w-8 text-center">{fontSize}</span>
                                <button onClick={() => setFontSize(Math.min(24, fontSize + 2))} className="px-2 py-1 bg-zinc-800 rounded text-sm">A+</button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-300">Line Height</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setLineHeight(Math.max(1.4, lineHeight - 0.2))} className="px-2 py-1 bg-zinc-800 rounded text-xs">−</button>
                                <span className="text-xs text-zinc-500 w-8 text-center">{lineHeight.toFixed(1)}</span>
                                <button onClick={() => setLineHeight(Math.min(2.4, lineHeight + 0.2))} className="px-2 py-1 bg-zinc-800 rounded text-xs">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="p-3 border-b border-zinc-800">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search Scripture..."
                        className="w-full pl-9 pr-20 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-amber-500 placeholder:text-zinc-600"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="absolute right-2 top-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                    >
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>

            {/* Content Area - Main scrollable container */}
            <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
                {searchResults.length > 0 ? (
                    /* Search Results */
                    <div className="p-4 pb-8">
                        <div className="flex items-center justify-between mb-4 sticky top-0 bg-zinc-900 py-2 -mt-2 z-10">
                            <h3 className="text-sm font-bold text-zinc-300">Search Results ({searchResults.length})</h3>
                            <button
                                onClick={() => {
                                    setSearchResults([]);
                                    setSearchQuery('');
                                }}
                                className="text-xs text-zinc-500 hover:text-white px-2 py-1 hover:bg-zinc-800 rounded transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="space-y-4">
                            {searchResults.map((result, i) => (
                                <div key={i} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-amber-400">{result.reference}</span>
                                        <span className="text-xs text-zinc-600">{result.translation}</span>
                                    </div>
                                    <p className="text-sm text-zinc-300 italic leading-relaxed">{result.text}</p>
                                    {onInsertVerse && (
                                        <button
                                            onClick={() => onInsertVerse(result.text, result.reference)}
                                            className="mt-3 text-xs text-amber-500 hover:text-amber-400 hover:underline"
                                        >
                                            Insert into note →
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center h-full min-h-[300px]">
                        <div className="text-center">
                            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm text-zinc-500">Loading...</p>
                        </div>
                    </div>
                ) : isSearching ? (
                    <div className="flex items-center justify-center h-full min-h-[300px]">
                        <div className="text-center">
                            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm text-zinc-500">Searching Scripture...</p>
                        </div>
                    </div>
                ) : chapterContent?.verses ? (
                    /* Chapter Content with Verses */
                    <div className="p-6 pb-12">
                        <h2 className="text-xl font-serif font-bold text-center mb-6 text-zinc-200">
                            {selectedBook.name} {selectedChapter}
                        </h2>
                        <div
                            className="space-y-1"
                            style={{ fontSize: `${fontSize}px`, lineHeight }}
                        >
                            {chapterContent.verses.map((verse, i) => (
                                <span
                                    key={i}
                                    className="group inline"
                                >
                                    <sup className="text-xs text-amber-500/60 mr-1 font-mono">{verse.verse}</sup>
                                    <span className="text-zinc-300 hover:bg-zinc-800/50 rounded cursor-pointer transition-colors">
                                        {verse.text.split(' ').map((word, wi) => (
                                            <span
                                                key={wi}
                                                onClick={(e) => handleWordClick(word, e)}
                                                className="hover:text-amber-400 hover:underline decoration-amber-500/30 cursor-help"
                                            >
                                                {word}{' '}
                                            </span>
                                        ))}
                                    </span>
                                    <span className="opacity-0 group-hover:opacity-100 inline-flex gap-1 ml-1 transition-opacity">
                                        <button
                                            onClick={() => copyVerse(verse.verse, verse.text)}
                                            className="p-0.5 text-zinc-500 hover:text-white"
                                            title="Copy"
                                        >
                                            {copiedVerse === verse.verse ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                        {onInsertVerse && (
                                            <button
                                                onClick={() => insertVerseToNote(verse.verse, verse.text)}
                                                className="p-0.5 text-zinc-500 hover:text-amber-400"
                                                title="Insert"
                                            >
                                                <BookOpen className="w-3 h-3" />
                                            </button>
                                        )}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                ) : chapterContent?.text ? (
                    /* Fallback: Plain text */
                    <div className="p-6 pb-12">
                        <h2 className="text-xl font-serif font-bold text-center mb-6 text-zinc-200">
                            {chapterContent.reference}
                        </h2>
                        <p
                            className="text-zinc-300 leading-relaxed font-serif"
                            style={{ fontSize: `${fontSize}px`, lineHeight }}
                        >
                            {chapterContent.text}
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full min-h-[300px]">
                        <p className="text-sm text-zinc-500">Select a chapter to read</p>
                    </div>
                )}
            </div>

            {/* Word Meaning Popup */}
            {hoveredWord && (
                <div
                    className="fixed bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl z-50 w-72 max-w-[90vw] animate-in fade-in zoom-in-95"
                    style={{
                        left: Math.min(hoveredWord.x, window.innerWidth - 300),
                        top: hoveredWord.y
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-3 border-b border-zinc-800">
                        <span className="font-bold text-amber-400">{hoveredWord.word}</span>
                        <button onClick={() => setHoveredWord(null)} className="text-zinc-500 hover:text-white">×</button>
                    </div>
                    <div className="p-4">
                        {hoveredWord.meaning ? (
                            <>
                                {hoveredWord.meaning.original && (
                                    <div className="mb-2">
                                        <span className="text-xs text-zinc-500">Original: </span>
                                        <span className="text-sm text-zinc-300 font-mono">{hoveredWord.meaning.original}</span>
                                        {hoveredWord.meaning.transliteration && (
                                            <span className="text-xs text-zinc-500 ml-2">({hoveredWord.meaning.transliteration})</span>
                                        )}
                                    </div>
                                )}
                                <p className="text-sm text-zinc-300 leading-relaxed">{hoveredWord.meaning.meaning}</p>
                                {hoveredWord.meaning.usage && (
                                    <p className="text-xs text-zinc-500 mt-2 italic">{hoveredWord.meaning.usage}</p>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                                <span className="text-sm text-zinc-500">Loading...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer Navigation */}
            <div className="h-12 border-t border-zinc-800 flex items-center justify-between px-4 bg-zinc-950/80 shrink-0">
                <button
                    onClick={() => navigateChapter('prev')}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                </button>
                <span className="text-xs text-zinc-600">{selectedVersion.toUpperCase()}</span>
                <button
                    onClick={() => navigateChapter('next')}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                    Next
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Click-away listener for popups */}
            {(showBookPicker || showVersionPicker) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => { setShowBookPicker(false); setShowVersionPicker(false); }}
                />
            )}
            {hoveredWord && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setHoveredWord(null)}
                />
            )}
        </div>
    );
}
