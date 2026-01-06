"use client"
import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { NoteEditor } from './NoteEditor';
import { BibleReader } from './BibleReaderPanel';
import { ReformedAIChat } from './ReformedAIChat';
import { useAuth } from '@/contexts/AuthContext';
import firestoreService, { Folder, Note } from '@/services/firestoreService';
import { Plus, FileText, LayoutTemplate, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllTemplates } from '@/data/sermonTemplates';
import { useToast } from './Toast';

export function Dashboard() {
    const { user } = useAuth();
    const toast = useToast();
    const [folders, setFolders] = useState<Folder[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedFolder, setSelectedFolder] = useState('recent');
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [view, setView] = useState<'list' | 'editor' | 'templates'>('list');

    // Panel states
    const [isBibleOpen, setIsBibleOpen] = useState(false);
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Reference to the NoteEditor for inserting content
    const [pendingInsert, setPendingInsert] = useState<{ text: string; reference: string } | null>(null);

    // Track current note content for AI context
    const [currentNoteContent, setCurrentNoteContent] = useState<string>('');

    useEffect(() => {
        if (user?.uid) {
            loadFolders();
            loadNotes('recent');
        }
    }, [user]);

    // Update current note content when note changes
    useEffect(() => {
        if (selectedNote) {
            setCurrentNoteContent(selectedNote.content || '');
        } else {
            setCurrentNoteContent('');
        }
    }, [selectedNote]);

    async function loadFolders() {
        if (!user) return;
        try {
            const data = await firestoreService.getFolders(user.uid);
            setFolders(data);
        } catch (error) {
            console.error('Failed to load folders:', error);
            toast.error('Sync Error', `Failed to load folders: ${(error as Error).message}`);
        }
    }

    async function loadNotes(folderId: string) {
        if (!user) return;
        try {
            let data;
            if (folderId === 'recent' || folderId === 'all') {
                data = await firestoreService.getNotes(user.uid);
            } else {
                data = await firestoreService.getNotesByFolder(folderId);
            }
            setNotes(data);
        } catch (error) {
            console.error('Failed to load notes:', error);
            toast.error('Sync Error', `Failed to load notes: ${(error as Error).message}`);
        }
    }

    const handleSelectFolder = (id: string) => {
        setSelectedFolder(id);
        setSelectedNote(null);
        setView('list');
        loadNotes(id);
    };

    const handleCreateNote = async (templateContent = '') => {
        if (!user) {
            toast.error('Authentication Required', 'Please log in to create notes.');
            return;
        }

        const toastId = toast.loading('Creating Note', 'Setting up new document...');
        try {
            const newNote = {
                title: 'Untitled Note',
                content: templateContent,
                folderId: selectedFolder === 'recent' || selectedFolder === 'all' ? null : selectedFolder,
                tags: []
            };
            const id = await firestoreService.createNote(user.uid, newNote);
            const note = { id, ...newNote, userId: user.uid, tags: [] };

            setNotes([note, ...notes]);
            setSelectedNote(note);
            setView('editor');
            toast.updateToast(toastId, { title: 'Note Created', message: 'Started a new note', type: 'success' });
        } catch (error) {
            console.error('Failed to create note:', error);
            toast.updateToast(toastId, { title: 'Creation Failed', message: (error as Error).message || 'Could not create new note', type: 'error' });
        }
    };

    const handleSaveNote = async (updated: Note) => {
        if (!updated.id) return;
        try {
            await firestoreService.updateNote(updated.id, {
                title: updated.title,
                content: updated.content
            });
            setNotes(prevNotes => prevNotes.map(n => n.id === updated.id ? updated : n));
            // Don't show success toast on every auto-save to avoid spam
            // Instead, we rely on the absence of error
            setSelectedNote(updated);
            setCurrentNoteContent(updated.content || '');
        } catch (error) {
            console.error('Failed to save note:', error);
            toast.error('Save Failed', `Your changes could not be saved: ${(error as Error).message}`);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm("Are you sure you want to delete this note?")) return;

        const toastId = toast.loading('Deleting Note', 'Removing note permanently...');
        try {
            await firestoreService.deleteNote(noteId);
            setNotes(prevNotes => prevNotes.filter(n => n.id !== noteId));
            setSelectedNote(null);
            setView('list');
            toast.updateToast(toastId, { title: 'Note Deleted', message: 'Note has been removed', type: 'success' });
        } catch (error) {
            console.error('Failed to delete note:', error);
            toast.updateToast(toastId, { title: 'Delete Failed', message: (error as Error).message || 'Could not delete the note', type: 'error' });
        }
    };

    // Handler for inserting verses from Bible Reader or AI Chat
    const handleInsertVerse = useCallback((text: string, reference: string) => {
        setPendingInsert({ text, reference });
    }, []);

    // Toggle handlers for panels
    const handleToggleBible = () => setIsBibleOpen(prev => !prev);
    const handleToggleAIChat = () => setIsAIChatOpen(prev => !prev);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar
                folders={folders}
                selectedFolder={selectedFolder}
                onSelectFolder={handleSelectFolder}
                onCreateFolder={async () => {
                    const title = prompt("Folder Name:");
                    if (title && user) {
                        const toastId = toast.loading('Creating Folder', 'Creating new folder...');
                        try {
                            await firestoreService.createFolder(user.uid, { title });
                            await loadFolders();
                            toast.updateToast(toastId, { title: 'Folder Created', message: 'New folder added', type: 'success' });
                        } catch (e) {
                            console.error(e);
                            toast.updateToast(toastId, { title: 'Creation Failed', message: (e as Error).message || 'Could not create folder', type: 'error' });
                        }
                    }
                }}
                onDeleteFolder={async (id) => {
                    if (confirm("Delete this folder? Notes inside might be lost.")) {
                        const toastId = toast.loading('Deleting Folder...');
                        try {
                            await firestoreService.deleteFolder(id);
                            loadFolders();
                            if (selectedFolder === id) setSelectedFolder('recent');
                            toast.updateToast(toastId, { title: 'Folder Deleted', type: 'success' });
                        } catch (e) {
                            toast.updateToast(toastId, { title: 'Failed to delete folder', message: (e as Error).message || 'Could not delete folder', type: 'error' });
                        }
                    }
                }}
                onOpenBible={handleToggleBible}
                onOpenAIChat={handleToggleAIChat}
                isBibleOpen={isBibleOpen}
                isAIChatOpen={isAIChatOpen}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full bg-zinc-950 relative">
                {view === 'editor' && selectedNote ? (
                    <NoteEditor
                        note={selectedNote}
                        onSave={handleSaveNote}
                        onDelete={() => selectedNote.id && handleDeleteNote(selectedNote.id)}
                        onExport={(fmt, note) => console.log('Export', fmt)}
                        pendingInsert={pendingInsert}
                        onInsertComplete={() => setPendingInsert(null)}
                    />
                ) : view === 'templates' ? (
                    <div className="p-8">
                        <h2 className="text-2xl font-bold mb-6">Choose a Template</h2>
                        <div className="grid grid-cols-3 gap-6">
                            {['Blank', '3-Point Sermon', 'Expository'].map(t => (
                                <div key={t} onClick={() => handleCreateNote(t === 'Blank' ? '' : `## ${t}\n\n`)} className="p-6 bg-zinc-900 border border-zinc-800 hover:border-blue-500 cursor-pointer rounded-xl transition-all">
                                    <LayoutTemplate className="w-8 h-8 mb-4 text-zinc-500" />
                                    <h3 className="font-bold">{t}</h3>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setView('list')} className="mt-8 text-zinc-500 hover:text-white">Cancel</button>
                    </div>
                ) : (
                    /* List View */
                    <div className="p-8 h-full overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                                    {selectedFolder === 'recent' ? 'Recent Notes' : folders.find(f => f.id === selectedFolder)?.title || 'Notes'}
                                </h1>
                                <p className="text-zinc-500">{notes.length} notes</p>
                            </div>
                            <button
                                onClick={() => setView('templates')}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> New Note
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {notes.map(note => (
                                <div
                                    key={note.id}
                                    className="group relative p-5 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl hover:bg-zinc-900 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/10 cursor-pointer transition-all duration-300"
                                >
                                    {/* Delete button - appears on hover */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (note.id) handleDeleteNote(note.id);
                                        }}
                                        className="absolute top-3 right-3 p-1.5 bg-zinc-800/80 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                                        title="Delete Note"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    <div onClick={() => { setSelectedNote(note); setView('editor'); }}>
                                        <h3 className="font-bold text-lg mb-2 text-zinc-100 group-hover:text-blue-400 transition-colors pr-8">{note.title || 'Untitled'}</h3>
                                        <p className="text-sm text-zinc-500 line-clamp-3">
                                            {note.content?.replace(/[#*`<>]/g, '').substring(0, 150) || 'No content...'}
                                        </p>
                                        <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-600">
                                            <span>{new Date().toLocaleDateString()}</span>
                                            <FileText className="w-3 h-3 group-hover:text-blue-500" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {notes.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-600 min-h-[400px] border border-dashed border-zinc-800 rounded-2xl">
                                    <FileText className="w-12 h-12 mb-4 opacity-20" />
                                    <p>No notes in this folder</p>
                                    <button onClick={() => setView('templates')} className="mt-4 text-blue-500 hover:underline">Create one</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bible Reader Panel */}
            <BibleReader
                isOpen={isBibleOpen}
                onClose={() => setIsBibleOpen(false)}
                onInsertVerse={handleInsertVerse}
            />

            {/* Reformed AI Chat Panel */}
            <ReformedAIChat
                isOpen={isAIChatOpen}
                onClose={() => setIsAIChatOpen(false)}
                onInsertVerse={handleInsertVerse}
                noteContext={currentNoteContent}
                noteTitle={selectedNote?.title}
            />
        </div>
    );
}
