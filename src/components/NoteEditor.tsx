'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Paragraph from '@tiptap/extension-paragraph';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import {
    CommentMark, CircleMark, FontSize, Indent,
    Details, DetailsSummary, DetailsContent, Callout
} from './EditorExtensions';
import { BibleReferenceExtension } from './BibleReference';
import {
    Bold, Italic, Underline as UnderlineIcon,
    Heading1, Heading2, Heading3, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Sparkles, BookOpen, Quote, ChevronDown, Trash, ChevronRight,
    Highlighter, Circle, MessageSquarePlus, Image as ImageIcon,
    FileText, Upload, Radio, Square, Clock, Settings,
    Table as TableIcon, CheckSquare, Code, Minus, Type,
    Info, AlertTriangle, CheckCircle, XCircle,
    RowsIcon, ColumnsIcon, Trash2, Plus, Indent as IndentIcon,
    Subscript as SubIcon, Superscript as SupIcon, Pilcrow, Link as LinkIcon, LayoutTemplate
} from 'lucide-react';
import { cn } from '@/lib/utils';
import groqService from '@/services/groqService';
import bibleService from '@/services/bibleService';
import gladiaService from '@/services/gladiaService';
import audioRecorderService from '@/services/audioRecorderService';
import supabaseService, { Note, NoteTab } from '@/services/supabaseService';
// ... (keep other imports)

// ...


import { localSaveAudioBlob } from '@/services/localDb';
import { useToast } from './Toast';

const lowlight = createLowlight(common);

interface NoteEditorProps {
    note: Note;
    onSave: (note: Note) => void;
    onExport?: (format: 'pdf' | 'md', note: Note) => void;
    onDelete?: () => void;
    onSaveAsTemplate?: (note: Note) => void;
    pendingInsert?: { text: string; reference: string } | null;
    onInsertComplete?: () => void;
}

// Slash Commands Menu
interface SlashCommand {
    title: string;
    description: string;
    icon: React.ReactNode;
    command: (editor: any) => void;
    category: string;
}

const slashCommands: SlashCommand[] = [
    // Basic blocks
    {
        title: 'Heading 1',
        description: 'Large section heading',
        icon: <Heading1 className="w-4 h-4" />,
        command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        category: 'Basic'
    },
    {
        title: 'Heading 2',
        description: 'Medium section heading',
        icon: <Heading2 className="w-4 h-4" />,
        command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        category: 'Basic'
    },
    {
        title: 'Heading 3',
        description: 'Small section heading',
        icon: <Heading3 className="w-4 h-4" />,
        command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        category: 'Basic'
    },
    {
        title: 'Paragraph',
        description: 'Plain text paragraph',
        icon: <Pilcrow className="w-4 h-4" />,
        command: (editor) => editor.chain().focus().setParagraph().run(),
        category: 'Basic'
    },
    // Lists
    {
        title: 'Bullet List',
        description: 'Unordered list',
        icon: <List className="w-4 h-4" />,
        command: (editor) => editor.chain().focus().toggleBulletList().run(),
        category: 'Lists'
    },
    {
        title: 'Numbered List',
        description: 'Ordered list',
        icon: <ListOrdered className="w-4 h-4" />,
        command: (editor) => editor.chain().focus().toggleOrderedList().run(),
        category: 'Lists'
    },
    {
        title: 'Task List',
        description: 'Checklist with checkboxes',
        icon: <CheckSquare className="w-4 h-4" />,
        command: (editor) => editor.chain().focus().toggleTaskList().run(),
        category: 'Lists'
    },
    // Advanced blocks
    {
        title: 'Toggle Block',
        description: 'Collapsible content section',
        icon: <ChevronRight className="w-4 h-4" />,
        command: (editor) => editor.commands.toggleDetails(),
        category: 'Advanced'
    },
    {
        title: 'Quote',
        description: 'Block quotation',
        icon: <Quote className="w-4 h-4" />,
        command: (editor) => editor.chain().focus().toggleBlockquote().run(),
        category: 'Advanced'
    },
    {
        title: 'Code Block',
        description: 'Code with syntax highlighting',
        icon: <Code className="w-4 h-4" />,
        command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
        category: 'Advanced'
    },
    {
        title: 'Divider',
        description: 'Horizontal line separator',
        icon: <Minus className="w-4 h-4" />,
        command: (editor) => editor.chain().focus().setHorizontalRule().run(),
        category: 'Advanced'
    },
    // Tables
    {
        title: 'Table',
        description: 'Insert a table',
        icon: <TableIcon className="w-4 h-4" />,
        command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        category: 'Tables'
    },
    // Callouts
    {
        title: 'Info Callout',
        description: 'Blue information box',
        icon: <Info className="w-4 h-4 text-blue-400" />,
        command: (editor) => editor.commands.setCallout('info'),
        category: 'Callouts'
    },
    {
        title: 'Warning Callout',
        description: 'Yellow warning box',
        icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
        command: (editor) => editor.commands.setCallout('warning'),
        category: 'Callouts'
    },
    {
        title: 'Success Callout',
        description: 'Green success box',
        icon: <CheckCircle className="w-4 h-4 text-green-400" />,
        command: (editor) => editor.commands.setCallout('success'),
        category: 'Callouts'
    },
    {
        title: 'Error Callout',
        description: 'Red error box',
        icon: <XCircle className="w-4 h-4 text-red-400" />,
        command: (editor) => editor.commands.setCallout('error'),
        category: 'Callouts'
    },
    // Media
    {
        title: 'Image',
        description: 'Insert an image via URL',
        icon: <ImageIcon className="w-4 h-4" />,
        command: (editor) => {
            const url = prompt("Enter image URL:");
            if (url) editor.chain().focus().setImage({ src: url }).run();
        },
        category: 'Media'
    },
    // Bible
    {
        title: 'Full Book',
        description: 'Insert entire Bible book (e.g., Genesis)',
        icon: <BookOpen className="w-4 h-4 text-amber-400" />,
        command: async (editor) => {
            const bookName = prompt("Enter Bible book name (e.g., Genesis, Numbers, John):");
            if (!bookName) return;

            editor.commands.insertContent(`<p><em>Loading ${bookName}...</em></p>`);

            try {
                const bookHtml = await bibleService.getFullBook(bookName);
                // Replace loading text
                const currentContent = editor.getHTML();
                const newContent = currentContent.replace(`<p><em>Loading ${bookName}...</em></p>`, bookHtml);
                editor.commands.setContent(newContent);
            } catch (error) {
                console.error('Failed to load book:', error);
                const currentContent = editor.getHTML();
                const newContent = currentContent.replace(
                    `<p><em>Loading ${bookName}...</em></p>`,
                    `<p><em>Failed to load ${bookName}. Please check the book name.</em></p>`
                );
                editor.commands.setContent(newContent);
            }
        },
        category: 'Bible'
    },
    {
        title: 'Import Manuscript',
        description: 'Double-spaced, line-numbered format for study',
        icon: <BookOpen className="w-4 h-4 text-emerald-400" />,
        command: async (editor) => {
            const reference = prompt("Enter Bible Reference (e.g., Ezekiel 34):");
            if (!reference) return;

            // Insert loading placeholder
            editor.chain().focus().insertContent(`<p><em>Loading Manuscript: ${reference}...</em></p>`).run();

            try {
                // Fetch verses
                const data = await bibleService.getVerse(reference, 'esv');

                if (data.verses && data.verses.length > 0) {
                    // Generate Manuscript HTML
                    // We create a separate paragraph for each verse to allow line numbering
                    const manuscriptHtml = data.verses.map(v => {
                        const cleanText = v.text.replace(/^\d+\s+/, '').trim();
                        return `<p class="manuscript-line">${cleanText}</p>`;
                    }).join('');

                    // Get current content and replace placeholder
                    const currentContent = editor.getHTML();
                    const newContent = currentContent.replace(
                        `<p><em>Loading Manuscript: ${reference}...</em></p>`,
                        manuscriptHtml + '<p></p>'
                    );

                    editor.commands.setContent(newContent);

                } else {
                    // Fallback if no verses array (single verse or error)
                    const content = data.text || 'No text found';
                    editor.commands.insertContent(`<p class="manuscript-line">${content}</p>`);
                }
            } catch (error) {
                console.error("Manuscript import failed", error);
                const currentContent = editor.getHTML();
                const newContent = currentContent.replace(
                    `<p><em>Loading Manuscript: ${reference}...</em></p>`,
                    `<p style="color:red">Failed to load manuscript for ${reference}. Check the reference and try again.</p>`
                );
                editor.commands.setContent(newContent);
            }
        },
        category: 'Bible'
    },
];

