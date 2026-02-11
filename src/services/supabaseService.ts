import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
    localDb,
    localSaveNote, localGetNotes, localGetNotesByFolder, localGetNote, localDeleteNote,
    localSaveFolder, localGetFolders, localUpdateFolder, localDeleteFolder,
    localSaveRecording, localGetRecordings, localDeleteRecording, localUpdateRecording,
    localBulkImportNotes, localBulkImportFolders, localBulkImportRecordings,
    getPendingNotes, getPendingFolders, getPendingRecordings,
    markNoteSynced, markFolderSynced, markRecordingSynced, purgeDeleted,
    type LocalNote, type LocalFolder, type LocalRecording,
} from './localDb';

// =====================================================
// TYPE DEFINITIONS
// =====================================================
import { User } from '@supabase/supabase-js';

export interface NoteTab {
    id: string;
    title: string;
    content: string;
    pageSettings?: PageSettings;
}

export interface FloatingBox {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    content: string;
    color?: string;
}

export interface PageSettings {
    orientation: 'portrait' | 'landscape';
    marginSize: 'normal' | 'narrow' | 'wide';
    theme?: 'dark' | 'light';
}

export interface Note {
    id?: string;
    userId: string;
    folderId: string | null;
    title: string;
    content: string;
    tabs?: NoteTab[];
    floatingBoxes?: FloatingBox[];
    pageSettings?: PageSettings;
    tags: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Folder {
    id?: string;
    userId: string;
    title: string;
    createdAt?: Date;
}

export interface Recording {
    id?: string;
    userId: string;
    noteId?: string;
    noteTitle?: string;
    audioUrl?: string;
    transcript: string;
    duration: number;
    createdAt?: Date;
}

// =====================================================
// CONVERTERS: DB row <-> App types <-> Local types
// =====================================================

function toNote(row: any): Note {
    return {
        id: row.id,
        userId: row.user_id,
        folderId: row.folder_id,
        title: row.title,
        content: row.content || '',
        tabs: row.tabs || [],
        floatingBoxes: row.floating_boxes || [],
        pageSettings: row.page_settings || { orientation: 'portrait', marginSize: 'normal' },
        tags: row.tags || [],
        createdAt: row.created_at ? new Date(row.created_at) : undefined,
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
}

function toFolder(row: any): Folder {
    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        createdAt: row.created_at ? new Date(row.created_at) : undefined,
    };
}

function toRecording(row: any): Recording {
    return {
        id: row.id,
        userId: row.user_id,
        noteId: row.note_id,
        noteTitle: row.note_title,
        audioUrl: row.audio_url,
        transcript: row.transcript || '',
        duration: row.duration || 0,
        createdAt: row.created_at ? new Date(row.created_at) : undefined,
    };
}

/** Convert LocalNote -> Note (for app consumption) */
function localNoteToNote(ln: LocalNote): Note {
    return {
        id: ln.id,
        userId: ln.userId,
        folderId: ln.folderId,
        title: ln.title,
        content: ln.content,
        tabs: ln.tabs,
        floatingBoxes: ln.floatingBoxes,
        pageSettings: ln.pageSettings,
        tags: ln.tags,
        createdAt: new Date(ln.createdAt),
        updatedAt: new Date(ln.updatedAt),
    };
}

/** Convert LocalFolder -> Folder */
function localFolderToFolder(lf: LocalFolder): Folder {
    return {
        id: lf.id,
        userId: lf.userId,
        title: lf.title,
        createdAt: new Date(lf.createdAt),
    };
}

/** Convert LocalRecording -> Recording */
function localRecordingToRecording(lr: LocalRecording): Recording {
    return {
        id: lr.id,
        userId: lr.userId,
        noteId: lr.noteId || undefined,
        noteTitle: lr.noteTitle,
        audioUrl: lr.audioUrl || undefined,
        transcript: lr.transcript,
        duration: lr.duration,
        createdAt: new Date(lr.createdAt),
    };
}

// =====================================================
// LOCAL-FIRST SUPABASE SERVICE
// =====================================================

class SupabaseService {
    private channels: Map<string, RealtimeChannel> = new Map();
    private syncInProgress = false;
    private syncTimer: ReturnType<typeof setTimeout> | null = null;

