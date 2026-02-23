/**
 * Local Database using Dexie.js (IndexedDB)
 * 
 * This is the PRIMARY storage layer for Word Flow.
 * All data is saved here FIRST (instant, never fails),
 * then synced to Supabase in the background.
 * 
 * Benefits:
 * - Instant saves (0ms latency)
 * - Works offline
 * - Data never lost even if Supabase is down
 * - Survives page refreshes
 */

import Dexie, { type Table } from 'dexie';

// =====================================================
// LOCAL DB INTERFACES (mirrors supabaseService types)
// =====================================================

export interface LocalNote {
    id: string;
    userId: string;
    folderId: string | null;
    title: string;
    content: string;
    tabs: any[];
    floatingBoxes: any[];
    pageSettings: any;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    pendingSync: number; // 0 = synced, 1 = needs sync
    deleted: number;     // 0 = active, 1 = soft-deleted (pending sync)
}

export interface LocalFolder {
    id: string;
    userId: string;
    title: string;
    parentId: string | null;
    createdAt: string;
    pendingSync: number;
    deleted: number;
}

export interface LocalRecording {
    id: string;
    userId: string;
    noteId: string | null;
    noteTitle: string;
    audioUrl: string | null;
    transcript: string;
    duration: number;
    createdAt: string;
    pendingSync: number;
    deleted: number;
}

export interface LocalAudioBlob {
    id: string;       // Same as recording ID
    blob: Blob;       // The actual audio data
    mimeType: string;
    size: number;     // bytes
    createdAt: string;
}

// =====================================================
// DEXIE DATABASE
// =====================================================

class WordFlowDB extends Dexie {
    notes!: Table<LocalNote>;
    folders!: Table<LocalFolder>;
    recordings!: Table<LocalRecording>;
    audioBlobs!: Table<LocalAudioBlob>;

    constructor() {
        super('wordflow-local');
        this.version(1).stores({
            notes: 'id, userId, folderId, updatedAt, pendingSync, deleted',
            folders: 'id, userId, pendingSync, deleted',
            recordings: 'id, userId, noteId, pendingSync, deleted',
        });
        // v2: Add audioBlobs table for local audio storage
        this.version(2).stores({
            notes: 'id, userId, folderId, updatedAt, pendingSync, deleted',
            folders: 'id, userId, pendingSync, deleted',
            recordings: 'id, userId, noteId, pendingSync, deleted',
            audioBlobs: 'id, createdAt',
        });
        // v3: Add parentId to folders for sub-folder support
        this.version(3).stores({
            notes: 'id, userId, folderId, updatedAt, pendingSync, deleted',
            folders: 'id, userId, parentId, pendingSync, deleted',
            recordings: 'id, userId, noteId, pendingSync, deleted',
            audioBlobs: 'id, createdAt',
        }).upgrade(tx => {
            // Set parentId to null for all existing folders
            return tx.table('folders').toCollection().modify(folder => {
                if (folder.parentId === undefined) {
                    folder.parentId = null;
                }
            });
        });
    }
}

export const localDb = new WordFlowDB();

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/** Convert a Date or string to ISO string */
function toISOString(date?: Date | string | null): string {
    if (!date) return new Date().toISOString();
    if (date instanceof Date) return date.toISOString();
    return date;
}

// =====================================================
// NOTES - Local Operations
// =====================================================

export async function localSaveNote(note: {
    id: string;
    userId: string;
    folderId?: string | null;
    title: string;
    content: string;
    tabs?: any[];
    floatingBoxes?: any[];
    pageSettings?: any;
    tags?: string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
}): Promise<void> {
    const now = new Date().toISOString();
    await localDb.notes.put({
        id: note.id,
        userId: note.userId,
        folderId: note.folderId ?? null,
        title: note.title,
        content: note.content,
        tabs: note.tabs || [],
        floatingBoxes: note.floatingBoxes || [],
        pageSettings: note.pageSettings || { orientation: 'portrait', marginSize: 'normal' },
        tags: note.tags || [],
        createdAt: toISOString(note.createdAt) || now,
        updatedAt: now,
        pendingSync: 1,
        deleted: 0,
    });
}

export async function localGetNotes(userId: string): Promise<LocalNote[]> {
    return localDb.notes
        .where('userId')
        .equals(userId)
        .filter(n => n.deleted === 0)
        .reverse()
        .sortBy('updatedAt');
}

export async function localGetNotesByFolder(userId: string, folderId: string): Promise<LocalNote[]> {
    return localDb.notes
        .where('[userId+folderId]')
        .equals([userId, folderId])
        .filter(n => n.deleted === 0)
        .reverse()
        .sortBy('updatedAt');
}

export async function localGetNote(noteId: string): Promise<LocalNote | undefined> {
    return localDb.notes.get(noteId);
}

export async function localDeleteNote(noteId: string): Promise<void> {
    // Soft delete - mark for sync
    await localDb.notes.update(noteId, {
        deleted: 1,
        pendingSync: 1,
        updatedAt: new Date().toISOString(),
    });
}

// =====================================================
// FOLDERS - Local Operations
// =====================================================

