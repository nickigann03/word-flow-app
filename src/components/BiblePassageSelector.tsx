
import { useState } from 'react';
import { Book, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BIBLE_BOOKS, BIBLE_VERSIONS, BibleBook, BibleVersionId } from '@/services/bibleService';
import { Modal } from './Modal';

interface BiblePassageSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (selection: { book: BibleBook, chapter: number, endChapter: number, version: BibleVersionId }) => void;
}

export function BiblePassageSelector({ isOpen, onClose, onSelect }: BiblePassageSelectorProps) {
    const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS[39]); // Default: Matthew
    const [startChapter, setStartChapter] = useState(1);
    const [endChapter, setEndChapter] = useState(1); // Default to single chapter
    const [selectedVersion, setSelectedVersion] = useState<BibleVersionId>('esv');

    const [bookFilter, setBookFilter] = useState('');
    const [showBookPicker, setShowBookPicker] = useState(false);

    const handleConfirm = () => {
        onSelect({
            book: selectedBook,
            chapter: startChapter, // Backwards combatibility / primary chapter
            endChapter: endChapter, // Optional end range
            version: selectedVersion
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Select Scripture Passage">
            <div className="space-y-6">

                {/* Book Selection */}
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Book</label>
                    <div className="relative">
                        <button
                            onClick={() => setShowBookPicker(!showBookPicker)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-700 hover:border-blue-500 rounded-lg text-left transition-colors"
                        >
                            <span className="font-medium text-zinc-200">{selectedBook.name}</span>
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                        </button>

                        {showBookPicker && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-hidden flex flex-col">
                                <div className="p-2 border-b border-zinc-800 sticky top-0 bg-zinc-900">
                                    <input
                                        type="text"
                                        value={bookFilter}
                                        onChange={(e) => setBookFilter(e.target.value)}
                                        placeholder="Search books..."
                                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-sm focus:outline-none focus:border-blue-500"
                                        autoFocus
                                    />
                                </div>
                                <div className="overflow-y-auto custom-scrollbar p-2 flex-1">
                                    {BIBLE_BOOKS
                                        .filter(b => b.name.toLowerCase().includes(bookFilter.toLowerCase()))
                                        .map(book => (
                                            <button
                                                key={book.id}
                                                onClick={() => {
                                                    setSelectedBook(book);
                                                    setStartChapter(1);
                                                    setEndChapter(1);
                                                    setShowBookPicker(false);
                                                    setBookFilter('');
                                                }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 rounded text-sm hover:bg-zinc-800 transition-colors mb-1",
                                                    book.id === selectedBook.id && "bg-blue-500/10 text-blue-400"
                                                )}
                                            >
                                                {book.name}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chapter Range & Version Row */}
                <div className="grid grid-cols-3 gap-4">
                    {/* Start Chapter */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">From</label>
                        <select
                            value={startChapter}
                            onChange={(e) => {
                                const newStart = Number(e.target.value);
                                setStartChapter(newStart);
                                if (endChapter < newStart) setEndChapter(newStart);
                            }}
                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 hover:border-blue-500 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                        >
                            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
                                <option key={ch} value={ch}>Ch {ch}</option>
                            ))}
                        </select>
                    </div>

                    {/* End Chapter */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">To</label>
                        <select
                            value={endChapter}
                            onChange={(e) => setEndChapter(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 hover:border-blue-500 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                        >
                            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1)
                                .filter(ch => ch >= startChapter)
                                .map(ch => (
                                    <option key={ch} value={ch}>Ch {ch}</option>
                                ))}
                        </select>
                    </div>

                    {/* Version */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Version</label>
                        <select
                            value={selectedVersion}
                            onChange={(e) => setSelectedVersion(e.target.value as BibleVersionId)}
                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 hover:border-blue-500 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                        >
                            {BIBLE_VERSIONS.map(v => (
                                <option key={v.id} value={v.id}>{v.abbreviation.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Info Text */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-xs text-blue-200 flex flex-col gap-1">
                        <span className="font-bold">Manuscript Generation:</span>
                        <span>Creates a double-spaced, line-numbered document for <span className="text-white underline">{selectedBook.name} {startChapter === endChapter ? startChapter : `${startChapter}-${endChapter}`}</span>.</span>
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Check className="w-4 h-4" />
                        Create Manuscript
                    </button>
                </div>

                {/* Overlay for closing dropdowns */}
                {showBookPicker && (
                    <div className="fixed inset-0 z-40" onClick={() => setShowBookPicker(false)} />
                )}
            </div>
        </Modal>
    );
}