    async getCurrentUser(): Promise<{ data: { user: User | null }, error: any }> {
        return await supabase.auth.getUser();
    }

    // =====================================================
    // BACKGROUND SYNC ENGINE
    // =====================================================

    /** Schedule a background sync after a short delay (debounced) */
    private scheduleSyncToCloud(): void {
        if (this.syncTimer) clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => {
            this.syncToCloud().catch(err => console.warn('Background sync failed:', err));
        }, 2000); // 2 second debounce
    }

    /** Push all pending local changes to Supabase */
    async syncToCloud(): Promise<void> {
        if (this.syncInProgress) return;
        this.syncInProgress = true;

        try {
            // 1. Sync pending folders
            const pendingFolders = await getPendingFolders();
            for (const folder of pendingFolders) {
                try {
                    if (folder.deleted === 1) {
                        await supabase.from('folders').delete().eq('id', folder.id);
                    } else {
                        await supabase.from('folders').upsert({
                            id: folder.id,
                            user_id: folder.userId,
                            title: folder.title,
                            created_at: folder.createdAt,
                        });
                    }
                    await markFolderSynced(folder.id);
                } catch (err) {
                    console.warn(`Sync failed for folder ${folder.id}:`, err);
                }
            }

            // 2. Sync pending notes
            const pendingNotes = await getPendingNotes();
            for (const note of pendingNotes) {
                try {
                    if (note.deleted === 1) {
                        await supabase.from('notes').delete().eq('id', note.id);
                    } else {
                        await supabase.from('notes').upsert({
                            id: note.id,
                            user_id: note.userId,
                            folder_id: note.folderId,
                            title: note.title,
                            content: note.content,
                            tabs: note.tabs,
                            floating_boxes: note.floatingBoxes,
                            page_settings: note.pageSettings,
                            tags: note.tags,
                            created_at: note.createdAt,
                            updated_at: note.updatedAt,
                        });
                    }
                    await markNoteSynced(note.id);
                } catch (err) {
                    console.warn(`Sync failed for note ${note.id}:`, err);
                }
            }

            // 3. Sync pending recordings (skip audio blob sync - that's separate)
            const pendingRecordings = await getPendingRecordings();
            for (const rec of pendingRecordings) {
                try {
                    if (rec.deleted === 1) {
                        await supabase.from('recordings').delete().eq('id', rec.id);
                    } else {
                        await supabase.from('recordings').upsert({
                            id: rec.id,
                            user_id: rec.userId,
                            note_id: rec.noteId,
                            note_title: rec.noteTitle,
                            audio_url: rec.audioUrl,
                            transcript: rec.transcript,
                            duration: rec.duration,
                            created_at: rec.createdAt,
                        });
                    }
                    await markRecordingSynced(rec.id);
                } catch (err) {
                    console.warn(`Sync failed for recording ${rec.id}:`, err);
                }
            }

            // 4. Clean up permanently deleted items that have been synced
            await purgeDeleted();

            const totalPending = pendingFolders.length + pendingNotes.length + pendingRecordings.length;
            if (totalPending > 0) {
                console.log(`✅ Synced ${totalPending} items to Supabase`);
            }
        } finally {
            this.syncInProgress = false;
        }
    }

