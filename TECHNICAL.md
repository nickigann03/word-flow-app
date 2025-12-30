# Technical Documentation

## Architecture Overview

Word Flow is a **Next.js 16 (App Router)** application built with a **Serverless** architecture using Firebase.

### System Diagram

```mermaid
graph TD
    Client[Next.js Client] -->|Auth State| Auth[Firebase Auth]
    Client -->|Sync Data| DB[Firestore]
    Client -->|Store Assets| Storage[Firebase Storage]

    subgraph "Editor Engine"
        Tiptap[Tiptap / ProseMirror]
        Extensions[Custom Extensions]
        State[Editor State JSON]
    end

    Client -- Contains --> Tiptap
    Tiptap -- Auto-Save (Debounced) --> DB
    Tiptap -- Paste Image --> Storage

    subgraph "AI Services"
        Groq[Groq API (Llama 3)]
        Gladia[Gladia API (Live Transcription)]
        Bible[Bible-API.com]
    end

    Tiptap -- "Analyze/Exegete" --> Groq
    Tiptap -- "Dictate (WebSocket)" --> Gladia
    Tiptap -- "Hover Reference" --> Bible
```

## Key Components

### 1. NoteEditor (`src/components/NoteEditor.tsx`)
The core of the application. It implements the Tiptap editor with custom configuration.
*   **State Management**: Uses local state for immediate feedback and `debounced` effects for auto-saving to Firestore.
*   **Extensions**:
    *   `StarterKit`: Basic formatting (Bold, Italic, Lists).
    *   `BubbleMenu` / `FloatingMenu`: Contextual toolbars.
    *   `BibleReferenceExtension`: Custom regex-based extension to detect `Book Chapter:Verse` patterns.
    *   `CommentMark`, `CircleMark`: Custom ProseMirror marks for exegesis.
    *   `FontSize`: Custom extension for text sizing.
*   **Image Handling**: Intercepts `paste` events to upload file blobs to Firebase Storage, ensuring scalable data storage.

### 2. Services
*   **FirestoreService (`src/services/firestoreService.ts`)**: Handles all CRUD operations for `notes` and `folders`.
*   **GroqService (`src/services/groqService.ts`)**: Interface for AI operations. Contains prompts for "Theological Definition" and "Sermon Summarization".
*   **GladiaService (`src/services/gladiaService.ts`)**: Manages the WebSocket connection for live speech-to-text.

### 3. Data Model

**Notes Collection (`notes`)**
```json
{
  "id": "uuid",
  "userId": "uid",
  "folderId": "uuid | null",
  "title": "string",
  "content": "HTML string (Tiptap output)",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**Folders Collection (`folders`)**
```json
{
  "id": "uuid",
  "userId": "uid",
  "title": "string",
  "createdAt": "timestamp"
}
```

## Custom Extensions Deep Dive

### Bible Reference Extension
Located in `src/components/BibleReference.ts`.
1.  **Regex Matching**: Scans document text nodes for patterns like `John 3:16`.
2.  **Decoration**: Wraps matches in a `span.bible-reference` decoration (does not change document schema).
3.  **Interaction**: `NoteEditor` defines an `onHover` handler that fetches verse text from `bible-api.com` and displays a sticky popover.

### Comments & Circling
Located in `src/components/EditorExtensions.ts`.
*   **CommentMark**: Wraps text in a `span` with a `data-comment` attribute. Styles are applied via `globals.css` (`.comment-mark`).
*   **CircleMark**: Wraps text in a `span.circle-mark` which has a `border-radius: 9999px` to simulate a hand-drawn circle.

## Security & Deployment
*   **Environment Variables**: All API keys are stored in `.env.local` and prefixed with `NEXT_PUBLIC_` for client-side access.
*   **Firebase Rules**: (Recommended)
    ```
    match /notes/{noteId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    ```
