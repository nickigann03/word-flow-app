/**
 * =====================================================
 * FIREBASE TO SUPABASE DATA MIGRATION SCRIPT
 * =====================================================
 * 
 * This script migrates all your existing data from Firebase to Supabase:
 * - Folders
 * - Notes (with tabs, floating boxes, page settings)
 * - Recordings
 * 
 * HOW TO RUN:
 * 1. First, run the supabase-schema.sql in your Supabase SQL Editor
 * 2. Make sure both Firebase and Supabase env variables are set
 * 3. Run: npx tsx src/scripts/migrateToSupabase.ts
 * 
 * =====================================================
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// =====================================================
// CONFIGURATION - Hardcoded for reliable migration
// =====================================================

const firebaseConfig = {
    apiKey: 'AIzaSyCF0O5Ib8BMrR8r1cWPpY4WJqaiQK3f8iY',
    authDomain: 'sermon-recording-b79d4.firebaseapp.com',
    projectId: 'sermon-recording-b79d4',
    storageBucket: 'sermon-recording-b79d4.firebasestorage.app',
    messagingSenderId: '642799300613',
    appId: '1:642799300613:web:059e8b0858f382fac1ec6c'
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qrbhhtufpdgabmfenzyu.supabase.co';
// Using service_role key for migration to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY';

// =====================================================
// INITIALIZE CLIENTS
// =====================================================

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =====================================================
// MIGRATION FUNCTIONS
// =====================================================

interface MigrationStats {
    folders: { success: number; failed: number };
    notes: { success: number; failed: number };
    recordings: { success: number; failed: number };
}

const stats: MigrationStats = {
    folders: { success: 0, failed: 0 },
    notes: { success: 0, failed: 0 },
    recordings: { success: 0, failed: 0 },
};

// Map Firebase UIDs to Supabase UUIDs (you'll need to handle this)
const userIdMap = new Map<string, string>();

async function migrateFolders() {
    console.log('\n📁 Migrating Folders...');

    try {
        const foldersRef = collection(firestore, 'folders');
        const q = query(foldersRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        console.log(`   Found ${snapshot.docs.length} folders`);

        for (const doc of snapshot.docs) {
            const data = doc.data();

            try {
                const { error } = await supabase.from('folders').upsert({
                    id: doc.id,
                    user_id: data.userId, // This assumes user already exists in Supabase
                    title: data.title,
                    created_at: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                });

                if (error) throw error;

                stats.folders.success++;
                console.log(`   ✅ Folder: ${data.title}`);
            } catch (e) {
                stats.folders.failed++;
                console.error(`   ❌ Failed folder ${data.title}:`, (e as Error).message);
            }
        }
    } catch (e) {
        console.error('Error fetching folders:', e);
    }
}

async function migrateNotes() {
    console.log('\n📝 Migrating Notes...');

    try {
        const notesRef = collection(firestore, 'notes');
        const q = query(notesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        console.log(`   Found ${snapshot.docs.length} notes`);

        for (const doc of snapshot.docs) {
            const data = doc.data();

            try {
                const { error } = await supabase.from('notes').upsert({
                    id: doc.id,
                    user_id: data.userId,
                    folder_id: data.folderId || null,
                    title: data.title || 'Untitled Note',
                    content: data.content || '',
                    tabs: data.tabs || [],
                    floating_boxes: data.floatingBoxes || [],
                    page_settings: data.pageSettings || { orientation: 'portrait', marginSize: 'normal' },
                    tags: data.tags || [],
                    created_at: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                    updated_at: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                });

                if (error) throw error;

                stats.notes.success++;
                console.log(`   ✅ Note: ${data.title || 'Untitled'}`);
            } catch (e) {
                stats.notes.failed++;
                console.error(`   ❌ Failed note ${data.title}:`, (e as Error).message);
            }
        }
    } catch (e) {
        console.error('Error fetching notes:', e);
    }
}

async function migrateRecordings() {
    console.log('\n🎙️ Migrating Recordings...');

    try {
        const recordingsRef = collection(firestore, 'recordings');
        const q = query(recordingsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        console.log(`   Found ${snapshot.docs.length} recordings`);

        for (const doc of snapshot.docs) {
            const data = doc.data();

            try {
                const { error } = await supabase.from('recordings').upsert({
                    id: doc.id,
                    user_id: data.userId,
                    note_id: data.noteId || null,
                    note_title: data.noteTitle || 'Untitled Recording',
                    audio_url: data.audioUrl || null,
                    transcript: data.transcript || '',
                    duration: data.duration || 0,
                    created_at: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                });

                if (error) throw error;

                stats.recordings.success++;
                console.log(`   ✅ Recording: ${data.noteTitle || 'Untitled'}`);
            } catch (e) {
                stats.recordings.failed++;
                console.error(`   ❌ Failed recording:`, (e as Error).message);
            }
        }
    } catch (e) {
        console.error('Error fetching recordings:', e);
    }
}

// =====================================================
// MAIN MIGRATION
// =====================================================

async function runMigration() {
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║     FIREBASE TO SUPABASE DATA MIGRATION               ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('\n🚀 Starting migration...\n');

    // Run migrations in order (folders first, then notes, then recordings)
    await migrateFolders();
    await migrateNotes();
    await migrateRecordings();

    // Print summary
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║                  MIGRATION SUMMARY                     ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log(`\n📁 Folders:    ${stats.folders.success} ✅  ${stats.folders.failed} ❌`);
    console.log(`📝 Notes:      ${stats.notes.success} ✅  ${stats.notes.failed} ❌`);
    console.log(`🎙️ Recordings: ${stats.recordings.success} ✅  ${stats.recordings.failed} ❌`);

    const totalSuccess = stats.folders.success + stats.notes.success + stats.recordings.success;
    const totalFailed = stats.folders.failed + stats.notes.failed + stats.recordings.failed;

    console.log(`\n📊 Total: ${totalSuccess} successful, ${totalFailed} failed`);

    if (totalFailed === 0) {
        console.log('\n🎉 Migration completed successfully!');
    } else {
        console.log('\n⚠️ Migration completed with some errors. Check the logs above.');
    }
}

// Run the migration
runMigration().catch(console.error);