    /** Pull latest data from Supabase into local DB (initial hydration) */
    async pullFromCloud(userId: string): Promise<void> {
        try {
            // Fetch from Supabase
            const [notesRes, foldersRes, recordingsRes] = await Promise.allSettled([
                supabase.from('notes').select('*').eq('user_id', userId),
                supabase.from('folders').select('*').eq('user_id', userId),
                supabase.from('recordings').select('*').eq('user_id', userId),
            ]);

            // Import notes — PROTECT pending local changes
            if (notesRes.status === 'fulfilled' && notesRes.value.data) {
                for (const row of notesRes.value.data) {
                    const localNote = await localGetNote(row.id);
                    // Only overwrite if: no local version, OR local version is already synced
                    if (!localNote || localNote.pendingSync === 0) {
                        await localDb.notes.put({
                            id: row.id,
                            userId: row.user_id,
                            folderId: row.folder_id,
                            title: row.title,
                            content: row.content || '',
                            tabs: row.tabs || [],
                            floatingBoxes: row.floating_boxes || [],
                            pageSettings: row.page_settings || { orientation: 'portrait', marginSize: 'normal' },
                            tags: row.tags || [],
                            createdAt: row.created_at || new Date().toISOString(),
                            updatedAt: row.updated_at || new Date().toISOString(),
                            pendingSync: 0,
                            deleted: 0,
                        });
                    }
                }
            }

            // Import folders — PROTECT pending local changes
            if (foldersRes.status === 'fulfilled' && foldersRes.value.data) {
                for (const row of foldersRes.value.data) {
                    const existing = await localDb.folders.get(row.id);
                    if (!existing || existing.pendingSync === 0) {
                        await localDb.folders.put({
                            id: row.id,
                            userId: row.user_id,
                            title: row.title,
                            createdAt: row.created_at || new Date().toISOString(),
                            pendingSync: 0,
                            deleted: 0,
                        });
                    }
                }
            }

            // Import recordings — PROTECT pending local changes
            if (recordingsRes.status === 'fulfilled' && recordingsRes.value.data) {
                for (const row of recordingsRes.value.data) {
                    const existing = await localDb.recordings.get(row.id);
                    if (!existing || existing.pendingSync === 0) {
                        await localDb.recordings.put({
                            id: row.id,
                            userId: row.user_id,
                            noteId: row.note_id,
                            noteTitle: row.note_title || 'Untitled Recording',
                            audioUrl: row.audio_url,
                            transcript: row.transcript || '',
                            duration: row.duration || 0,
                            createdAt: row.created_at || new Date().toISOString(),
                            pendingSync: 0,
                            deleted: 0,
                        });
                    }
                }
            }

            console.log('☁️ Pulled latest data from Supabase into local DB');
        } catch (err) {
            console.warn('Cloud pull failed (offline?). Using local data only.', err);
        }
    }

    // =====================================================
    // FOLDERS (Local-First)
    // =====================================================

    getNewFolderId(): string {
        return crypto.randomUUID();
    }

    async createFolder(userId: string, folderData: { title: string }, customId?: string): Promise<string> {
        const id = customId || this.getNewFolderId();
        await localSaveFolder({
            id,
            userId,
            title: folderData.title,
        });
        this.scheduleSyncToCloud();
        return id;
    }

    async getFolders(userId: string): Promise<Folder[]> {
        const localFolders = await localGetFolders(userId);
        return localFolders.map(localFolderToFolder);
    }

    async updateFolder(folderId: string, data: Partial<{ title: string }>): Promise<void> {
        await localUpdateFolder(folderId, data);
        this.scheduleSyncToCloud();
    }

    async deleteFolder(folderId: string): Promise<void> {
        await localDeleteFolder(folderId);
        this.scheduleSyncToCloud();
    }