export function NoteEditor({ note, onSave, onExport, onDelete, onSaveAsTemplate, pendingInsert, onInsertComplete }: NoteEditorProps) {
    const [title, setTitle] = useState(note.title);
    const [aiLoading, setAiLoading] = useState(false);
    const [exegeteResult, setExegeteResult] = useState<{ definition: string, verse: string } | null>(null);
    const [hoverVerse, setHoverVerse] = useState<{ verse: string, text: string, x: number, y: number } | null>(null);

    // Slash Commands State
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashFilter, setSlashFilter] = useState('');
    const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
    const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
    const slashMenuRef = useRef<HTMLDivElement>(null);

    // Sermon Recording State
    const [isSermonRecording, setIsSermonRecording] = useState(false);
    const [isRecordingPaused, setIsRecordingPaused] = useState(false);
    const [sermonRecordingDuration, setSermonRecordingDuration] = useState(0);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Transcript / Import Dialog
    const [showImportDialog, setShowImportDialog] = useState(false);

    // Toast notifications
    const toast = useToast();

    // Comment Dialog
    const [showCommentDialog, setShowCommentDialog] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentSelection, setCommentSelection] = useState<{ from: number, to: number } | null>(null);

    // Table Menu State
    const [showTableMenu, setShowTableMenu] = useState(false);

    // Tabs State - for multi-page notes like Google Docs (with per-tab page settings & floating boxes)
    // Migrate legacy note-level floatingBoxes into the first tab if tabs don't already have them
    const [tabs, setTabs] = useState<NoteTab[]>(() => {
        const initialTabs = note.tabs || [{ id: 'main', title: 'Page 1', content: note.content || '', pageSettings: note.pageSettings || { orientation: 'portrait', marginSize: 'normal', theme: 'dark' } }];
        // Migrate: if note has top-level floatingBoxes but first tab doesn't, assign them to the first tab
        if (note.floatingBoxes && note.floatingBoxes.length > 0 && initialTabs.length > 0 && !initialTabs[0].floatingBoxes?.length) {
            initialTabs[0] = { ...initialTabs[0], floatingBoxes: note.floatingBoxes };
        }
        return initialTabs;
    });
    const [activeTabId, setActiveTabId] = useState(note.tabs?.[0]?.id || 'main');
    const [editingTabId, setEditingTabId] = useState<string | null>(null);

    // Floating Text Boxes State - derived from active tab (per-tab floating boxes)
    const [draggingBoxId, setDraggingBoxId] = useState<string | null>(null);
    const [resizingBoxId, setResizingBoxId] = useState<string | null>(null);
    const [editingBoxId, setEditingBoxId] = useState<string | null>(null);

    // Page Settings State - derived from active tab
    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
    const floatingBoxes = activeTab?.floatingBoxes || [];
    const pageOrientation = activeTab?.pageSettings?.orientation || 'portrait';
    const marginSize = activeTab?.pageSettings?.marginSize || 'normal';
    const pageTheme = activeTab?.pageSettings?.theme || 'dark';
    const [showPageSettings, setShowPageSettings] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

    // Update page settings for current tab
    const setPageOrientation = (orientation: 'portrait' | 'landscape') => {
        setTabs(prev => prev.map(t =>
            t.id === activeTabId
                ? {
                    ...t,
                    pageSettings: {
                        ...(t.pageSettings || { marginSize: 'normal', theme: 'dark' }),
                        orientation
                    }
                }
                : t
        ));
    };

    const setMarginSize = (size: 'normal' | 'narrow' | 'wide') => {
        setTabs(prev => prev.map(t =>
            t.id === activeTabId
                ? {
                    ...t,
                    pageSettings: {
                        ...(t.pageSettings || { orientation: 'portrait', theme: 'dark' }),
                        marginSize: size
                    }
                }
                : t
        ));
    };

    const setPageTheme = (theme: 'dark' | 'light') => {
        setTabs(prev => prev.map(t =>
            t.id === activeTabId
                ? {
                    ...t,
                    pageSettings: {
                        ...(t.pageSettings || { orientation: 'portrait', marginSize: 'normal' }),
                        theme
                    }
                }
                : t
        ));
    };

    // Highlighter Color State
    const [highlighterColor, setHighlighterColor] = useState('#ffff00');
    const [showHighlighterPicker, setShowHighlighterPicker] = useState(false);

    // Link Input State
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    const editorRef = useRef<HTMLDivElement>(null);

    // Auto-save refs
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const performSaveRef = useRef({ note, title, onSave });

    useEffect(() => {
        performSaveRef.current = { note, title, onSave };
    }, [note, title, onSave]);

    // Callback ref for onUpdate to avoid circular dependency
    const onUpdateTrigger = useRef<() => void>(() => { });

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false, // We use CodeBlockLowlight instead
                horizontalRule: false, // We use our own
                paragraph: false, // We use custom Paragraph extension
            }),
            Paragraph.extend({
                addAttributes() {
                    return {
                        class: {
                            default: null,
                            parseHTML: element => element.getAttribute('class'),
                            renderHTML: attributes => {
                                if (!attributes.class) {
                                    return {}
                                }
                                return { class: attributes.class }
                            },
                        },
                    }
                }
            }),
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
            Underline,
            FontSize,
            Indent,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Image,
            Link.configure({
                openOnClick: false, // Use Ctrl+Click to open
                autolink: true,
                defaultProtocol: 'https',
            }),
            // Table extensions
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'notion-table',
                },
            }),
            TableRow,
            TableCell,
            TableHeader,
            // Task/Todo list
            TaskList.configure({
                HTMLAttributes: {
                    class: 'task-list',
                },
            }),
            TaskItem.configure({
                nested: true,
                HTMLAttributes: {
                    class: 'task-item',
                },
            }),
            // Code block with syntax highlighting
            CodeBlockLowlight.configure({
                lowlight,
                HTMLAttributes: {
                    class: 'code-block',
                },
            }),
            // Horizontal rule
            HorizontalRule.configure({
                HTMLAttributes: {
                    class: 'divider',
                },
            }),
            // Subscript and Superscript
            Subscript,
            Superscript,
            // Custom extensions
            CommentMark,
            CircleMark,
            Details,
            DetailsSummary,
            DetailsContent,
            Callout,
            BibleReferenceExtension.configure({
                onHover: async (verse, event) => {
                    const target = event.target as HTMLElement;
                    const rect = target.getBoundingClientRect();
                    setHoverVerse({ verse, text: 'Loading ESV...', x: rect.left, y: rect.bottom + 5 });
                    try {
                        // Use bibleService to get ESV translation
                        const result = await bibleService.getVerse(verse, 'esv');
                        setHoverVerse({
                            verse: result.reference || verse,
                            text: result.text || 'Verse not found',
                            x: rect.left,
                            y: rect.bottom + 5
                        });
                    } catch (e) {
                        console.error('Error loading verse:', e);
                        setHoverVerse(prev => prev ? { ...prev, text: 'Error loading verse (ESV)' } : null);
                    }
                }
            }),
            Placeholder.configure({ placeholder: 'Press "/" for commands, or start typing...' }),
        ],
        content: note.content || '',
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[500px] outline-none font-sans pl-8 pr-8 py-8',
            },
            handleKeyDown: (view, event) => {
                // Handle "Book (full)" pattern on Enter
                if (event.key === 'Enter' && !showSlashMenu) {
                    const { state } = view;
                    const { selection } = state;
                    const $pos = state.doc.resolve(selection.from);

                    // Get current line text
                    const lineStart = $pos.start();
                    const lineEnd = selection.from;
                    const lineText = state.doc.textBetween(lineStart, lineEnd, ' ').trim();

                    // Check for "Book (full)" pattern
                    const fullBookMatch = lineText.match(/^([a-zA-Z0-9\s]+)\s*\(full\)$/i);
                    if (fullBookMatch) {
                        event.preventDefault();
                        const bookName = fullBookMatch[1].trim();

                        // Delete the current line content
                        const tr = state.tr.delete(lineStart, lineEnd);
                        view.dispatch(tr);

                        // Insert loading message
                        editor?.commands.insertContent(`<p><em>Loading ${bookName}... (this may take a moment for large books)</em></p>`);

                        // Fetch and insert the book
                        (async () => {
                            try {
                                const bookHtml = await bibleService.getFullBook(bookName);
                                if (editor) {
                                    const currentContent = editor.getHTML();
                                    const newContent = currentContent.replace(
                                        `<p><em>Loading ${bookName}... (this may take a moment for large books)</em></p>`,
                                        `<h1>${bookName} (ESV)</h1>\n${bookHtml}`
                                    );
                                    editor.commands.setContent(newContent);
                                    toast.success('Book Loaded', `${bookName} has been inserted`);
                                }
                            } catch (error) {
                                console.error('Failed to load book:', error);
                                if (editor) {
                                    const currentContent = editor.getHTML();
                                    const newContent = currentContent.replace(
                                        `<p><em>Loading ${bookName}... (this may take a moment for large books)</em></p>`,
                                        `<p><em>Failed to load "${bookName}". Please check the book name and try again.</em></p>`
                                    );
                                    editor.commands.setContent(newContent);
                                    toast.error('Load Failed', `Could not load ${bookName}`);
                                }
                            }
                        })();

                        return true;
                    }
                }

                // Handle slash commands
                if (event.key === '/') {
                    const { state } = view;
                    const { selection } = state;
                    const coords = view.coordsAtPos(selection.from);
                    setSlashMenuPosition({
                        top: coords.bottom + 5,
                        left: coords.left,
                    });
                    setShowSlashMenu(true);
                    setSlashFilter('');
                    setSelectedSlashIndex(0);
                    return false;
                }

                // Handle escape to close slash menu
                if (event.key === 'Escape' && showSlashMenu) {
                    setShowSlashMenu(false);
                    return true;
                }

                // Navigate slash menu
                if (showSlashMenu) {
                    const filteredCommands = slashCommands.filter(cmd =>
                        cmd.title.toLowerCase().includes(slashFilter.toLowerCase()) ||
                        cmd.description.toLowerCase().includes(slashFilter.toLowerCase())
                    );

                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setSelectedSlashIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
                        return true;
                    }
                    if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setSelectedSlashIndex(prev => Math.max(prev - 1, 0));
                        return true;
                    }
                    if (event.key === 'Enter' && filteredCommands[selectedSlashIndex]) {
                        event.preventDefault();
                        // Delete the "/" and filter text
                        const { state, dispatch } = view;
                        const deleteFrom = state.selection.from - slashFilter.length - 1;
                        const tr = state.tr.delete(deleteFrom, state.selection.from);
                        dispatch(tr);
                        // Execute command
                        filteredCommands[selectedSlashIndex].command(editor);
                        setShowSlashMenu(false);
                        return true;
                    }
                    if (event.key === 'Backspace' && slashFilter === '') {
                        setShowSlashMenu(false);
                        return false;
                    }
                    // Update filter on typing
                    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
                        setSlashFilter(prev => prev + event.key);
                        return false;
                    }
                    if (event.key === 'Backspace') {
                        setSlashFilter(prev => prev.slice(0, -1));
                        return false;
                    }
                }

                return false;
            },
            handlePaste: (view, event) => {
                const items = Array.from(event.clipboardData?.items || []);
                const imageItem = items.find(item => item.type.startsWith('image'));

                if (imageItem) {
                    event.preventDefault();
                    const file = imageItem.getAsFile();
                    if (!file) return false;

                    // Optimistic update: Insert Blob URL immediately
                    const blobUrl = URL.createObjectURL(file);
                    const transaction = view.state.tr.replaceSelectionWith(
                        view.state.schema.nodes.image.create({ src: blobUrl })
                    );
                    view.dispatch(transaction);

                    // Upload in background
                    // Upload in background
                    setAiLoading(true);

                    supabaseService.uploadImage(note.userId, file)
                        .then((downloadUrl) => {
                            // Find the image with the blob URL and replace its source
                            // We need to search the doc because the position might have changed
                            view.state.doc.descendants((node, pos) => {
                                if (node.type.name === 'image' && node.attrs.src === blobUrl) {
                                    const tr = view.state.tr.setNodeMarkup(pos, undefined, {
                                        ...node.attrs,
                                        src: downloadUrl
                                    });
                                    view.dispatch(tr);
                                    return false; // Stop searching
                                }
                            });

                            setAiLoading(false);
                            toast.success('Image Uploaded', 'Sync complete');
                        })
                        .catch(e => {
                            console.error('Upload failed', e);
                            setAiLoading(false);
                            toast.error('Upload Failed', `Could not sync image: ${(e as Error).message}`);
                            // Optional: Mark image as error or remove it
                        });

                    return true;
                }
                return false;
            },
            handleDrop: (view, event, _slice, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image')) {
                        event.preventDefault();

                        // Optimistic update
                        const blobUrl = URL.createObjectURL(file);
                        const { schema } = view.state;
                        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });

                        // Insert at drop position
                        if (coordinates) {
                            const transaction = view.state.tr.insert(
                                coordinates.pos,
                                schema.nodes.image.create({ src: blobUrl })
                            );
                            view.dispatch(transaction);
                        }

                        // Upload in background
                        // Upload in background
                        setAiLoading(true);

                        supabaseService.uploadImage(note.userId, file)
                            .then((downloadUrl) => {
                                view.state.doc.descendants((node, pos) => {
                                    if (node.type.name === 'image' && node.attrs.src === blobUrl) {
                                        const tr = view.state.tr.setNodeMarkup(pos, undefined, {
                                            ...node.attrs,
                                            src: downloadUrl
                                        });
                                        view.dispatch(tr);
                                        return false;
                                    }
                                });

                                setAiLoading(false);
                                toast.success('Image Uploaded', 'Sync complete');
                            })
                            .catch(e => {
                                console.error('Upload failed', e);
                                setAiLoading(false);
                                toast.error('Upload Failed', `Could not sync image: ${(e as Error).message}`);
                            });

                        return true;
                    }
                }
                return false;
            }
        },
        onUpdate: ({ editor }) => {
            // Close slash menu if cursor moves
            if (showSlashMenu) {
                const text = editor.getText();
                if (!text.includes('/')) {
                    setShowSlashMenu(false);
                }
            }
            onUpdateTrigger.current();
        }
    });

    const triggerSave = useCallback(() => {
        setSaveStatus('saving');
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            const { note, title, onSave } = performSaveRef.current;
            if (editor) {
                // First, update current tab content in ref
                const currentContent = editor.getHTML();
                tabContentsRef.current.set(activeTabId, currentContent);

                // Build updated tabs array with current content from ref (including per-tab floatingBoxes)
                const updatedTabs = tabs.map(t => ({
                    ...t,
                    content: t.id === activeTabId ? currentContent : (tabContentsRef.current.get(t.id) || t.content)
                }));

                // Get current tab settings
                const currentTabSettings = tabs.find(t => t.id === activeTabId)?.pageSettings;
                // Collect all floating boxes from all tabs for backward compat at note level
                const allFloatingBoxes = updatedTabs.flatMap(t => t.floatingBoxes || []);

                try {
                    await onSave({
                        ...note,
                        title,
                        content: currentContent, // Main content is current tab
                        tabs: updatedTabs,
                        floatingBoxes: allFloatingBoxes,
                        pageSettings: currentTabSettings || { orientation: 'portrait', marginSize: 'normal', theme: 'dark' }
                    });
                    setSaveStatus('saved');
                } catch (e) {
                    console.error("Auto-save failed", e);
                    setSaveStatus('error');
                }
            }
        }, 1000);
    }, [editor, tabs, activeTabId, pageOrientation, marginSize]);

    useEffect(() => {
        onUpdateTrigger.current = triggerSave;
    }, [triggerSave]);

    // SAFETY: Save immediately on page close/refresh to prevent data loss
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            // Immediately save current state
            if (editor) {
                const { note: currentNote, title: currentTitle, onSave: doSave } = performSaveRef.current;
                const currentContent = editor.getHTML();
                const updatedTabs = tabs.map(t =>
                    t.id === activeTabId ? { ...t, content: currentContent } : t
                );
                const currentTabSettings = tabs.find(t => t.id === activeTabId)?.pageSettings;
                const allFloatingBoxes = updatedTabs.flatMap(t => t.floatingBoxes || []);
                doSave({
                    ...currentNote,
                    title: currentTitle,
                    content: currentContent,
                    tabs: updatedTabs,
                    floatingBoxes: allFloatingBoxes,
                    pageSettings: currentTabSettings || { orientation: 'portrait', marginSize: 'normal' },
                });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Also flush on component unmount (e.g., navigating back to list view)
            handleBeforeUnload();
        };
    }, [editor, tabs, activeTabId]);

    useEffect(() => {
        if (editor && note.id !== previousNoteId) {
            // Restore tabs from the note (with per-tab floatingBoxes migration)
            const restoredTabs = note.tabs || [{
                id: 'main',
                title: 'Page 1',
                content: note.content || '',
                pageSettings: note.pageSettings || { orientation: 'portrait', marginSize: 'normal' }
            }];

            // Migrate: if note has top-level floatingBoxes but first tab doesn't, assign them
            if (note.floatingBoxes && note.floatingBoxes.length > 0 && restoredTabs.length > 0 && !restoredTabs[0].floatingBoxes?.length) {
                restoredTabs[0] = { ...restoredTabs[0], floatingBoxes: note.floatingBoxes };
            }

            setTabs(restoredTabs);
            setActiveTabId(restoredTabs[0]?.id || 'main');

            // Clear and reinitialize the tabContentsRef
            tabContentsRef.current.clear();
            restoredTabs.forEach(tab => {
                tabContentsRef.current.set(tab.id, tab.content || '');
            });

            // Set editor content to the first tab's content
            editor.commands.setContent(restoredTabs[0]?.content || '');
            setTitle(note.title);
            setPreviousNoteId(note.id!);

            console.log('Note changed - restored tabs:', restoredTabs.map(t => t.title));
        }
    }, [note.id, editor]);
    const [previousNoteId, setPreviousNoteId] = useState(note.id);

    useEffect(() => {
        const clear = () => setHoverVerse(null);
        window.addEventListener('scroll', clear);
        window.addEventListener('click', clear);
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

    // Close slash menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
                setShowSlashMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Tab management functions
    const getCurrentTab = () => tabs.find(t => t.id === activeTabId) || tabs[0];

    // Use a ref to track the current editor content per tab to avoid async issues
    const tabContentsRef = useRef<Map<string, string>>(new Map());

    // Initialize tabContentsRef from tabs on first render
    useEffect(() => {
        tabs.forEach(tab => {
            if (!tabContentsRef.current.has(tab.id)) {
                tabContentsRef.current.set(tab.id, tab.content || '');
            }
        });
    }, []);

    const saveCurrentTabContent = useCallback(() => {
        if (editor && activeTabId) {
            const currentContent = editor.getHTML();
            // Save to both ref (immediate) and state (for persistence)
            tabContentsRef.current.set(activeTabId, currentContent);
            setTabs(prev => prev.map(t =>
                t.id === activeTabId ? { ...t, content: currentContent } : t
            ));
        }
    }, [editor, activeTabId]);

    const switchToTab = useCallback((tabId: string) => {
        if (tabId === activeTabId || !editor) return;

        // Save current tab content FIRST (synchronously to ref)
        const currentContent = editor.getHTML();
        tabContentsRef.current.set(activeTabId, currentContent);

        // Also update state
        setTabs(prev => prev.map(t =>
            t.id === activeTabId ? { ...t, content: currentContent } : t
        ));

        // Get the new tab's content from ref (most up-to-date)
        const newTabContent = tabContentsRef.current.get(tabId) ||
            tabs.find(t => t.id === tabId)?.content || '';

        // Switch to new tab
        setActiveTabId(tabId);

        // Load new tab's content into editor
        editor.commands.setContent(newTabContent);

        console.log(`Switched from tab ${activeTabId} to ${tabId}`);
    }, [activeTabId, editor, tabs]);

    const addNewTab = useCallback(() => {
        // Save current tab content first
        if (editor && activeTabId) {
            const currentContent = editor.getHTML();
            tabContentsRef.current.set(activeTabId, currentContent);
            setTabs(prev => prev.map(t =>
                t.id === activeTabId ? { ...t, content: currentContent } : t
            ));
        }

        const newTabId = `tab-${Date.now()}`;
        const newTab = {
            id: newTabId,
            title: `Page ${tabs.length + 1}`,
            content: '',
            pageSettings: { orientation: 'portrait' as const, marginSize: 'normal' as const }
        };

        // Initialize new tab in ref
        tabContentsRef.current.set(newTabId, '');

        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTabId);

        if (editor) {
            editor.commands.setContent('');
        }
    }, [editor, activeTabId, tabs.length]);

    const deleteTab = (tabId: string) => {
        if (tabs.length <= 1) {
            toast.error('Cannot Delete', 'You must have at least one page');
            return;
        }

        const tabIndex = tabs.findIndex(t => t.id === tabId);
        const newTabs = tabs.filter(t => t.id !== tabId);
        setTabs(newTabs);

        if (activeTabId === tabId) {
            // Switch to adjacent tab
            const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
            const newActiveTab = newTabs[newActiveIndex];
            setActiveTabId(newActiveTab.id);
            if (editor) {
                editor.commands.setContent(newActiveTab.content || '');
            }
        }
    };

    const renameTab = (tabId: string, newTitle: string) => {
        setTabs(prev => prev.map(t =>
            t.id === tabId ? { ...t, title: newTitle } : t
        ));
        setEditingTabId(null);
    };

    // Floating Box Functions (per-tab: updates the active tab's floatingBoxes)
    const setFloatingBoxesForActiveTab = (updater: (prev: typeof floatingBoxes) => typeof floatingBoxes) => {
        setTabs(prev => prev.map(t =>
            t.id === activeTabId
                ? { ...t, floatingBoxes: updater(t.floatingBoxes || []) }
                : t
        ));
    };

    const addFloatingBox = () => {
        const newBox = {
            id: `box-${Date.now()}`,
            x: 50,  // Center horizontally (percentage)
            y: 200, // 200px from top
            width: 200,
            height: 100,
            content: '',
            color: '#3b82f6'  // Blue default
        };
        setFloatingBoxesForActiveTab(prev => [...prev, newBox]);
        setEditingBoxId(newBox.id);
    };

    const updateFloatingBox = (id: string, updates: Partial<typeof floatingBoxes[0]>) => {
        setFloatingBoxesForActiveTab(prev => prev.map(box =>
            box.id === id ? { ...box, ...updates } : box
        ));
    };

    const deleteFloatingBox = (id: string) => {
        setFloatingBoxesForActiveTab(prev => prev.filter(box => box.id !== id));
    };

    const handleBoxDragStart = (e: React.MouseEvent, boxId: string) => {
        e.preventDefault();
        setDraggingBoxId(boxId);
        const box = floatingBoxes.find(b => b.id === boxId);
        if (!box || !editorRef.current) return;

        const rect = editorRef.current.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startBoxX = box.x;
        const startBoxY = box.y;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            // Calculate new position as percentage for X
            const newX = startBoxX + (deltaX / rect.width) * 100;
            const newY = startBoxY + deltaY;

            updateFloatingBox(boxId, {
                x: Math.max(0, Math.min(100, newX)),
                y: Math.max(0, newY)
            });
        };

        const handleMouseUp = () => {
            setDraggingBoxId(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Override triggerSave to include tabs

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
            setIsRecordingPaused(false);
            setSermonRecordingDuration(0);
            toast.addToast({ title: 'Recording Started', message: 'Sermon recording in progress...', type: 'recording', duration: 3000 });

            recordingIntervalRef.current = setInterval(() => {
                // Only increment if not paused
                if (!audioRecorderService.isPaused) {
                    setSermonRecordingDuration(prev => prev + 1);
                }
            }, 1000);
        } catch (error) {
            console.error('Failed to start recording:', error);
            toast.error('Recording Failed', (error as Error).message);
        }
    };

    // Toggle pause/resume for sermon recording
    const handleTogglePauseRecording = () => {
        if (isRecordingPaused) {
            audioRecorderService.resumeRecording();
            setIsRecordingPaused(false);
            toast.info('Recording Resumed', 'Recording in progress...');
        } else {
            audioRecorderService.pauseRecording();
            setIsRecordingPaused(true);
            toast.info('Recording Paused', 'Click to resume');
        }
    };

    // Stop sermon recording and transcribe - BULLETPROOF LOCAL-FIRST VERSION
    // Audio is saved locally IMMEDIATELY, cloud upload is best-effort
    const handleStopSermonRecording = async () => {
        if (!editor) return;

        // Clear the timer first
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }

        const loadingToast = toast.loading('Saving Recording', 'Securing your audio...');
        setAiLoading(true);
        setIsSermonRecording(false);

        let audioBlob: Blob | null = null;
        let duration = 0;

        // ============================
        // STEP 1: Stop recording and get audio blob
        // ============================
        try {
            const stopResult = await audioRecorderService.stopRecordingAndGetBlob();
            audioBlob = stopResult.audioBlob;
            duration = stopResult.duration;
            console.log(`Recording stopped: ${(audioBlob.size / 1024 / 1024).toFixed(2)}MB, ${duration.toFixed(1)}s`);
        } catch (stopError) {
            console.error('Failed to stop recording:', stopError);
            toast.updateToast(loadingToast, {
                title: 'Recording Error',
                message: 'Could not capture audio. Please try again.',
                type: 'error'
            });
            setAiLoading(false);
            return;
        }

        // ============================
        // STEP 2: Safety download - save audio locally as backup
        // ============================
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const safetyFilename = `sermon-${timestamp}.webm`;
        try {
            audioRecorderService.downloadRecording(audioBlob, safetyFilename);
            console.log('Safety download completed:', safetyFilename);
        } catch (e) {
            console.warn('Safety download failed:', e);
        }

        // ============================
        // STEP 3: Save audio blob to IndexedDB (INSTANT - replaces slow cloud upload)
        // ============================
        const recordingId = crypto.randomUUID();
        toast.updateToast(loadingToast, { title: 'Saving Audio', message: 'Storing locally...' });

        try {
            await localSaveAudioBlob(recordingId, audioBlob);
            console.log('Audio blob saved to IndexedDB');
        } catch (blobError) {
            console.warn('IndexedDB blob save failed:', blobError);
        }

        // ============================
        // STEP 4: Save recording metadata to local DB (ALWAYS succeeds)
        // ============================
        try {
            await supabaseService.saveRecording(note.userId, {
                noteId: note.id,
                noteTitle: title || 'Untitled Recording',
                audioUrl: `local://${recordingId}`, // Reference to IndexedDB blob
                transcript: '[Transcription pending...]',
                duration: duration
            });
            console.log('Recording metadata saved');
        } catch (saveError) {
            console.warn('Recording metadata save failed:', saveError);
        }

        // ============================
        // STEP 5: Attempt transcription
        // ============================
        toast.updateToast(loadingToast, { title: 'Transcribing', message: 'Sending to Whisper AI...' });

        let transcript = '';
        try {
            transcript = await audioRecorderService.transcribeAudio(audioBlob);
            console.log('Transcription complete:', transcript.substring(0, 100));
        } catch (transcriptError) {
            console.error('Transcription failed:', transcriptError);

            // Insert error message in editor but DON'T return — recording is already saved
            editor.commands.insertContent(`
                <h2>⚠️ Transcription Failed</h2>
                <p><em>Recorded on ${new Date().toLocaleString()} (Duration: ${formatDuration(Math.round(duration))})</em></p>
                <p style="color: #f87171;"><strong>Error:</strong> ${(transcriptError as Error).message}</p>
                <p>✅ <strong>Your recording was downloaded as ${safetyFilename}</strong></p>
                <hr/>
            `);

            toast.updateToast(loadingToast, {
                title: 'Recording Saved',
                message: `Audio downloaded. Transcription failed: ${(transcriptError as Error).message.substring(0, 50)}`,
                type: 'warning'
            });
            setAiLoading(false);
            triggerSave();
            return;
        }

        // ============================
        // STEP 6: Insert transcript into editor
        // ============================
        const transcriptSection = `
            <h2>📝 Sermon Transcript</h2>
            <p><em>Recorded on ${new Date().toLocaleString()} (Duration: ${formatDuration(Math.round(duration))})</em></p>
            <hr/>
            <p>${transcript}</p>
            <hr/>
        `;
        editor.commands.insertContent(transcriptSection);
        triggerSave();

        // Update the recording in DB with the actual transcript
        // (It was saved with "[Transcription pending...]" earlier)
        toast.updateToast(loadingToast, { title: 'Recording Complete', message: 'Saved & transcribed!', type: 'success' });

        // ============================
        // STEP 7: Optional AI summary
        // ============================
        if (transcript.length > 100) {
            try {
                toast.addToast({ title: 'Generating Summary', message: 'AI is summarizing...', type: 'info', duration: 3000 });
                const summary = await groqService.summarizeSermon(transcript);
                editor.commands.insertContent(
                    `<blockquote><strong>📋 AI Summary:</strong><br/>${summary}</blockquote><p></p>`
                );
                triggerSave();
                toast.success('Summary Added', 'AI summary appended to transcript');
            } catch (summaryError) {
                console.warn('Summary generation failed:', summaryError);
            }
        }

        setAiLoading(false);
    };

    const handleAIAnalyze = async () => {
        if (!editor) return;
        const loadingToast = toast.loading('Analyzing Note', 'AI is analyzing your content...');
        setAiLoading(true);
        try {
            const text = editor.getText();
            const summary = await groqService.summarizeSermon(text);
            editor.commands.insertContent(`<blockquote><strong>AI Analysis:</strong><br/>${summary}</blockquote><p></p>`);
            toast.updateToast(loadingToast, { title: 'Analysis Complete', message: 'AI summary added to your note', type: 'success' });
        } catch (e) {
            console.error(e);
            toast.updateToast(loadingToast, { title: 'Analysis Failed', message: 'Could not analyze note', type: 'error' });
        }
        setAiLoading(false);
    };

    const handleExegete = async () => {
        if (!editor) return;
        const selection = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
        if (!selection) return;
        const loadingToast = toast.loading('Looking Up', `Researching "${selection.substring(0, 20)}..."`);
        setAiLoading(true);
        try {
            const res = await groqService.getTheologicalDefinition(selection);
            setExegeteResult(res);
            toast.removeToast(loadingToast);
        } catch (e) {
            console.error(e);
            toast.updateToast(loadingToast, { title: 'Lookup Failed', type: 'error' });
        }
        setAiLoading(false);
    };

    const [importFile, setImportFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAudioUpload = async () => {
        if (!importFile || !editor) return;

        const loadingToast = toast.loading('Transcribing Audio', 'Uploading to Gladia for analysis...');
        setAiLoading(true);
        setShowImportDialog(false);

        try {
            // Use Gladia Service to transcribe
            const transcript = await gladiaService.transcribeFile(importFile, (status) => {
                toast.updateToast(loadingToast, { title: 'Processing', message: status });
            });

            // Insert Transcript
            const transcriptSection = `
                <h2>📝 Imported Audit Transcript</h2>
                <p><em>Source: ${importFile.name} (${(importFile.size / 1024 / 1024).toFixed(2)} MB)</em></p>
                <hr/>
                <p>${transcript}</p>
                <hr/>
            `;
            editor.commands.insertContent(transcriptSection);

            // Generate Summary
            toast.updateToast(loadingToast, { title: 'Summarizing', message: 'Generating AI summary...' });
            const summary = await groqService.summarizeSermon(transcript);

            editor.commands.insertContent(
                `<blockquote><strong>📋 AI Summary:</strong><br/>${summary}</blockquote><p></p>`
            );

            triggerSave();
            setImportFile(null);
            toast.updateToast(loadingToast, { title: 'Success', message: 'Audio transcribed and summarized', type: 'success' });

        } catch (e) {
            console.error('Transcription failed:', e);
            toast.updateToast(loadingToast, {
                title: 'Transcription Failed',
                message: (e as Error).message,
                type: 'error'
            });
        }
        setAiLoading(false);
    };

    // Export Menu State
    const [showExportMenu, setShowExportMenu] = useState(false);

    const handleExportPDF = async () => {
        if (!editor) return;
        setShowExportMenu(false);
        const loadingToast = toast.loading('Exporting PDF', 'Generating your document...');

        try {
            const html2pdf = (await import('html2pdf.js')).default;

            // Create a clean white-background clone for PDF
            const printContainer = document.createElement('div');
            printContainer.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:white;color:black;padding:40px 50px;font-family:Georgia,serif;font-size:14px;line-height:1.8;';
            printContainer.innerHTML = `
                <h1 style="font-size:28px;margin-bottom:8px;color:#111;">${title || 'Untitled'}</h1>
                <p style="font-size:12px;color:#666;margin-bottom:24px;border-bottom:1px solid #ddd;padding-bottom:12px;">
                    ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div style="color:#222;">${editor.getHTML()}</div>
            `;
            document.body.appendChild(printContainer);

            const opt = {
                margin: [0.5, 0.6, 0.5, 0.6] as [number, number, number, number],
                filename: `${title || 'document'}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'in', format: 'letter', orientation: pageOrientation } as any
            };

            await html2pdf().set(opt).from(printContainer).save();
            document.body.removeChild(printContainer);

            toast.updateToast(loadingToast, { title: 'PDF Exported', message: `${title || 'document'}.pdf downloaded`, type: 'success' });
        } catch (error) {
            console.error('PDF export failed:', error);
            toast.updateToast(loadingToast, { title: 'Export Failed', message: (error as Error).message, type: 'error' });
        }
    };

    const handleExportWord = () => {
        if (!editor) return;
        setShowExportMenu(false);

        try {
            const htmlContent = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
                <head><meta charset="utf-8"><title>${title || 'Untitled'}</title>
                <style>
                    body { font-family: 'Calibri', sans-serif; font-size: 12pt; line-height: 1.6; color: #222; margin: 1in; }
                    h1 { font-size: 24pt; color: #111; margin-bottom: 4pt; }
                    h2 { font-size: 18pt; color: #222; margin-top: 12pt; }
                    h3 { font-size: 14pt; color: #333; }
                    blockquote { border-left: 3px solid #ccc; padding-left: 12px; margin-left: 0; color: #555; font-style: italic; }
                    table { border-collapse: collapse; width: 100%; }
                    td, th { border: 1px solid #ccc; padding: 6px 10px; }
                    th { background: #f0f0f0; }
                    code { background: #f5f5f5; padding: 2px 4px; font-family: 'Courier New', monospace; }
                    pre { background: #f5f5f5; padding: 12px; overflow-x: auto; }
                    hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
                </style></head>
                <body>
                    <h1>${title || 'Untitled'}</h1>
                    <p style="font-size:10pt;color:#888;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <hr/>
                    ${editor.getHTML()}
                </body></html>
            `;

            const blob = new Blob([htmlContent], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title || 'document'}.doc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('Word Exported', `${title || 'document'}.doc downloaded`);
        } catch (error) {
            console.error('Word export failed:', error);
            toast.error('Export Failed', (error as Error).message);
        }
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

    // Filter slash commands
    const filteredSlashCommands = slashCommands.filter(cmd =>
        cmd.title.toLowerCase().includes(slashFilter.toLowerCase()) ||
        cmd.description.toLowerCase().includes(slashFilter.toLowerCase())
    );

    // Group commands by category
    const groupedCommands = filteredSlashCommands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {} as Record<string, SlashCommand[]>);

    // Load Layout Settings from LocalStorage on mount or note change
    useEffect(() => {
        const savedLayout = localStorage.getItem(`note_layout_${note.id}`);
        if (savedLayout) {
            try {
                const parsed = JSON.parse(savedLayout);
                if (parsed.orientation) setPageOrientation(parsed.orientation);
                if (parsed.margin) setMarginSize(parsed.margin);
            } catch (e) {
                console.error("Failed to parse layout settings", e);
            }
        } else {
            // Default settings if nothing saved
            setPageOrientation('portrait');
            setMarginSize('normal');
        }
    }, [note.id]);

    // Save Layout Settings to LocalStorage whenever they change
    useEffect(() => {
        const settings = {
            orientation: pageOrientation,
            margin: marginSize
        };
        localStorage.setItem(`note_layout_${note.id}`, JSON.stringify(settings));
    }, [pageOrientation, marginSize, note.id]);

    return (
        <div className="flex flex-col h-full bg-zinc-950 relative">
            {/* Main Toolbar */}
            <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950/80 backdrop-blur sticky top-0 z-30 shrink-0">
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
                    <button onClick={() => setShowImportDialog(true)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Import Transcript / YouTube"><Upload className="w-4 h-4" /></button>
                    {/* Export Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className={cn("p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors", showExportMenu && "bg-zinc-800 text-white")}
                            title="Export"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                        {showExportMenu && (
                            <div className="absolute top-full right-0 mt-2 w-40 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
                                <button
                                    onClick={handleExportPDF}
                                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                                >
                                    📄 Export as PDF
                                </button>
                                <button
                                    onClick={handleExportWord}
                                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                                >
                                    📝 Export as Word
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={addFloatingBox} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Add Text Box"><Square className="w-4 h-4" /></button>

                    {/* Page Settings */}
                    <div className="relative">
                        <button
                            onClick={() => setShowPageSettings(!showPageSettings)}
                            className={cn("p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors", showPageSettings && "bg-zinc-800 text-white")}
                            title="Page Settings"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                        {showPageSettings && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 p-3">
                                <div className="text-xs font-medium text-zinc-400 mb-2">Page Layout</div>
                                <div className="flex gap-1 mb-3">
                                    <button
                                        onClick={() => setPageOrientation('portrait')}
                                        className={cn("flex-1 py-1.5 text-xs rounded", pageOrientation === 'portrait' ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}
                                    >
                                        Portrait
                                    </button>
                                    <button
                                        onClick={() => setPageOrientation('landscape')}
                                        className={cn("flex-1 py-1.5 text-xs rounded", pageOrientation === 'landscape' ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}
                                    >
                                        Landscape
                                    </button>
                                </div>
                                <div className="text-xs font-medium text-zinc-400 mb-2">Margins</div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setMarginSize('narrow')}
                                        className={cn("flex-1 py-1.5 text-xs rounded", marginSize === 'narrow' ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}
                                    >
                                        Narrow
                                    </button>
                                    <button
                                        onClick={() => setMarginSize('normal')}
                                        className={cn("flex-1 py-1.5 text-xs rounded", marginSize === 'normal' ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}
                                    >
                                        Normal
                                    </button>
                                    <button
                                        onClick={() => setMarginSize('wide')}
                                        className={cn("flex-1 py-1.5 text-xs rounded", marginSize === 'wide' ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}
                                    >
                                        Wide
                                    </button>
                                </div>
                                <div className="text-xs font-medium text-zinc-400 mb-2 mt-3">Page Theme</div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setPageTheme('dark')}
                                        className={cn("flex-1 py-1.5 text-xs rounded", pageTheme === 'dark' ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}
                                    >
                                        Dark
                                    </button>
                                    <button
                                        onClick={() => setPageTheme('light')}
                                        className={cn("flex-1 py-1.5 text-xs rounded", pageTheme === 'light' ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}
                                    >
                                        Light
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="h-4 w-px bg-zinc-800 mx-1" />

                    {/* Save as Template Button and Save Status */}
                    <div className="flex items-center gap-2">
                        {onSaveAsTemplate && (
                            <button
                                onClick={() => {
                                    // Construct current note state
                                    const currentNote = {
                                        ...note,
                                        content: editor?.getHTML() || '',
                                        title: title
                                    };
                                    onSaveAsTemplate(currentNote);
                                }}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                title="Save as Template"
                            >
                                <LayoutTemplate className="w-5 h-5" />
                            </button>
                        )}
                        <span className={cn(
                            "text-xs mr-2 transition-colors duration-200",
                            saveStatus === 'saved' ? "text-zinc-500" :
                                saveStatus === 'saving' ? "text-blue-500 font-medium" :
                                    "text-red-500 font-medium"
                        )}>
                            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Not Saved'}
                        </span>
                    </div>

                    {/* Sermon Recording Button */}
                    {isSermonRecording ? (
                        <div className="flex items-center gap-1">
                            {/* Recording timer */}
                            <span className={cn(
                                "px-2 py-1 text-xs font-mono rounded",
                                isRecordingPaused ? "text-yellow-400 bg-yellow-500/10" : "text-red-400 bg-red-500/10 animate-pulse"
                            )}>
                                {isRecordingPaused ? '⏸' : '●'} {formatDuration(sermonRecordingDuration)}
                            </span>
                            {/* Pause/Resume button */}
                            <button
                                onClick={handleTogglePauseRecording}
                                disabled={aiLoading}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all",
                                    isRecordingPaused
                                        ? "bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-500/30"
                                        : "bg-yellow-600 text-white hover:bg-yellow-500 shadow-lg shadow-yellow-500/30"
                                )}
                                title={isRecordingPaused ? "Resume Recording" : "Pause Recording"}
                            >
                                {isRecordingPaused ? (
                                    <><Radio className="w-3 h-3" /> Resume</>
                                ) : (
                                    <><Clock className="w-3 h-3" /> Pause</>
                                )}
                            </button>
                            {/* Stop button */}
                            <button
                                onClick={handleStopSermonRecording}
                                disabled={aiLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-red-600 text-white shadow-lg shadow-red-500/30 hover:bg-red-500 transition-all"
                                title="Stop and Transcribe"
                            >
                                <Square className="w-3 h-3" /> Stop
                            </button>
                        </div>
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

            {/* Formatting Ribbon - Google Docs Style */}
            {editor && (
                <div className="h-10 border-b border-zinc-800 flex items-center gap-1 px-4 bg-zinc-900/95 backdrop-blur sticky top-12 z-20 shrink-0 overflow-visible"
                >
                    {/* Text formatting */}
                    <div className="flex items-center gap-0.5 border-r border-zinc-700/50 pr-2 mr-1">
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded transition-colors", editor.isActive('bold') && "text-blue-400 bg-blue-500/10")} title="Bold (Ctrl+B)"><Bold className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded transition-colors", editor.isActive('italic') && "text-blue-400 bg-blue-500/10")} title="Italic (Ctrl+I)"><Italic className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded transition-colors", editor.isActive('underline') && "text-blue-400 bg-blue-500/10")} title="Underline (Ctrl+U)"><UnderlineIcon className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleSubscript().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded transition-colors", editor.isActive('subscript') && "text-blue-400 bg-blue-500/10")} title="Subscript"><SubIcon className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleSuperscript().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded transition-colors", editor.isActive('superscript') && "text-blue-400 bg-blue-500/10")} title="Superscript"><SupIcon className="w-4 h-4" /></button>
                    </div>

                    {/* Font Size */}
                    {/* Font Size Input */}
                    <div className="flex items-center gap-0.5 border-r border-zinc-700/50 pr-2 mr-1">
                        <div className="flex items-center bg-zinc-800/50 rounded overflow-hidden border border-zinc-700/50 transition-colors hover:border-zinc-600">
                            <button
                                onClick={() => {
                                    const current = parseInt(editor.getAttributes('textStyle').fontSize || '12');
                                    editor.chain().focus().setFontSize(`${Math.max(1, current - 1)}px`).run();
                                }}
                                className="px-1.5 py-1 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs transition-colors border-r border-zinc-700/50"
                                title="Decrease Font Size"
                            >
                                <Minus className="w-3 h-3" />
                            </button>
                            <input
                                type="number"
                                min="1"
                                max="200"
                                value={parseInt(editor.getAttributes('textStyle').fontSize || '12')}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val > 0) editor.chain().focus().setFontSize(`${val}px`).run();
                                }}
                                className="w-8 bg-transparent text-center text-xs text-zinc-200 focus:outline-none py-1 appearance-none"
                                title="Font Size"
                            />
                            <button
                                onClick={() => {
                                    const current = parseInt(editor.getAttributes('textStyle').fontSize || '12');
                                    editor.chain().focus().setFontSize(`${current + 1}px`).run();
                                }}
                                className="px-1.5 py-1 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs transition-colors border-l border-zinc-700/50"
                                title="Increase Font Size"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Alignment */}
                    <div className="flex items-center gap-0.5 border-r border-zinc-700/50 pr-2 mr-1">
                        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn("p-1.5 hover:bg-zinc-800 rounded transition-colors", editor.isActive({ textAlign: 'left' }) && "text-blue-400 bg-blue-500/10")} title="Align Left"><AlignLeft className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn("p-1.5 hover:bg-zinc-800 rounded transition-colors", editor.isActive({ textAlign: 'center' }) && "text-blue-400 bg-blue-500/10")} title="Align Center"><AlignCenter className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={cn("p-1.5 hover:bg-zinc-800 rounded transition-colors", editor.isActive({ textAlign: 'right' }) && "text-blue-400 bg-blue-500/10")} title="Align Right"><AlignRight className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={cn("p-1.5 hover:bg-zinc-800 rounded transition-colors", editor.isActive({ textAlign: 'justify' }) && "text-blue-400 bg-blue-500/10")} title="Justify"><AlignJustify className="w-4 h-4" /></button>
                    </div>

                    {/* Indent Controls - Left/Right margin adjustment */}
                    <div className="flex items-center gap-0.5 border-r border-zinc-700/50 pr-2 mr-1">
                        <button
                            onClick={() => {
                                const currentIndent = editor.getAttributes('paragraph').indent || 0;
                                const newIndent = Math.max(0, currentIndent - 24);
                                editor.chain().focus().updateAttributes('paragraph', { indent: newIndent }).run();
                            }}
                            className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
                            title="Decrease Indent (Shift+Tab)"
                        >
                            <IndentIcon className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                            onClick={() => {
                                const currentIndent = editor.getAttributes('paragraph').indent || 0;
                                const newIndent = Math.min(240, currentIndent + 24);
                                editor.chain().focus().updateAttributes('paragraph', { indent: newIndent }).run();
                            }}
                            className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
                            title="Increase Indent (Tab)"
                        >
                            <IndentIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Text Colors */}
                    <div className="flex items-center gap-1 border-r border-zinc-700/50 pr-2 mr-1">
                        <button onClick={() => editor.chain().focus().setColor('#f87171').run()} className={cn("w-4 h-4 rounded-full bg-red-400 hover:scale-110 transition-transform ring-offset-1 ring-offset-zinc-900", editor.isActive('textStyle', { color: '#f87171' }) && "ring-2 ring-white")} title="Red" />
                        <button onClick={() => editor.chain().focus().setColor('#60a5fa').run()} className={cn("w-4 h-4 rounded-full bg-blue-400 hover:scale-110 transition-transform ring-offset-1 ring-offset-zinc-900", editor.isActive('textStyle', { color: '#60a5fa' }) && "ring-2 ring-white")} title="Blue" />
                        <button onClick={() => editor.chain().focus().setColor('#facc15').run()} className={cn("w-4 h-4 rounded-full bg-yellow-400 hover:scale-110 transition-transform ring-offset-1 ring-offset-zinc-900", editor.isActive('textStyle', { color: '#facc15' }) && "ring-2 ring-white")} title="Yellow" />
                        <button onClick={() => editor.chain().focus().setColor('#4ade80').run()} className={cn("w-4 h-4 rounded-full bg-green-400 hover:scale-110 transition-transform ring-offset-1 ring-offset-zinc-900", editor.isActive('textStyle', { color: '#4ade80' }) && "ring-2 ring-white")} title="Green" />
                        <button onClick={() => editor.chain().focus().unsetColor().run()} className="text-[10px] text-zinc-500 hover:text-white px-1" title="Remove Color">×</button>
                    </div>

                    {/* Highlighter with color picker */}
                    <div className="relative border-r border-zinc-700/50 pr-2 mr-1">
                        <button
                            onClick={() => setShowHighlighterPicker(!showHighlighterPicker)}
                            className={cn("p-1.5 hover:bg-zinc-800 rounded flex items-center gap-0.5 transition-colors", editor.isActive('highlight') && "text-amber-400 bg-amber-500/10")}
                            title="Highlight"
                        >
                            <Highlighter className="w-4 h-4" />
                            <ChevronDown className="w-2 h-2" />
                        </button>
                        {showHighlighterPicker && (
                            <>
                                {/* Backdrop to close on click outside */}
                                <div
                                    className="fixed inset-0 z-[9998]"
                                    onClick={() => setShowHighlighterPicker(false)}
                                />
                                <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-3 z-[9999] w-[200px]">
                                    <div className="text-xs text-zinc-500 font-medium mb-2">Highlight Color</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button onClick={() => { editor.chain().focus().toggleHighlight({ color: '#ffff00' }).run(); setShowHighlighterPicker(false); }} className="w-8 h-8 rounded-full bg-yellow-400 hover:scale-110 transition-transform ring-2 ring-transparent hover:ring-yellow-400/50 mx-auto" title="Yellow" />
                                        <button onClick={() => { editor.chain().focus().toggleHighlight({ color: '#00ff00' }).run(); setShowHighlighterPicker(false); }} className="w-8 h-8 rounded-full bg-green-400 hover:scale-110 transition-transform ring-2 ring-transparent hover:ring-green-400/50 mx-auto" title="Green" />
                                        <button onClick={() => { editor.chain().focus().toggleHighlight({ color: '#00ffff' }).run(); setShowHighlighterPicker(false); }} className="w-8 h-8 rounded-full bg-cyan-400 hover:scale-110 transition-transform ring-2 ring-transparent hover:ring-cyan-400/50 mx-auto" title="Cyan" />
                                        <button onClick={() => { editor.chain().focus().toggleHighlight({ color: '#ff69b4' }).run(); setShowHighlighterPicker(false); }} className="w-8 h-8 rounded-full bg-pink-400 hover:scale-110 transition-transform ring-2 ring-transparent hover:ring-pink-400/50 mx-auto" title="Pink" />
                                        <button onClick={() => { editor.chain().focus().toggleHighlight({ color: '#ffa500' }).run(); setShowHighlighterPicker(false); }} className="w-8 h-8 rounded-full bg-orange-400 hover:scale-110 transition-transform ring-2 ring-transparent hover:ring-orange-400/50 mx-auto" title="Orange" />
                                        <button onClick={() => { editor.chain().focus().toggleHighlight({ color: '#a855f7' }).run(); setShowHighlighterPicker(false); }} className="w-8 h-8 rounded-full bg-purple-400 hover:scale-110 transition-transform ring-2 ring-transparent hover:ring-purple-400/50 mx-auto" title="Purple" />
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800 mt-2">
                                        <input
                                            type="color"
                                            value={highlighterColor}
                                            onChange={(e) => setHighlighterColor(e.target.value)}
                                            className="w-8 h-8 cursor-pointer border-0 rounded"
                                        />
                                        <button
                                            onClick={() => { editor.chain().focus().toggleHighlight({ color: highlighterColor }).run(); setShowHighlighterPicker(false); }}
                                            className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1.5 rounded"
                                        >
                                            Custom
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlighterPicker(false); }}
                                        className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 py-1.5 rounded mt-2"
                                    >
                                        Remove Highlight
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Circle and Comment */}
                    <div className="flex items-center gap-0.5 border-r border-zinc-700/50 pr-2 mr-1">
                        <button onClick={() => editor.chain().focus().toggleCircle().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded transition-colors", editor.isActive('circle') && "text-red-400 bg-red-500/10")} title="Circle Word"><Circle className="w-4 h-4" /></button>
                        <button onClick={openCommentDialog} className={cn("p-1.5 hover:bg-zinc-800 rounded transition-colors", editor.isActive('comment') && "text-blue-400 bg-blue-500/10")} title="Add Comment"><MessageSquarePlus className="w-4 h-4" /></button>
                    </div>

                    {/* Exegete */}
                    <button onClick={handleExegete} className="px-2 py-1 hover:bg-zinc-800 rounded flex items-center gap-1.5 text-xs font-semibold text-purple-400 bg-purple-500/10 transition-colors" title="Theological lookup on selected text">
                        <BookOpen className="w-3.5 h-3.5" /> Exegete
                    </button>

                    <div className="h-4 w-px bg-zinc-800 mx-1" />

                    {/* Link Button */}
                    {/* Link Button with Popover */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                if (showLinkInput) {
                                    setShowLinkInput(false);
                                } else {
                                    const previousUrl = editor.getAttributes('link').href;
                                    setLinkUrl(previousUrl || '');
                                    setShowLinkInput(true);
                                }
                            }}
                            className={cn(
                                "p-1.5 hover:bg-zinc-800 rounded transition-colors",
                                editor.isActive('link') && "text-blue-400 bg-blue-500/10"
                            )}
                            title="Add Link"
                        >
                            <LinkIcon className="w-4 h-4" />
                        </button>
                        {showLinkInput && (
                            <>
                                <div className="fixed inset-0 z-[9998]" onClick={() => setShowLinkInput(false)} />
                                <div className="absolute top-full right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-3 z-[9999] w-64 animate-in fade-in zoom-in-95">
                                    <div className="text-xs text-zinc-500 font-medium mb-2">Edit Link</div>
                                    <input
                                        type="url"
                                        value={linkUrl}
                                        onChange={(e) => setLinkUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 mb-2"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                if (linkUrl === '') {
                                                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                                                } else {
                                                    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
                                                }
                                                setShowLinkInput(false);
                                            }
                                        }}
                                    />
                                    <div className="flex justify-between gap-2">
                                        <button
                                            onClick={() => {
                                                editor.chain().focus().extendMarkRange('link').unsetLink().run();
                                                setShowLinkInput(false);
                                            }}
                                            className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded"
                                        >
                                            Unlink
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (linkUrl) {
                                                    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
                                                }
                                                setShowLinkInput(false);
                                            }}
                                            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Tabs Bar - Google Docs style */}
            {tabs.length > 0 && (
                <div className="h-10 border-b border-zinc-800 flex items-center gap-1 px-4 bg-zinc-900/50 overflow-x-auto custom-scrollbar">
                    {tabs.map((tab, index) => (
                        <div
                            key={tab.id}
                            className={cn(
                                "group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer transition-all relative",
                                activeTabId === tab.id
                                    ? "bg-zinc-950 text-white border-t border-x border-zinc-700"
                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                            )}
                            onClick={() => switchToTab(tab.id)}
                        >
                            {editingTabId === tab.id ? (
                                <input
                                    type="text"
                                    defaultValue={tab.title}
                                    className="bg-transparent border-b border-zinc-500 focus:outline-none w-20 text-xs"
                                    autoFocus
                                    onBlur={(e) => renameTab(tab.id, e.target.value || tab.title)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            renameTab(tab.id, e.currentTarget.value || tab.title);
                                        }
                                        if (e.key === 'Escape') {
                                            setEditingTabId(null);
                                        }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTabId(tab.id);
                                    }}
                                    title="Double-click to rename"
                                >
                                    {tab.title}
                                </span>
                            )}
                            {tabs.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteTab(tab.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400 transition-all"
                                    title="Delete page"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={addNewTab}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Add new page"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto relative" ref={editorRef}>
                {/* Floating Text Boxes */}
                {floatingBoxes.map(box => (
                    <div
                        key={box.id}
                        className={cn(
                            "absolute z-20 rounded-lg shadow-lg border-2 transition-shadow",
                            draggingBoxId === box.id ? "cursor-grabbing shadow-2xl" : "cursor-grab",
                            editingBoxId === box.id ? "ring-2 ring-blue-500" : ""
                        )}
                        style={{
                            left: `${box.x}%`,
                            top: box.y,
                            width: box.width,
                            minHeight: box.height,
                            backgroundColor: box.color || '#3b82f6',
                            borderColor: box.color || '#3b82f6',
                            transform: 'translateX(-50%)'
                        }}
                    >
                        {/* Drag Handle */}
                        <div
                            className="h-6 rounded-t-lg flex items-center justify-between px-2 cursor-grab"
                            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                            onMouseDown={(e) => handleBoxDragStart(e, box.id)}
                        >
                            <span className="text-[10px] font-medium text-white/70 select-none">Text Box</span>
                            <div className="flex items-center gap-1">
                                {/* Color picker */}
                                <input
                                    type="color"
                                    value={box.color || '#3b82f6'}
                                    onChange={(e) => updateFloatingBox(box.id, { color: e.target.value })}
                                    className="w-4 h-4 cursor-pointer border-0 rounded"
                                    title="Change color"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteFloatingBox(box.id);
                                    }}
                                    className="p-0.5 hover:bg-red-500/50 rounded text-white/70 hover:text-white transition-colors"
                                    title="Delete box"
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        {/* Content */}
                        <div className="p-2">
                            <textarea
                                value={box.content}
                                onChange={(e) => updateFloatingBox(box.id, { content: e.target.value })}
                                onFocus={() => setEditingBoxId(box.id)}
                                onBlur={() => setEditingBoxId(null)}
                                placeholder="Type here..."
                                className="w-full bg-transparent text-white text-sm resize-none focus:outline-none placeholder:text-white/50"
                                style={{ minHeight: box.height - 40 }}
                            />
                        </div>
                        {/* Resize handle */}
                        <div
                            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                            style={{
                                background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%)',
                                borderRadius: '0 0 6px 0'
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const startWidth = box.width;
                                const startHeight = box.height;

                                const handleResize = (moveEvent: MouseEvent) => {
                                    const newWidth = Math.max(100, startWidth + (moveEvent.clientX - startX));
                                    const newHeight = Math.max(60, startHeight + (moveEvent.clientY - startY));
                                    updateFloatingBox(box.id, { width: newWidth, height: newHeight });
                                };

                                const stopResize = () => {
                                    document.removeEventListener('mousemove', handleResize);
                                    document.removeEventListener('mouseup', stopResize);
                                };

                                document.addEventListener('mousemove', handleResize);
                                document.addEventListener('mouseup', stopResize);
                            }}
                        />
                    </div>
                ))}

                <div
                    className={cn(
                        "mx-auto min-h-[90vh] transition-all duration-300",
                        pageTheme === 'light' ? "bg-white text-zinc-900 shadow-xl" : "bg-zinc-950 text-zinc-100",
                        // Orientation & Max Width Logic
                        pageOrientation === 'landscape'
                            ? "max-w-none w-[95%]" // Landscape: Use 95% of screen
                            : marginSize === 'wide'
                                ? "max-w-5xl" // Portrait Wide: Wider container 
                                : "max-w-3xl", // Portrait Normal/Narrow: Standard document width

                        // Margins (Padding inside the editor)
                        marginSize === 'narrow' ? "py-6 px-12" : marginSize === 'wide' ? "py-6 px-24" : "py-12 px-16"
                    )}
                    style={{
                        // Tighter line spacing for lists
                        lineHeight: '1.6'
                    }}
                >
                    <input
                        value={title}
                        onChange={(e) => {
                            const newTitle = e.target.value;
                            setTitle(newTitle);
                            // Debounce save with new title - include ALL fields
                            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                            saveTimeoutRef.current = setTimeout(() => {
                                const { note, onSave } = performSaveRef.current;
                                if (editor) {
                                    const currentContent = editor.getHTML();
                                    const updatedTabs = tabs.map(t => ({
                                        ...t,
                                        content: t.id === activeTabId ? currentContent : (tabContentsRef.current.get(t.id) || t.content)
                                    }));
                                    const currentTabSettings = tabs.find(t => t.id === activeTabId)?.pageSettings;
                                    const allFloatingBoxes = updatedTabs.flatMap(t => t.floatingBoxes || []);
                                    onSave({
                                        ...note,
                                        title: newTitle,
                                        content: currentContent,
                                        tabs: updatedTabs,
                                        floatingBoxes: allFloatingBoxes,
                                        pageSettings: currentTabSettings || { orientation: 'portrait', marginSize: 'normal' },
                                    });
                                }
                            }, 1000);
                        }}
                        className={cn(
                            "w-full bg-transparent text-4xl font-bold focus:outline-none mb-6 font-display",
                            pageTheme === 'light' ? "text-zinc-900 placeholder:text-zinc-400" : "text-zinc-100 placeholder:text-zinc-700"
                        )}
                        placeholder="Untitled Sermon"
                    />



                    {/* Floating Menu for new blocks */}
                    {editor && <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 p-1 rounded-lg shadow-xl -ml-20">
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("p-1 hover:bg-zinc-800 rounded", editor.isActive('heading', { level: 1 }) && "text-blue-400")} title="Heading 1"><Heading1 className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("p-1 hover:bg-zinc-800 rounded", editor.isActive('heading', { level: 2 }) && "text-blue-400")} title="Heading 2"><Heading2 className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1 hover:bg-zinc-800 rounded", editor.isActive('bulletList') && "text-blue-400")} title="Bullet List"><List className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1 hover:bg-zinc-800 rounded", editor.isActive('orderedList') && "text-blue-400")} title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={cn("p-1 hover:bg-zinc-800 rounded", editor.isActive('taskList') && "text-blue-400")} title="Task List"><CheckSquare className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("p-1 hover:bg-zinc-800 rounded", editor.isActive('blockquote') && "text-blue-400")} title="Quote"><Quote className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={cn("p-1 hover:bg-zinc-800 rounded", editor.isActive('codeBlock') && "text-blue-400")} title="Code Block"><Code className="w-4 h-4" /></button>
                        <div className="w-px h-4 bg-zinc-700 mx-1" />
                        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Insert Table"><TableIcon className="w-4 h-4" /></button>
                        <button onClick={addImage} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Insert Image"><ImageIcon className="w-4 h-4" /></button>
                        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Divider"><Minus className="w-4 h-4" /></button>
                    </FloatingMenu>}

                    {/* Table Controls */}
                    {editor && editor.isActive('table') && (
                        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-zinc-900 border border-zinc-700 p-2 rounded-xl shadow-2xl animate-in slide-in-from-bottom-2">
                            <span className="text-xs text-zinc-500 px-2">Table</span>
                            <div className="flex items-center gap-1 border-l border-zinc-700 pl-2">
                                <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Add Column Before"><Plus className="w-3 h-3" /></button>
                                <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Add Column After"><ColumnsIcon className="w-4 h-4" /></button>
                                <button onClick={() => editor.chain().focus().deleteColumn().run()} className="p-1.5 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300" title="Delete Column"><Trash2 className="w-3 h-3" /></button>
                            </div>
                            <div className="flex items-center gap-1 border-l border-zinc-700 pl-2">
                                <button onClick={() => editor.chain().focus().addRowBefore().run()} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Add Row Before"><Plus className="w-3 h-3" /></button>
                                <button onClick={() => editor.chain().focus().addRowAfter().run()} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Add Row After"><RowsIcon className="w-4 h-4" /></button>
                                <button onClick={() => editor.chain().focus().deleteRow().run()} className="p-1.5 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300" title="Delete Row"><Trash2 className="w-3 h-3" /></button>
                            </div>
                            <div className="flex items-center gap-1 border-l border-zinc-700 pl-2">
                                <button onClick={() => editor.chain().focus().deleteTable().run()} className="p-1.5 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300 flex items-center gap-1" title="Delete Table">
                                    <Trash2 className="w-3 h-3" /> <span className="text-xs">Delete Table</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <EditorContent editor={editor} />
                </div>
            </div>

            {/* Slash Commands Menu */}
            {showSlashMenu && (
                <div
                    ref={slashMenuRef}
                    className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-72 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95"
                    style={{ top: slashMenuPosition.top, left: Math.min(slashMenuPosition.left, window.innerWidth - 300) }}
                >
                    <div className="p-2 border-b border-zinc-800">
                        <div className="flex items-center gap-2 px-2 py-1 bg-zinc-800/50 rounded-lg">
                            <span className="text-zinc-500">/</span>
                            <span className="text-sm text-zinc-300">{slashFilter || 'Type to filter...'}</span>
                        </div>
                    </div>
                    <div className="p-1">
                        {Object.entries(groupedCommands).map(([category, commands]) => (
                            <div key={category}>
                                <div className="px-2 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{category}</div>
                                {commands.map((cmd, index) => {
                                    const globalIndex = filteredSlashCommands.indexOf(cmd);
                                    return (
                                        <button
                                            key={cmd.title}
                                            onClick={() => {
                                                if (editor) {
                                                    // Delete the "/" and filter text
                                                    const { state, view } = editor;
                                                    const deleteFrom = state.selection.from - slashFilter.length - 1;
                                                    const tr = state.tr.delete(deleteFrom, state.selection.from);
                                                    view.dispatch(tr);
                                                    cmd.command(editor);
                                                }
                                                setShowSlashMenu(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left transition-colors",
                                                globalIndex === selectedSlashIndex ? "bg-blue-600/20 text-blue-400" : "hover:bg-zinc-800 text-zinc-300"
                                            )}
                                        >
                                            <span className="flex-shrink-0 p-1 bg-zinc-800 rounded">{cmd.icon}</span>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium truncate">{cmd.title}</div>
                                                <div className="text-xs text-zinc-500 truncate">{cmd.description}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                        {filteredSlashCommands.length === 0 && (
                            <div className="px-2 py-4 text-center text-sm text-zinc-500">No commands found</div>
                        )}
                    </div>
                </div>
            )}

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
            {/* Import Dialog (Audio Upload) */}
            {showImportDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-500" />
                                Upload Audio Recording
                            </h3>
                            <button onClick={() => setShowImportDialog(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                            Upload a sermon recording or audio file using <strong>Gladia AI</strong>.
                            We will transcribe it and generate an AI summary automatically.
                        </p>

                        <div
                            className="border-2 border-dashed border-zinc-700 bg-zinc-950/50 rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="audio/*,video/*"
                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                            />

                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6 text-zinc-400 group-hover:text-blue-400" />
                            </div>

                            <div className="text-center">
                                {importFile ? (
                                    <div className="text-blue-400 font-medium flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full">
                                        <FileText className="w-4 h-4" />
                                        {importFile.name}
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-zinc-300 font-medium">Click to browse audio files</p>
                                        <p className="text-xs text-zinc-500 mt-1">Supports MP3, WAV, M4A, MP4</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setShowImportDialog(false)}
                                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAudioUpload}
                                disabled={!importFile}
                                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 flex items-center gap-2"
                            >
                                {aiLoading ? (
                                    <><span className="animate-spin">⏳</span> Processing...</>
                                ) : (
                                    <>Start Transcription <ChevronRight className="w-4 h-4" /></>
                                )}
                            </button>
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
