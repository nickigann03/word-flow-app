"use client"
import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { NoteEditor } from './NoteEditor';
import { BibleReader } from './BibleReaderPanel';
import { ReformedAIChat } from './ReformedAIChat';
import RecordingsLibrary from './RecordingsLibrary';
import { useAuth } from '@/contexts/AuthContext';
import firestoreService, { Folder, Note } from '@/services/firestoreService';
import { Plus, FileText, LayoutTemplate, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllTemplates } from '@/data/sermonTemplates';
import { useToast } from './Toast';
import { Modal } from './Modal';

export function Dashboard() {
    const { user } = useAuth();
    const toast = useToast();
    const [folders, setFolders] = useState<Folder[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedFolder, setSelectedFolder] = useState('recent');
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [view, setView] = useState<'list' | 'editor' | 'templates'>('list');

    // Update current note content when note changes
    useEffect(() => {
        if (selectedNote) {
            setCurrentNoteContent(selectedNote.content || '');
        } else {
            setCurrentNoteContent('');
        }
    }, [selectedNote]);

    // Panel states
    const [isBibleOpen, setIsBibleOpen] = useState(false);
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [isRecordingsOpen, setIsRecordingsOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Modal states
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [createFolderName, setCreateFolderName] = useState('');
    const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

    // Reference to the NoteEditor for inserting content
    const [pendingInsert, setPendingInsert] = useState<{ text: string; reference: string } | null>(null);

    // Track current note content for AI context
    const [currentNoteContent, setCurrentNoteContent] = useState<string>('');

    // Subscribe to Folders
    useEffect(() => {
        if (!user?.uid) {
            setFolders([]);
            return;
        }

        const unsubscribe = firestoreService.subscribeFolders(user.uid, (data) => {
            setFolders(data);
        });
        return () => unsubscribe();
    }, [user]);

    // Subscribe to Notes based on selected folder
    useEffect(() => {
        if (!user?.uid) {
            setNotes([]);
            return;
        }

        const folderToQuery = selectedFolder === 'recent' || selectedFolder === 'all' ? selectedFolder : selectedFolder;
        // Logic inside service handles 'recent'/'all' vs specific ID
        const unsubscribe = firestoreService.subscribeNotes(user.uid, folderToQuery, (data) => {
            setNotes(data);
        });
        return () => unsubscribe();
    }, [user, selectedFolder]);

    const handleSelectFolder = (id: string) => {
        setSelectedFolder(id);
        setSelectedNote(null);
        setView('list');
        // No need to call loadNotes, the useEffect above will trigger due to selectedFolder change
    };

    const handleCreateNote = async (templateContent = '') => {
        if (!user) {
            toast.error('Authentication Required', 'Please log in to create notes.');
            return;
        }

        // Optimistic UI Update
        const newId = firestoreService.getNewNoteId();
        const newNote = {
            id: newId,
            title: 'Untitled Note',
            content: templateContent,
            folderId: selectedFolder === 'recent' || selectedFolder === 'all' ? null : selectedFolder,
            tags: [],
            userId: user.uid,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Optimistic UI Update: Add to list immediately
        setNotes(prev => [newNote, ...prev]);

        // We still set view/selection immediately to ensure smooth transition
        // The notes list update will come from the subscription instantly
        setSelectedNote(newNote);
        setView('editor');

        // Background Sync
        firestoreService.createNote(user.uid, newNote, newId)
            .catch(error => {
                console.error('Failed to create note in background:', error);
                // Rollback
                setNotes(prev => prev.filter(n => n.id !== newId));
                toast.error('Sync Failed', 'Could not save note to server');
            });
    };

    const handleSaveNote = async (updated: Note) => {
        if (!updated.id) return;

        // Optimistic UI Update
        const previousNotes = [...notes];
        setNotes(prevNotes => prevNotes.map(n => n.id === updated.id ? updated : n));
        setSelectedNote(updated);
        // Note: We don't necessarily update currentNoteContent here as it might be driven by the editor's internal state, 
        // but ensuring it syncs is good.
        setCurrentNoteContent(updated.content || '');

        try {
            await firestoreService.updateNote(updated.id, {
                title: updated.title,
                content: updated.content
            });
            // Success - silent, no toast needed for auto-saves
        } catch (error) {
            console.error('Failed to save note:', error);
            // Rollback UI
            setNotes(previousNotes);
            toast.error('Save Failed', `Your changes could not be saved: ${(error as Error).message}`);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm("Are you sure you want to delete this note?")) return;

        // Optimistic UI Update
        const previousNotes = [...notes];
        setNotes(prevNotes => prevNotes.filter(n => n.id !== noteId));
        if (selectedNote?.id === noteId) {
            setSelectedNote(null);
            setView('list');
        }

        // Background Sync (Subscription handles UI removal instantly)
        firestoreService.deleteNote(noteId)
            .then(() => {
                toast.success('Note Deleted', 'Note removed permanently');
                if (selectedNote?.id === noteId) {
                    setSelectedNote(null);
                    setView('list');
                }
            })
            .catch(error => {
                console.error('Failed to delete note:', error);
                // Rollback
                setNotes(previousNotes);
                toast.error('Delete Failed', 'Could not delete note from server');
            });
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
                onCreateFolder={() => {
                    setCreateFolderName('');
                    setIsCreateFolderOpen(true);
                }}
                onDeleteFolder={(id) => setFolderToDelete(id)}
                onOpenBible={handleToggleBible}
                onOpenAIChat={handleToggleAIChat}
                onOpenRecordings={() => setIsRecordingsOpen(true)}
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

            {/* Recordings Library Modal */}
            {isRecordingsOpen && user && (
                <RecordingsLibrary
                    userId={user.uid}
                    onClose={() => setIsRecordingsOpen(false)}
                />
            )}

            {/* Create Folder Modal */}
            <Modal
                isOpen={isCreateFolderOpen}
                onClose={() => setIsCreateFolderOpen(false)}
                title="New Folder"
            >
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!createFolderName.trim() || !user) return;

                        const newId = firestoreService.getNewFolderId();
                        const newFolder: Folder = { id: newId, title: createFolderName, userId: user.uid, createdAt: new Date() };



                        // 1. Instant UI Update (Optimistic)
                        setFolders(prev => [newFolder, ...prev]);
                        setIsCreateFolderOpen(false);

                        // 2. Background Sync
                        firestoreService.createFolder(user.uid, { title: createFolderName }, newId)
                            .catch(e => {
                                console.error('Folder sync failed', e);
                                // Rollback
                                setFolders(prev => prev.filter(f => f.id !== newId));
                                toast.error('Sync Failed', 'Could not save folder to server');
                            });
                    }}
                    className="space-y-4"
                >
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Folder Name</label>
                        <input
                            value={createFolderName}
                            onChange={(e) => setCreateFolderName(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            placeholder="e.g. Sunday Sermons"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsCreateFolderOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!createFolderName.trim()}
                            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create Folder
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Folder Modal */}
            <Modal
                isOpen={!!folderToDelete}
                onClose={() => setFolderToDelete(null)}
                title="Delete Folder?"
            >
                <div className="space-y-4">
                    <p className="text-zinc-400">
                        Are you sure you want to delete this folder? Notes inside might be lost or become uncategorized.
                        <br /><br />
                        <span className="text-red-400 text-sm">This action cannot be undone.</span>
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setFolderToDelete(null)}
                            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                if (!folderToDelete) return;

                                const idToDelete = folderToDelete;
                                // 1. Optimistic UI Update
                                setFolders(prev => prev.filter(f => f.id !== idToDelete));
                                if (selectedFolder === idToDelete) setSelectedFolder('recent');
                                setFolderToDelete(null); // Close modal instantly

                                const toastId = toast.loading('Deleting Folder...');

                                // 2. Background Sync
                                try {
                                    await firestoreService.deleteFolder(idToDelete);
                                    toast.updateToast(toastId, { title: 'Folder Deleted', type: 'success' });
                                } catch (e) {
                                    toast.updateToast(toastId, { title: 'Failed to delete folder', message: (e as Error).message || 'Could not delete folder', type: 'error' });
                                    const freshFolders = await firestoreService.getFolders(user?.uid || '');
                                    setFolders(freshFolders);
                                }
                            }}
                            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                        >
                            Delete Folder
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