export async function localSaveFolder(folder: {
    id: string;
    userId: string;
    title: string;
    parentId?: string | null;
    createdAt?: Date | string;
}): Promise<void> {
    await localDb.folders.put({
        id: folder.id,
        userId: folder.userId,
        title: folder.title,
        parentId: folder.parentId ?? null,
        createdAt: toISOString(folder.createdAt),
        pendingSync: 1,
        deleted: 0,
    });
}

export async function localGetFolders(userId: string): Promise<LocalFolder[]> {
    return localDb.folders
        .where('userId')
        .equals(userId)
        .filter(f => f.deleted === 0)
        .toArray();
}

export async function localUpdateFolder(folderId: string, data: { title?: string }): Promise<void> {
    await localDb.folders.update(folderId, {
        ...data,
        pendingSync: 1,
    });
}

export async function localDeleteFolder(folderId: string): Promise<void> {
    await localDb.folders.update(folderId, {
        deleted: 1,
        pendingSync: 1,
    });
}

// =====================================================
// RECORDINGS - Local Operations
// =====================================================

export async function localSaveRecording(recording: {
    id: string;
    userId: string;
    noteId?: string | null;
    noteTitle?: string;
    audioUrl?: string | null;
    transcript: string;
    duration: number;
    createdAt?: Date | string;
}): Promise<void> {
    await localDb.recordings.put({
        id: recording.id,
        userId: recording.userId,
        noteId: recording.noteId ?? null,
        noteTitle: recording.noteTitle || 'Untitled Recording',
        audioUrl: recording.audioUrl ?? null,
        transcript: recording.transcript,
        duration: recording.duration,
        createdAt: toISOString(recording.createdAt),
        pendingSync: 1,
        deleted: 0,
    });
}

export async function localGetRecordings(userId: string): Promise<LocalRecording[]> {
    return localDb.recordings
        .where('userId')
        .equals(userId)
        .filter(r => r.deleted === 0)
        .reverse()
        .sortBy('createdAt');
}

export async function localDeleteRecording(recordingId: string): Promise<void> {
    await localDb.recordings.update(recordingId, {
        deleted: 1,
        pendingSync: 1,
    });
}

export async function localUpdateRecording(recordingId: string, data: Partial<LocalRecording>): Promise<void> {
    await localDb.recordings.update(recordingId, {
        ...data,
        pendingSync: 1,
    });
}

// =====================================================
// BULK IMPORT (from Supabase -> Local)
// =====================================================

export async function localBulkImportNotes(notes: LocalNote[]): Promise<void> {
    await localDb.notes.bulkPut(notes);
}

export async function localBulkImportFolders(folders: LocalFolder[]): Promise<void> {
    await localDb.folders.bulkPut(folders);
}

export async function localBulkImportRecordings(recordings: LocalRecording[]): Promise<void> {
    await localDb.recordings.bulkPut(recordings);
}

// =====================================================
// PENDING SYNC QUERIES
// =====================================================

export async function getPendingNotes(): Promise<LocalNote[]> {
    return localDb.notes.where('pendingSync').equals(1).toArray();
}

export async function getPendingFolders(): Promise<LocalFolder[]> {
    return localDb.folders.where('pendingSync').equals(1).toArray();
}

export async function getPendingRecordings(): Promise<LocalRecording[]> {
    return localDb.recordings.where('pendingSync').equals(1).toArray();
}

export async function markNoteSynced(noteId: string): Promise<void> {
    await localDb.notes.update(noteId, { pendingSync: 0 });
}

export async function markFolderSynced(folderId: string): Promise<void> {
    await localDb.folders.update(folderId, { pendingSync: 0 });
}

export async function markRecordingSynced(recordingId: string): Promise<void> {
    await localDb.recordings.update(recordingId, { pendingSync: 0 });
}

/** Permanently remove soft-deleted items that have been synced */
export async function purgeDeleted(): Promise<void> {
    await localDb.notes.where({ deleted: 1, pendingSync: 0 }).delete();
    await localDb.folders.where({ deleted: 1, pendingSync: 0 }).delete();
    await localDb.recordings.where({ deleted: 1, pendingSync: 0 }).delete();
}

// =====================================================
// AUDIO BLOB STORAGE (local audio files in IndexedDB)
// =====================================================

/** Save an audio blob to local storage */
export async function localSaveAudioBlob(recordingId: string, blob: Blob): Promise<void> {
    await localDb.audioBlobs.put({
        id: recordingId,
        blob,
        mimeType: blob.type || 'audio/webm',
        size: blob.size,
        createdAt: new Date().toISOString(),
    });
    console.log(`💾 Audio blob saved locally: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
}

/** Get an audio blob from local storage */
export async function localGetAudioBlob(recordingId: string): Promise<Blob | null> {
    const entry = await localDb.audioBlobs.get(recordingId);
    return entry?.blob ?? null;
}

/** Delete an audio blob from local storage */
export async function localDeleteAudioBlob(recordingId: string): Promise<void> {
    await localDb.audioBlobs.delete(recordingId);
}

/** Get a playable URL for a locally stored audio blob */
export async function localGetAudioUrl(recordingId: string): Promise<string | null> {
    const blob = await localGetAudioBlob(recordingId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
}
