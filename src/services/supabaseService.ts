import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface NoteTab {
    id: string;
    title: string;
    content: string;
    pageSettings?: {
        orientation: 'portrait' | 'landscape';
        marginSize: 'normal' | 'narrow' | 'wide';
    };
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
// HELPER: Convert snake_case DB rows to camelCase
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

// =====================================================
// SUPABASE SERVICE CLASS
// =====================================================

class SupabaseService {
    private channels: Map<string, RealtimeChannel> = new Map();

    // =====================================================
    // FOLDERS
    // =====================================================

    getNewFolderId(): string {
        return crypto.randomUUID();
    }

    async createFolder(userId: string, folderData: { title: string }, customId?: string): Promise<string> {
        const id = customId || this.getNewFolderId();

        const { error } = await supabase
            .from('folders')
            .insert({
                id,
                user_id: userId,
                title: folderData.title,
            });

        if (error) throw error;
        return id;
    }

    async getFolders(userId: string): Promise<Folder[]> {
        const { data, error } = await supabase
            .from('folders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(toFolder);
    }

    async updateFolder(folderId: string, data: Partial<{ title: string }>): Promise<void> {
        const { error } = await supabase
            .from('folders')
            .update({ title: data.title })
            .eq('id', folderId);

        if (error) throw error;
    }

    async deleteFolder(folderId: string): Promise<void> {
        const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', folderId);

        if (error) throw error;
    }

    subscribeFolders(userId: string, onData: (folders: Folder[]) => void): () => void {
        // Initial fetch
        this.getFolders(userId).then(onData).catch(console.error);

        // Set up realtime subscription
        const channelName = `folders:${userId}`;

        // Clean up existing channel if any
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
                    // Refetch on any change
                    this.getFolders(userId).then(onData).catch(console.error);
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
    // NOTES
    // =====================================================

    getNewNoteId(): string {
        return crypto.randomUUID();
    }

    async createNote(userId: string, noteData: Partial<Note>, customId?: string): Promise<string> {
        const id = customId || this.getNewNoteId();

        const { error } = await supabase
            .from('notes')
            .insert({
                id,
                user_id: userId,
                folder_id: noteData.folderId || null,
                title: noteData.title || 'Untitled Note',
                content: noteData.content || '',
                tabs: noteData.tabs || [],
                floating_boxes: noteData.floatingBoxes || [],
                page_settings: noteData.pageSettings || { orientation: 'portrait', marginSize: 'normal' },
                tags: noteData.tags || [],
            });

        if (error) throw error;
        return id;
    }

    async getNotes(userId: string): Promise<Note[]> {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(toNote);
    }

    async getNotesByFolder(folderId: string): Promise<Note[]> {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('folder_id', folderId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(toNote);
    }

    async updateNote(noteId: string, data: Partial<Note>): Promise<void> {
        const updateData: any = {};

        if (data.title !== undefined) updateData.title = data.title;
        if (data.content !== undefined) updateData.content = data.content;
        if (data.tabs !== undefined) updateData.tabs = data.tabs;
        if (data.floatingBoxes !== undefined) updateData.floating_boxes = data.floatingBoxes;
        if (data.pageSettings !== undefined) updateData.page_settings = data.pageSettings;
        if (data.folderId !== undefined) updateData.folder_id = data.folderId;
        if (data.tags !== undefined) updateData.tags = data.tags;

        const { error } = await supabase
            .from('notes')
            .update(updateData)
            .eq('id', noteId);

        if (error) throw error;
    }

    async deleteNote(noteId: string): Promise<void> {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId);

        if (error) throw error;
    }

    subscribeNotes(userId: string, folderId: string | null, onData: (notes: Note[]) => void): () => void {
        // Initial fetch based on folder
        const fetchNotes = async () => {
            if (folderId === 'recent' || folderId === 'all' || !folderId) {
                return this.getNotes(userId);
            } else {
                return this.getNotesByFolder(folderId);
            }
        };

        fetchNotes().then(onData).catch(console.error);

        // Set up realtime subscription
        const channelName = `notes:${userId}:${folderId || 'all'}`;

        const existingChannel = this.channels.get(channelName);
        if (existingChannel) {
            supabase.removeChannel(existingChannel);
        }

        let filter = `user_id=eq.${userId}`;
        if (folderId && folderId !== 'recent' && folderId !== 'all') {
            filter = `folder_id=eq.${folderId}`;
        }

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notes',
                    filter,
                },
                () => {
                    fetchNotes().then(onData).catch(console.error);
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
    // RECORDINGS
    // =====================================================

    async saveRecording(userId: string, recordingData: {
        noteId?: string;
        noteTitle?: string;
        audioUrl?: string;
        transcript: string;
        duration: number;
    }): Promise<string> {
        const { data, error } = await supabase
            .from('recordings')
            .insert({
                user_id: userId,
                note_id: recordingData.noteId || null,
                note_title: recordingData.noteTitle || 'Untitled Recording',
                audio_url: recordingData.audioUrl || null,
                transcript: recordingData.transcript,
                duration: recordingData.duration,
            })
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    }

    async getRecordings(userId: string): Promise<Recording[]> {
        const { data, error } = await supabase
            .from('recordings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(toRecording);
    }

    subscribeRecordings(userId: string, onData: (recordings: Recording[]) => void): () => void {
        this.getRecordings(userId).then(onData).catch(console.error);

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
                    this.getRecordings(userId).then(onData).catch(console.error);
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
        const { error } = await supabase
            .from('recordings')
            .delete()
            .eq('id', recordingId);

        if (error) throw error;
    }

    async updateRecording(recordingId: string, data: Partial<Recording>): Promise<void> {
        const updateData: any = {};

        if (data.noteTitle !== undefined) updateData.note_title = data.noteTitle;
        if (data.transcript !== undefined) updateData.transcript = data.transcript;
        if (data.audioUrl !== undefined) updateData.audio_url = data.audioUrl;

        const { error } = await supabase
            .from('recordings')
            .update(updateData)
            .eq('id', recordingId);

        if (error) throw error;
    }

    // =====================================================
    // STORAGE (for images)
    // =====================================================

    async uploadImage(userId: string, file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    async uploadAudio(userId: string, blob: Blob, filename: string): Promise<string> {
        const filePath = `${userId}/${filename}`;

        const { error: uploadError } = await supabase.storage
            .from('recordings')
            .upload(filePath, blob);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('recordings')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
}

export default new SupabaseService();
