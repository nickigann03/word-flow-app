'use client'
import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { CommentMark, CircleMark, FontSize } from './EditorExtensions';
import { BibleReferenceExtension } from './BibleReference';
import {
    Bold, Italic, Underline as UnderlineIcon,
    Heading1, Heading2, List, AlignLeft, AlignCenter, AlignRight,
    Sparkles, BookOpen, Quote, ChevronDown, Trash,
    Highlighter, Circle, MessageSquarePlus, Image as ImageIcon,
    Download, FileText, Youtube, Upload, Radio, Square, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import groqService from '@/services/groqService';
import audioRecorderService from '@/services/audioRecorderService';
import { Note } from '@/services/firestoreService';

// Dynamic import for html2pdf to avoid potential SSR issues if package is hostile (though usually fine)
// We'll require it inside the function or use standard import if it supports browser
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

interface NoteEditorProps {
    note: Note;
    onSave: (note: Note) => void;
    onExport?: (format: 'pdf' | 'md', note: Note) => void;
    onDelete?: () => void;
    pendingInsert?: { text: string; reference: string } | null;
    onInsertComplete?: () => void;
}

export function NoteEditor({ note, onSave, onExport, onDelete, pendingInsert, onInsertComplete }: NoteEditorProps) {
    const [title, setTitle] = useState(note.title);
    const [aiLoading, setAiLoading] = useState(false);
    const [exegeteResult, setExegeteResult] = useState<{ definition: string, verse: string } | null>(null);
    const [hoverVerse, setHoverVerse] = useState<{ verse: string, text: string, x: number, y: number } | null>(null);

    // Sermon Recording State
    const [isSermonRecording, setIsSermonRecording] = useState(false);
    const [sermonRecordingDuration, setSermonRecordingDuration] = useState(0);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Transcript / Import Dialog
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importText, setImportText] = useState('');

    // Comment Dialog
    const [showCommentDialog, setShowCommentDialog] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentSelection, setCommentSelection] = useState<{ from: number, to: number } | null>(null);

    const editorRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
            Underline,
            FontSize,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Image,
            CommentMark,
            CircleMark,
            BibleReferenceExtension.configure({
                onHover: async (verse, event) => {
                    const target = event.target as HTMLElement;
                    const rect = target.getBoundingClientRect();
                    // Basic heuristic for popup position
                    setHoverVerse({ verse, text: 'Loading...', x: rect.left, y: rect.bottom + 5 });
                    try {
                        const res = await fetch(`https://bible-api.com/${encodeURIComponent(verse)}`);
                        if (res.ok) {
                            const data = await res.json();
                            setHoverVerse({ verse, text: data.text || 'Verse not found', x: rect.left, y: rect.bottom + 5 });
                        }
                    } catch (e) {
                        setHoverVerse(prev => prev ? { ...prev, text: 'Error loading verse' } : null);
                    }
                }
            }),
            Placeholder.configure({ placeholder: 'Type, paste transcript, or dictate...' }),
        ],
        content: note.content || '',
        immediatelyRender: false, // Fix SSR hydration mismatch
        editorProps: {
            attributes: {
                class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[500px] outline-none font-sans pl-8 pr-8 py-8',
            },
            handleKeyDown: (view, event) => {
                if (event.key === 'Tab') { return false; }
                return false;
            },
            handlePaste: (view, event) => {
                const items = Array.from(event.clipboardData?.items || []);
                const imageItem = items.find(item => item.type.startsWith('image'));

                if (imageItem) {
                    event.preventDefault();
                    const file = imageItem.getAsFile();
                    if (!file) return false;

                    const id = uuidv4();
                    const storageRef = ref(storage, `images/${note.userId}/${id}`);
                    setAiLoading(true); // Indicate upload

                    uploadBytes(storageRef, file).then(async () => {
                        const url = await getDownloadURL(storageRef);
                        const transaction = view.state.tr.replaceSelectionWith(
                            view.state.schema.nodes.image.create({ src: url })
                        );
                        view.dispatch(transaction);
                        setAiLoading(false);
                    }).catch(e => {
                        console.error('Upload failed', e);
                        setAiLoading(false);
                        alert("Image upload failed");
                    });

                    return true;
                }
                return false;
            }
        },
        onUpdate: ({ editor }) => {
            // autosave via effect
        }
    });

    useEffect(() => {
        if (editor && note.id !== previousNoteId) {
            editor.commands.setContent(note.content || '');
            setTitle(note.title);
            setPreviousNoteId(note.id!);
        }
    }, [note.id, editor]);
    const [previousNoteId, setPreviousNoteId] = useState(note.id);

    useEffect(() => {
        if (!editor) return;
        const timeout = setTimeout(() => {
            const currentHTML = editor.getHTML();
            if (title !== note.title || currentHTML !== note.content) {
                onSave({ ...note, title, content: currentHTML });
            }
        }, 1000);
        return () => clearTimeout(timeout);
    }, [title, editor?.getHTML(), note, onSave]);



    useEffect(() => {
        const clear = () => setHoverVerse(null);
        window.addEventListener('scroll', clear);
        window.addEventListener('click', clear); // Close on click elsewhere
        return () => { window.removeEventListener('scroll', clear); window.removeEventListener('click', clear); };
    }, []);

    // Handle pending verse insertions from Bible Reader or AI Chat
    useEffect(() => {
        if (pendingInsert && editor) {
            editor.commands.insertContent(
                `<blockquote>"${pendingInsert.text}" <cite>(${pendingInsert.reference})</cite></blockquote><p></p>`
            );
            onInsertComplete?.();
        }
    }, [pendingInsert, editor, onInsertComplete]);

    // Format duration as MM:SS
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Start sermon recording
    const handleStartSermonRecording = async () => {
        try {
            await audioRecorderService.startRecording();
            setIsSermonRecording(true);
            setSermonRecordingDuration(0);

            // Start duration counter
            recordingIntervalRef.current = setInterval(() => {
                setSermonRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Failed to start recording: ' + (error as Error).message);
        }
    };

    // Stop sermon recording and transcribe
    const handleStopSermonRecording = async () => {
        if (!editor) return;

        setAiLoading(true);

        // Stop duration counter
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }

        try {
            const result = await audioRecorderService.stopRecording();
            setIsSermonRecording(false);

            // Insert transcript section into the note
            const transcriptSection = `
                <h2>📝 Sermon Transcript</h2>
                <p><em>Recorded on ${new Date().toLocaleString()} (Duration: ${formatDuration(Math.round(result.duration))})</em></p>
                <hr/>
                <p>${result.transcript}</p>
                <hr/>
            `;

            editor.commands.insertContent(transcriptSection);

            // Optionally generate summary
            if (result.transcript.length > 100) {
                const summary = await groqService.summarizeSermon(result.transcript);
                editor.commands.insertContent(
                    `<blockquote><strong>📋 AI Summary:</strong><br/>${summary}</blockquote><p></p>`
                );
            }
        } catch (error) {
            console.error('Recording/transcription failed:', error);
            alert('Recording failed: ' + (error as Error).message);
            setIsSermonRecording(false);
        }

        setAiLoading(false);
    };



    const handleAIAnalyze = async () => {
        if (!editor) return;
        setAiLoading(true);
        try {
            const text = editor.getText();
            const summary = await groqService.summarizeSermon(text);
            editor.commands.insertContent(`<blockquote><strong>AI Analysis:</strong><br/>${summary}</blockquote><p></p>`);
        } catch (e) { console.error(e); }
        setAiLoading(false);
    };

    const handleExegete = async () => {
        if (!editor) return;
        const selection = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
        if (!selection) return;
        setAiLoading(true);
        try {
            const res = await groqService.getTheologicalDefinition(selection);
            setExegeteResult(res);
        } catch (e) { console.error(e); }
        setAiLoading(false);
    };

    const handleImportProcess = async () => {
        if (!importText || !editor) return;
        setAiLoading(true);
        setShowImportDialog(false);
        try {
            // Append raw text
            editor.commands.insertContent(`<p>${importText}</p>`);
            // Generate Summary
            const summary = await groqService.summarizeSermon(importText);
            editor.commands.insertContent(`<blockquote><strong>Transcript Summary:</strong><br/>${summary}</blockquote><p></p>`);
            setImportText('');
        } catch (e) { console.error(e); }
        setAiLoading(false);
    };

    const handleExportPDF = async () => {
        if (!editorRef.current) return;
        const html2pdf = (await import('html2pdf.js')).default;
        const element = editorRef.current;
        const opt = {
            margin: 1,
            filename: `${title || 'document'}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } as any
        };
        html2pdf().set(opt).from(element).save();
    };

    const handleExportMD = () => {
        if (!editor) return;
        const text = editor.getText(); // Or a proper HTML->MD converter if strict
        const blob = new Blob([text], { type: 'text/markdown' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${title || 'document'}.md`;
        link.click();
    };

    const openCommentDialog = () => {
        if (!editor) return;
        if (editor.state.selection.empty) {
            alert("Please select text to add a comment.");
            return;
        }
        setCommentSelection({ from: editor.state.selection.from, to: editor.state.selection.to });
        setCommentText('');
        setShowCommentDialog(true);
    };

    const handleSaveComment = () => {
        if (editor && commentSelection && commentText) {
            editor.chain()
                .setTextSelection(commentSelection)
                .setComment(commentText)
                .run();
        }
        setShowCommentDialog(false);
        setCommentText('');
        setCommentSelection(null);
    };

    const addImage = () => {
        const url = prompt("Image URL:");
        if (url && editor) { editor.chain().focus().setImage({ src: url }).run(); }
    }

    return (
        <div className="flex flex-col h-full bg-zinc-950 relative">
            {/* Toolbar */}
            <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-1">
                    {isSermonRecording && (
                        <span className="flex items-center gap-2 px-2 py-1 bg-red-500/10 rounded-full">
                            <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
                            <Clock className="w-3 h-3 text-red-400" />
                            <span className="text-xs font-mono text-red-400">{formatDuration(sermonRecordingDuration)}</span>
                        </span>
                    )}
                    {aiLoading && <span className="text-xs text-amber-500 animate-pulse font-mono">AI Processing...</span>}
                </div>
                <div className="flex items-center gap-2">
                    {/* Actions */}
                    <button onClick={() => setShowImportDialog(true)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Import Transcript / YouTube"><Upload className="w-4 h-4" /></button>
                    <button onClick={handleExportPDF} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Export PDF"><FileText className="w-4 h-4" /></button>
                    <div className="h-4 w-px bg-zinc-800 mx-1" />

                    {/* Sermon Recording Button */}
                    {isSermonRecording ? (
                        <button
                            onClick={handleStopSermonRecording}
                            disabled={aiLoading}
                            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-full bg-red-600 text-white shadow-lg shadow-red-500/30 hover:bg-red-500 transition-all"
                        >
                            <Square className="w-3 h-3" /> Stop Recording
                        </button>
                    ) : (
                        <button
                            onClick={handleStartSermonRecording}
                            disabled={aiLoading}
                            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-full bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500 transition-all disabled:opacity-50"
                            title="Record sermon and transcribe"
                        >
                            <Radio className="w-3.5 h-3.5" /> Record Sermon
                        </button>
                    )}

                    <button onClick={handleAIAnalyze} disabled={aiLoading} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-500 hover:bg-amber-500/10 rounded-full transition-colors"><Sparkles className={cn("w-3.5 h-3.5", aiLoading && "animate-spin")} /> Analyze</button>
                    {onDelete && <><div className="h-4 w-px bg-zinc-800 mx-1" /><button onClick={onDelete} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors" title="Delete Note"><Trash className="w-4 h-4" /></button></>}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto" ref={editorRef}>
                <div className="max-w-3xl mx-auto py-12 px-8 min-h-[90vh] bg-zinc-950">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-transparent text-4xl font-bold text-zinc-100 placeholder:text-zinc-700 focus:outline-none mb-6 font-display" placeholder="Untitled Sermon" />

                    {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 p-1.5 rounded-lg shadow-xl overflow-x-auto max-w-[90vw]">
                        <div className="flex items-center gap-0.5 border-r border-zinc-800 pr-1">
                            <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('bold') && "text-blue-400 bg-blue-500/10")} title="Bold"><Bold className="w-4 h-4" /></button>
                            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('italic') && "text-blue-400 bg-blue-500/10")} title="Italic"><Italic className="w-4 h-4" /></button>
                            <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('underline') && "text-blue-400 bg-blue-500/10")} title="Underline"><UnderlineIcon className="w-4 h-4" /></button>
                        </div>
                        {/* Font Size */}
                        <div className="flex items-center gap-0.5 border-r border-zinc-800 px-1">
                            <button onClick={() => editor.chain().focus().setFontSize('12px').run()} className={cn("px-1.5 py-1 text-xs hover:bg-zinc-800 rounded text-zinc-400", editor.isActive('textStyle', { fontSize: '12px' }) && "text-white bg-zinc-800")}>S</button>
                            <button onClick={() => editor.chain().focus().unsetFontSize().run()} className={cn("px-1.5 py-1 text-sm hover:bg-zinc-800 rounded text-zinc-300", !editor.isActive('textStyle', { fontSize: '12px' }) && !editor.isActive('textStyle', { fontSize: '20px' }) && "text-white bg-zinc-800")}>M</button>
                            <button onClick={() => editor.chain().focus().setFontSize('20px').run()} className={cn("px-1.5 py-1 text-lg hover:bg-zinc-800 rounded text-zinc-200", editor.isActive('textStyle', { fontSize: '20px' }) && "text-white bg-zinc-800")}>L</button>
                            <button onClick={() => editor.chain().focus().setFontSize('28px').run()} className={cn("px-1.5 py-1 text-xl hover:bg-zinc-800 rounded text-zinc-100", editor.isActive('textStyle', { fontSize: '28px' }) && "text-white bg-zinc-800")}>XL</button>
                        </div>

                        {/* Formatting */}
                        <div className="flex items-center gap-0.5 border-r border-zinc-800 px-1">
                            <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive({ textAlign: 'left' }) && "text-blue-400")}><AlignLeft className="w-4 h-4" /></button>
                            <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive({ textAlign: 'center' }) && "text-blue-400")}><AlignCenter className="w-4 h-4" /></button>
                        </div>
                        <div className="flex items-center gap-1 border-r border-zinc-800 px-1">
                            <button onClick={() => editor.chain().focus().setColor('#f87171').run()} className={cn("w-3 h-3 rounded-full bg-red-400 hover:scale-110 transition-transform", editor.isActive('textStyle', { color: '#f87171' }) && "ring-2 ring-white")} />
                            <button onClick={() => editor.chain().focus().setColor('#60a5fa').run()} className={cn("w-3 h-3 rounded-full bg-blue-400 hover:scale-110 transition-transform", editor.isActive('textStyle', { color: '#60a5fa' }) && "ring-2 ring-white")} />
                            <button onClick={() => editor.chain().focus().setColor('#facc15').run()} className={cn("w-3 h-3 rounded-full bg-yellow-400 hover:scale-110 transition-transform", editor.isActive('textStyle', { color: '#facc15' }) && "ring-2 ring-white")} />
                            <button onClick={() => editor.chain().focus().unsetColor().run()} className="text-[10px] text-zinc-500 hover:text-white">x</button>
                        </div>
                        <div className="flex items-center gap-0.5 pl-1">
                            <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('highlight') && "text-amber-400")} title="Highlight"><Highlighter className="w-4 h-4" /></button>
                            <button onClick={() => editor.chain().focus().toggleCircle().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('circle') && "text-red-400")} title="Circle Word"><Circle className="w-4 h-4" /></button>
                            <button onClick={openCommentDialog} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('comment') && "text-blue-400")} title="Add Comment"><MessageSquarePlus className="w-4 h-4" /></button>
                            <button onClick={handleExegete} className="ml-1 p-1.5 hover:bg-zinc-800 rounded flex items-center gap-1 text-xs font-semibold text-purple-400 bg-purple-500/10"><BookOpen className="w-3 h-3" /> Exegete</button>
                        </div>
                    </BubbleMenu>}

                    {editor && <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 p-1 rounded-lg shadow-xl -ml-20">
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("p-1 hover:bg-zinc-800 rounded", editor.isActive('heading', { level: 1 }) && "text-blue-400")}><Heading1 className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("p-1 hover:bg-zinc-800 rounded", editor.isActive('heading', { level: 2 }) && "text-blue-400")}><Heading2 className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1 hover:bg-zinc-800 rounded", editor.isActive('bulletList') && "text-blue-400")}><List className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("p-1 hover:bg-zinc-800 rounded", editor.isActive('blockquote') && "text-blue-400")}><Quote className="w-4 h-4" /></button>
                        <div className="w-px h-4 bg-zinc-700 mx-1" />
                        <button onClick={addImage} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Insert Image Link"><ImageIcon className="w-4 h-4" /></button>
                    </FloatingMenu>}

                    <EditorContent editor={editor} />
                </div>
            </div>

            {/* Exegete Result */}
            {exegeteResult && (
                <div className="fixed bottom-6 right-6 w-80 bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Theological Insight</span><button onClick={() => setExegeteResult(null)} className="text-zinc-500 hover:text-zinc-300">×</button></div>
                    <p className="text-sm text-zinc-200 leading-relaxed mb-3">{exegeteResult.definition}</p>
                    <div className="text-xs text-zinc-500 font-mono border-t border-zinc-800 pt-2 flex items-center gap-2"><BookOpen className="w-3 h-3" /> {exegeteResult.verse}</div>
                </div>
            )}

            {/* Hover Verse */}
            {hoverVerse && (
                <div
                    className="fixed bg-zinc-950 border border-zinc-700 p-0 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 w-80 max-w-[90vw] max-h-80 flex flex-col pointer-events-auto"
                    style={{ left: Math.min(hoverVerse.x, window.innerWidth - 340), top: hoverVerse.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-950/95 sticky top-0 backdrop-blur z-10">
                        <span className="text-xs font-bold text-purple-400">{hoverVerse.verse}</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    editor?.chain().focus().insertContent(`<blockquote>${hoverVerse.text} <cite>(${hoverVerse.verse})</cite></blockquote><p></p>`).run();
                                    setHoverVerse(null);
                                }}
                                className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded-md font-medium transition-colors"
                            >
                                Insert
                            </button>
                            <button onClick={() => setHoverVerse(null)} className="text-zinc-500 hover:text-white">×</button>
                        </div>
                    </div>
                    <div className="p-4 overflow-y-auto custom-scrollbar">
                        <p className="text-sm text-zinc-300 italic leading-relaxed">{hoverVerse.text}</p>
                    </div>
                </div>
            )}

            {/* Import Dialog */}
            {showImportDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <h3 className="text-lg font-bold mb-2">Import Transcript / Video Content</h3>
                        <p className="text-sm text-zinc-400 mb-4">Paste transcript text or YouTube captions here. AI will summarize it and add it to your note.</p>
                        <textarea
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                            className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
                            placeholder="Paste text here..."
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowImportDialog(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                            <button onClick={handleImportProcess} disabled={!importText} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50">Summarize & Import</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Comment Dialog */}
            {showCommentDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95">
                        <h3 className="text-lg font-bold mb-4">Add Comment</h3>
                        <textarea
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 mb-4"
                            placeholder="Type your comment..."
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowCommentDialog(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                            <button onClick={handleSaveComment} disabled={!commentText} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50">Save Comment</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