    subscribeFolders(userId: string, onData: (folders: Folder[]) => void): () => void {
        // Initial fetch from local DB (instant!)
        this.getFolders(userId).then(onData).catch(console.error);

        // Also pull from cloud in background and refresh
        this.pullFromCloud(userId).then(() => {
            this.getFolders(userId).then(onData).catch(console.error);
        }).catch(console.error);

        // Set up realtime subscription for cross-device sync
        const channelName = `folders:${userId}`;
        const existingChannel = this.channels.get(channelName);
        if (existingChannel) {
            supabase.removeChannel(existingChannel);
        }

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'folders',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    // Cloud changed -> pull new data but DON'T overwrite pending local changes
                    this.pullFromCloud(userId).then(() => {
                        this.getFolders(userId).then(onData).catch(console.error);
                    }).catch(() => {
                        // If pull fails, still read local
                        this.getFolders(userId).then(onData).catch(console.error);
                    });
                }
            )
            .subscribe();

        this.channels.set(channelName, channel);

        return () => {
            supabase.removeChannel(channel);
            this.channels.delete(channelName);
        };
    }

    // =====================================================
    // NOTES (Local-First)
    // =====================================================

    getNewNoteId(): string {
        return crypto.randomUUID();
    }

    async createNote(userId: string, noteData: Partial<Note>, customId?: string): Promise<string> {
        const id = customId || this.getNewNoteId();
        await localSaveNote({
            id,
            userId,
            folderId: noteData.folderId || null,
            title: noteData.title || 'Untitled Note',
            content: noteData.content || '',
            tabs: noteData.tabs || [],
            floatingBoxes: noteData.floatingBoxes || [],
            pageSettings: noteData.pageSettings || { orientation: 'portrait', marginSize: 'normal' },
            tags: noteData.tags || [],
        });
        this.scheduleSyncToCloud();
        return id;
    }

    async getNotes(userId: string): Promise<Note[]> {
        const localNotes = await localGetNotes(userId);
        return localNotes.map(localNoteToNote);
    }

    async getNotesByFolder(userId: string, folderId: string): Promise<Note[]> {
        // IndexedDB compound index query doesn't work easily, so filter in memory
        const allNotes = await localGetNotes(userId);
        return allNotes.filter(n => n.folderId === folderId).map(localNoteToNote);
    }

    async updateNote(noteId: string, data: Partial<Note>): Promise<void> {
        // Get existing note from local DB
        const existing = await localGetNote(noteId);

        if (!existing) {
            // Note not in IndexedDB yet (pre-migration or not pulled yet)
            // CREATE it in local DB with the data we have — NEVER drop a save
            console.warn(`Note ${noteId} not in local DB — creating it now`);
            await localSaveNote({
                id: noteId,
                userId: data.userId || '',
                folderId: data.folderId ?? null,
                title: data.title || 'Untitled Note',
                content: data.content || '',
                tabs: data.tabs || [],
                floatingBoxes: data.floatingBoxes || [],
                pageSettings: data.pageSettings || { orientation: 'portrait', marginSize: 'normal' },
                tags: data.tags || [],
            });
            this.scheduleSyncToCloud();
            return;
        }

        // Merge updates into existing note
        await localSaveNote({
            ...existing,
            title: data.title !== undefined ? data.title : existing.title,
            content: data.content !== undefined ? data.content : existing.content,
            tabs: data.tabs !== undefined ? data.tabs : existing.tabs,
            floatingBoxes: data.floatingBoxes !== undefined ? data.floatingBoxes : existing.floatingBoxes,
            pageSettings: data.pageSettings !== undefined ? data.pageSettings : existing.pageSettings,
            folderId: data.folderId !== undefined ? data.folderId : existing.folderId,
            tags: data.tags !== undefined ? data.tags : existing.tags,
            createdAt: existing.createdAt,
        });
        this.scheduleSyncToCloud();
    }

    async deleteNote(noteId: string): Promise<void> {
        await localDeleteNote(noteId);
        this.scheduleSyncToCloud();
    }

    subscribeNotes(userId: string, folderId: string | null, onData: (notes: Note[]) => void): () => void {
        // Fetch from local DB
        const fetchNotes = async () => {
            if (folderId === 'recent' || folderId === 'all' || !folderId) {
                return this.getNotes(userId);
            } else {
                return this.getNotesByFolder(userId, folderId);
            }
        };

        // Instant local fetch
        fetchNotes().then(onData).catch(console.error);

        // Pull from cloud and refresh
        this.pullFromCloud(userId).then(() => {
            fetchNotes().then(onData).catch(console.error);
        }).catch(console.error);

        // Realtime subscription for cross-device sync
        const channelName = `notes:${userId}:${folderId || 'all'}`;
        const existingChannel = this.channels.get(channelName);
        if (existingChannel) {
            supabase.removeChannel(existingChannel);
        }

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notes',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    // Pull new data but protect local pending changes
                    this.pullFromCloud(userId).then(() => {
                        fetchNotes().then(onData).catch(console.error);
                    }).catch(() => {
                        // If pull fails, still read local
                        fetchNotes().then(onData).catch(console.error);
                    });
                }
            )
            .subscribe();

        this.channels.set(channelName, channel);

        return () => {
            supabase.removeChannel(channel);
            this.channels.delete(channelName);
        };
    }

    // =====================================================
    // RECORDINGS (Local-First)
    // =====================================================

    async saveRecording(userId: string, recordingData: {
        noteId?: string;
        noteTitle?: string;
        audioUrl?: string;
        transcript: string;
        duration: number;
    }): Promise<string> {
        const id = crypto.randomUUID();
        await localSaveRecording({
            id,
            userId,
            noteId: recordingData.noteId || null,
            noteTitle: recordingData.noteTitle || 'Untitled Recording',
            audioUrl: recordingData.audioUrl || null,
            transcript: recordingData.transcript,
            duration: recordingData.duration,
        });
        this.scheduleSyncToCloud();
        return id;
    }

    async getRecordings(userId: string): Promise<Recording[]> {
        const localRecs = await localGetRecordings(userId);
        return localRecs.map(localRecordingToRecording);
    }

    subscribeRecordings(userId: string, onData: (recordings: Recording[]) => void): () => void {
        // Instant local fetch
        this.getRecordings(userId).then(onData).catch(console.error);

        // Pull from cloud and refresh
        this.pullFromCloud(userId).then(() => {
            this.getRecordings(userId).then(onData).catch(console.error);
        }).catch(console.error);

        // Realtime subscription
        const channelName = `recordings:${userId}`;
        const existingChannel = this.channels.get(channelName);
        if (existingChannel) {
            supabase.removeChannel(existingChannel);
        }

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'recordings',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    this.pullFromCloud(userId).then(() => {
                        this.getRecordings(userId).then(onData).catch(console.error);
                    }).catch(console.error);
                }
            )
            .subscribe();

        this.channels.set(channelName, channel);

        return () => {
            supabase.removeChannel(channel);
            this.channels.delete(channelName);
        };
    }

    async deleteRecording(recordingId: string): Promise<void> {
        await localDeleteRecording(recordingId);
        this.scheduleSyncToCloud();
    }

    async updateRecording(recordingId: string, data: Partial<Recording>): Promise<void> {
        const updateData: Partial<LocalRecording> = {};
        if (data.noteTitle !== undefined) updateData.noteTitle = data.noteTitle;
        if (data.transcript !== undefined) updateData.transcript = data.transcript;
        if (data.audioUrl !== undefined) updateData.audioUrl = data.audioUrl;

        await localUpdateRecording(recordingId, updateData);
        this.scheduleSyncToCloud();
    }

    // =====================================================
    // FILE UPLOADS (still direct to Supabase - binary data)
    // =====================================================

    async uploadImage(userId: string, file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('images')
            .getPublicUrl(fileName);

        return data.publicUrl;
    }

    async uploadAudio(userId: string, blob: Blob, filename: string): Promise<string> {
        const filePath = `${userId}/${filename}`;

        // Timeout wrapper to prevent hanging forever if Storage is unreachable
        const uploadWithTimeout = async (timeoutMs: number = 30000): Promise<string> => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const { error: uploadError } = await supabase.storage
                    .from('recordings')
                    .upload(filePath, blob);

                clearTimeout(timeoutId);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('recordings')
                    .getPublicUrl(filePath);

                return data.publicUrl;
            } catch (error: any) {
                clearTimeout(timeoutId);
                if (error?.name === 'AbortError') {
                    throw new Error('Audio upload timed out after 30 seconds. Your recording was downloaded locally instead.');
                }
                throw error;
            }
        };

        return uploadWithTimeout();
    }
}

export default new SupabaseService();
