'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
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
    FileText, Upload, Radio, Square, Clock,
    Table as TableIcon, CheckSquare, Code, Minus, Type,
    Info, AlertTriangle, CheckCircle, XCircle,
    RowsIcon, ColumnsIcon, Trash2, Plus, Indent as IndentIcon,
    Subscript as SubIcon, Superscript as SupIcon, Pilcrow
} from 'lucide-react';
import { cn } from '@/lib/utils';
import groqService from '@/services/groqService';
import bibleService from '@/services/bibleService';
import audioRecorderService from '@/services/audioRecorderService';
import { Note } from '@/services/firestoreService';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from './Toast';

const lowlight = createLowlight(common);

interface NoteEditorProps {
    note: Note;
    onSave: (note: Note) => void;
    onExport?: (format: 'pdf' | 'md', note: Note) => void;
    onDelete?: () => void;
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
];

export function NoteEditor({ note, onSave, onExport, onDelete, pendingInsert, onInsertComplete }: NoteEditorProps) {
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
    const [sermonRecordingDuration, setSermonRecordingDuration] = useState(0);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Transcript / Import Dialog
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importText, setImportText] = useState('');

    // Toast notifications
    const toast = useToast();

    // Comment Dialog
    const [showCommentDialog, setShowCommentDialog] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentSelection, setCommentSelection] = useState<{ from: number, to: number } | null>(null);

    // Table Menu State
    const [showTableMenu, setShowTableMenu] = useState(false);

    // Tabs State - for multi-page notes like Google Docs
    const [tabs, setTabs] = useState<{ id: string; title: string; content: string }[]>(
        note.tabs || [{ id: 'main', title: 'Page 1', content: note.content || '' }]
    );
    const [activeTabId, setActiveTabId] = useState(note.tabs?.[0]?.id || 'main');
    const [editingTabId, setEditingTabId] = useState<string | null>(null);

    // Floating Text Boxes State
    const [floatingBoxes, setFloatingBoxes] = useState<{
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        content: string;
        color?: string;
    }[]>(note.floatingBoxes || []);
    const [draggingBoxId, setDraggingBoxId] = useState<string | null>(null);
    const [resizingBoxId, setResizingBoxId] = useState<string | null>(null);
    const [editingBoxId, setEditingBoxId] = useState<string | null>(null);

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
            }),
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
            Underline,
            FontSize,
            Indent,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Image,
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
                    const id = uuidv4();
                    const storageRef = ref(storage, `images/${note.userId}/${id}`);
                    setAiLoading(true);

                    uploadBytes(storageRef, file).then(async () => {
                        const downloadUrl = await getDownloadURL(storageRef);

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
                    }).catch(e => {
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
                        const id = uuidv4();
                        const storageRef = ref(storage, `images/${note.userId}/${id}`);
                        setAiLoading(true);

                        uploadBytes(storageRef, file).then(async () => {
                            const downloadUrl = await getDownloadURL(storageRef);

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
                        }).catch(e => {
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
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            const { note, title, onSave } = performSaveRef.current;
            if (editor) {
                // Update current tab content before saving
                const updatedTabs = tabs.map(t =>
                    t.id === activeTabId ? { ...t, content: editor.getHTML() } : t
                );
                onSave({
                    ...note,
                    title,
                    content: editor.getHTML(),
                    tabs: updatedTabs,
                    floatingBoxes: floatingBoxes
                });
            }
        }, 1000);
    }, [editor, tabs, activeTabId, floatingBoxes]);

    useEffect(() => {
        onUpdateTrigger.current = triggerSave;
    }, [triggerSave]);

    useEffect(() => {
        if (editor && note.id !== previousNoteId) {
            editor.commands.setContent(note.content || '');
            setTitle(note.title);
            setPreviousNoteId(note.id!);
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

    const saveCurrentTabContent = () => {
        if (editor) {
            setTabs(prev => prev.map(t =>
                t.id === activeTabId ? { ...t, content: editor.getHTML() } : t
            ));
        }
    };

    const switchToTab = (tabId: string) => {
        if (tabId === activeTabId) return;

        // Save current tab content first
        saveCurrentTabContent();

        // Switch to new tab
        setActiveTabId(tabId);
        const newTab = tabs.find(t => t.id === tabId);
        if (newTab && editor) {
            editor.commands.setContent(newTab.content || '');
        }
    };

    const addNewTab = () => {
        saveCurrentTabContent();
        const newTabId = `tab-${Date.now()}`;
        const newTab = { id: newTabId, title: `Page ${tabs.length + 1}`, content: '' };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTabId);
        if (editor) {
            editor.commands.setContent('');
        }
    };

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

    // Floating Box Functions
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
        setFloatingBoxes(prev => [...prev, newBox]);
        setEditingBoxId(newBox.id);
    };

    const updateFloatingBox = (id: string, updates: Partial<typeof floatingBoxes[0]>) => {
        setFloatingBoxes(prev => prev.map(box =>
            box.id === id ? { ...box, ...updates } : box
        ));
    };

    const deleteFloatingBox = (id: string) => {
        setFloatingBoxes(prev => prev.filter(box => box.id !== id));
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
            setSermonRecordingDuration(0);
            toast.addToast({ title: 'Recording Started', message: 'Sermon recording in progress...', type: 'recording', duration: 3000 });

            recordingIntervalRef.current = setInterval(() => {
                setSermonRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Failed to start recording:', error);
            toast.error('Recording Failed', (error as Error).message);
        }
    };

    // Stop sermon recording and transcribe
    const handleStopSermonRecording = async () => {
        if (!editor) return;

        const loadingToast = toast.loading('Processing Recording', 'Transcribing audio...');
        setAiLoading(true);

        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }

        try {
            const result = await audioRecorderService.stopRecording();
            setIsSermonRecording(false);

            const transcriptSection = `
                <h2>📝 Sermon Transcript</h2>
                <p><em>Recorded on ${new Date().toLocaleString()} (Duration: ${formatDuration(Math.round(result.duration))})</em></p>
                <hr/>
                <p>${result.transcript}</p>
                <hr/>
            `;

            editor.commands.insertContent(transcriptSection);

            if (result.transcript.length > 100) {
                toast.updateToast(loadingToast, { title: 'Generating Summary', message: 'AI is summarizing your sermon...' });
                const summary = await groqService.summarizeSermon(result.transcript);
                editor.commands.insertContent(
                    `<blockquote><strong>📋 AI Summary:</strong><br/>${summary}</blockquote><p></p>`
                );
            }
            toast.updateToast(loadingToast, { title: 'Transcription Complete', message: 'Your sermon has been transcribed', type: 'success' });
        } catch (error) {
            console.error('Recording/transcription failed:', error);
            toast.updateToast(loadingToast, { title: 'Transcription Failed', message: (error as Error).message, type: 'error' });
            setIsSermonRecording(false);
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

    const handleImportProcess = async () => {
        if (!importText || !editor) return;
        const loadingToast = toast.loading('Processing Import', 'Formatting and analyzing transcript...');
        setAiLoading(true);
        setShowImportDialog(false);
        try {
            editor.commands.insertContent(`<p>${importText}</p>`);
            const summary = await groqService.summarizeSermon(importText);
            editor.commands.insertContent(`<blockquote><strong>Transcript Summary:</strong><br/>${summary}</blockquote><p></p>`);
            setImportText('');
            toast.updateToast(loadingToast, { title: 'Import Complete', message: 'Transcript imported with AI summary', type: 'success' });
        } catch (e) {
            console.error(e);
            toast.updateToast(loadingToast, { title: 'Import Failed', type: 'error' });
        }
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
                    <button onClick={() => setShowImportDialog(true)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Import Transcript / YouTube"><Upload className="w-4 h-4" /></button>
                    <button onClick={handleExportPDF} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Export PDF"><FileText className="w-4 h-4" /></button>
                    <button onClick={addFloatingBox} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Add Text Box"><Square className="w-4 h-4" /></button>
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

                <div className="max-w-3xl mx-auto py-12 px-8 min-h-[90vh] bg-zinc-950">
                    <input
                        value={title}
                        onChange={(e) => {
                            const newTitle = e.target.value;
                            setTitle(newTitle);
                            // Debounce save with new title
                            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                            saveTimeoutRef.current = setTimeout(() => {
                                const { note, onSave } = performSaveRef.current;
                                if (editor) {
                                    onSave({ ...note, title: newTitle, content: editor.getHTML() });
                                }
                            }, 1000);
                        }}
                        className="w-full bg-transparent text-4xl font-bold text-zinc-100 placeholder:text-zinc-700 focus:outline-none mb-6 font-display"
                        placeholder="Untitled Sermon"
                    />

                    {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 p-1.5 rounded-lg shadow-xl overflow-x-auto max-w-[90vw]">
                        {/* Text formatting */}
                        <div className="flex items-center gap-0.5 border-r border-zinc-800 pr-1">
                            <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('bold') && "text-blue-400 bg-blue-500/10")} title="Bold"><Bold className="w-4 h-4" /></button>
                            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('italic') && "text-blue-400 bg-blue-500/10")} title="Italic"><Italic className="w-4 h-4" /></button>
                            <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('underline') && "text-blue-400 bg-blue-500/10")} title="Underline"><UnderlineIcon className="w-4 h-4" /></button>
                            <button onClick={() => editor.chain().focus().toggleSubscript().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('subscript') && "text-blue-400 bg-blue-500/10")} title="Subscript"><SubIcon className="w-4 h-4" /></button>
                            <button onClick={() => editor.chain().focus().toggleSuperscript().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('superscript') && "text-blue-400 bg-blue-500/10")} title="Superscript"><SupIcon className="w-4 h-4" /></button>
                        </div>

                        {/* Font Size */}
                        <div className="flex items-center gap-0.5 border-r border-zinc-800 px-1">
                            <button onClick={() => editor.chain().focus().setFontSize('12px').run()} className={cn("px-1.5 py-1 text-xs hover:bg-zinc-800 rounded text-zinc-400", editor.isActive('textStyle', { fontSize: '12px' }) && "text-white bg-zinc-800")}>S</button>
                            <button onClick={() => editor.chain().focus().unsetFontSize().run()} className={cn("px-1.5 py-1 text-sm hover:bg-zinc-800 rounded text-zinc-300", !editor.isActive('textStyle', { fontSize: '12px' }) && !editor.isActive('textStyle', { fontSize: '20px' }) && "text-white bg-zinc-800")}>M</button>
                            <button onClick={() => editor.chain().focus().setFontSize('20px').run()} className={cn("px-1.5 py-1 text-lg hover:bg-zinc-800 rounded text-zinc-200", editor.isActive('textStyle', { fontSize: '20px' }) && "text-white bg-zinc-800")}>L</button>
                            <button onClick={() => editor.chain().focus().setFontSize('28px').run()} className={cn("px-1.5 py-1 text-xl hover:bg-zinc-800 rounded text-zinc-100", editor.isActive('textStyle', { fontSize: '28px' }) && "text-white bg-zinc-800")}>XL</button>
                        </div>

                        {/* Alignment - now with justify */}
                        <div className="flex items-center gap-0.5 border-r border-zinc-800 px-1">
                            <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive({ textAlign: 'left' }) && "text-blue-400")} title="Align Left"><AlignLeft className="w-4 h-4" /></button>
                            <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive({ textAlign: 'center' }) && "text-blue-400")} title="Align Center"><AlignCenter className="w-4 h-4" /></button>
                            <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive({ textAlign: 'right' }) && "text-blue-400")} title="Align Right"><AlignRight className="w-4 h-4" /></button>
                            <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive({ textAlign: 'justify' }) && "text-blue-400")} title="Justify"><AlignJustify className="w-4 h-4" /></button>
                        </div>

                        {/* Colors */}
                        <div className="flex items-center gap-1 border-r border-zinc-800 px-1">
                            <button onClick={() => editor.chain().focus().setColor('#f87171').run()} className={cn("w-3 h-3 rounded-full bg-red-400 hover:scale-110 transition-transform", editor.isActive('textStyle', { color: '#f87171' }) && "ring-2 ring-white")} />
                            <button onClick={() => editor.chain().focus().setColor('#60a5fa').run()} className={cn("w-3 h-3 rounded-full bg-blue-400 hover:scale-110 transition-transform", editor.isActive('textStyle', { color: '#60a5fa' }) && "ring-2 ring-white")} />
                            <button onClick={() => editor.chain().focus().setColor('#facc15').run()} className={cn("w-3 h-3 rounded-full bg-yellow-400 hover:scale-110 transition-transform", editor.isActive('textStyle', { color: '#facc15' }) && "ring-2 ring-white")} />
                            <button onClick={() => editor.chain().focus().setColor('#4ade80').run()} className={cn("w-3 h-3 rounded-full bg-green-400 hover:scale-110 transition-transform", editor.isActive('textStyle', { color: '#4ade80' }) && "ring-2 ring-white")} />
                            <button onClick={() => editor.chain().focus().unsetColor().run()} className="text-[10px] text-zinc-500 hover:text-white">x</button>
                        </div>

                        {/* Advanced */}
                        <div className="flex items-center gap-0.5 pl-1">
                            <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('highlight') && "text-amber-400")} title="Highlight"><Highlighter className="w-4 h-4" /></button>
                            <button onClick={() => editor.chain().focus().toggleCircle().run()} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('circle') && "text-red-400")} title="Circle Word"><Circle className="w-4 h-4" /></button>
                            <button onClick={openCommentDialog} className={cn("p-1.5 hover:bg-zinc-800 rounded", editor.isActive('comment') && "text-blue-400")} title="Add Comment"><MessageSquarePlus className="w-4 h-4" /></button>
                            <button onClick={handleExegete} className="ml-1 p-1.5 hover:bg-zinc-800 rounded flex items-center gap-1 text-xs font-semibold text-purple-400 bg-purple-500/10"><BookOpen className="w-3 h-3" /> Exegete</button>
                        </div>
                    </BubbleMenu>}

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
