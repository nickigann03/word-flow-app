import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    getDocs,
    serverTimestamp,
    getDoc,
    setDoc
} from 'firebase/firestore';

export interface Note {
    id?: string;
    userId: string;
    folderId: string | null;
    title: string;
    content: string;
    tags: string[];
    createdAt?: any;
    updatedAt?: any;
}

export interface Folder {
    id?: string;
    userId: string;
    title: string;
    createdAt?: any;
}

class FirestoreService {
    // --- Folders ---
    getNewFolderId() {
        return doc(collection(db, 'folders')).id;
    }

    async createFolder(userId: string, folderData: { title: string }, customId?: string) {
        if (customId) {
            await setDoc(doc(db, 'folders', customId), {
                userId,
                title: folderData.title,
                createdAt: serverTimestamp()
            });
            return customId;
        } else {
            const docRef = await addDoc(collection(db, 'folders'), {
                userId,
                title: folderData.title,
                createdAt: serverTimestamp()
            });
            return docRef.id;
        }
    }

    async getFolders(userId: string) {
        const q = query(
            collection(db, 'folders'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Folder));
    }

    async updateFolder(folderId: string, data: any) {
        const docRef = doc(db, 'folders', folderId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    }

    async deleteFolder(folderId: string) {
        // Note: This does not delete sub-notes automatically in standard client SDK
        // You'd usually handle this via Cloud Functions or client-side batch
        await deleteDoc(doc(db, 'folders', folderId));
    }

    // --- Notes ---
    async createNote(userId: string, noteData: Partial<Note>) {
        const docRef = await addDoc(collection(db, 'notes'), {
            ...noteData,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    }

    async getNotes(userId: string) {
        // Simplified query to avoid composite index issues initially
        const q = query(
            collection(db, 'notes'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
            // If this requires index, user will just click link
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
    }

    async getNotesByFolder(folderId: string) {
        const q = query(
            collection(db, 'notes'),
            where('folderId', '==', folderId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
    }

    async updateNote(noteId: string, data: any) {
        const docRef = doc(db, 'notes', noteId);
        // Verify existence to prevent "No document to update" errors if deleted
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            console.warn(`Attempted to update non-existent note: ${noteId}`);
            return;
        }
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    }

    async deleteNote(noteId: string) {
        await deleteDoc(doc(db, 'notes', noteId));
    }
}

export default new FirestoreService();
