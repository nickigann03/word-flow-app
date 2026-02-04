# WordFlow App - Technical Documentation

## 1. System Architecture

WordFlow is a modern Next.js 14 application built for sermon preparation and theological study. It leverages a serverless architecture with Supabase for backend services and Groq for high-performance AI inference.

### High-Level Architecture
- **Frontend**: Next.js 14 (App Router), React, TailwindCSS, Framer Motion
- **Backend & Database**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **AI Services**: Groq API (Llama 3 for text, Whisper-large-v3 for audio)
- **Deployment**: Vercel

---

## 2. Core Modules

### A. Authentication & User Management
- **Provider**: Supabase Auth (Google OAuth + Email/Password)
- **Context**: `SupabaseAuthContext.tsx` handles session state and profile creation.
- **Security**: Row Level Security (RLS) policies ensure users isolate their data.

### B. Note Editor (The Core)
- **Engine**: Tiptap Editor (Headless wrapper around Prosemirror)
- **Features**:
  - **Slash Commands**: Notion-style menu for rapid formatting.
  - **Layout Persistence**: Page orientation (Portrait/Landscape) and margins (Narrow/Wide) are saved per-note in local storage for a consistent experience.
  - **Bible Integration**: Auto-fetch passages via `bibleService`. The "Interactive Reader" mode splits text into individual words to enable AI-powered dictionary lookup on hover/click.
  - **Reformed AI Chat**: Side-panel assistant with "Direct Teaching" and "Socratic Mode".
  - **Tabs**: Internal tabs within a single note for multi-page sermon outlines.
  - **Floating Elements**: Draggable text boxes for annotations.

### C. Audio & Transcription
- **Recording**: Browser `MediaRecorder` API (WebM/Opus).
- **Storage**: Audio blobs uploaded to Supabase Storage (`recordings` bucket).
- **Transcription**: 
  - **Chunking**: Large files are split into ~20MB chunks to bypass Groq API limits.
  - **Anti-Hallucination**: Custom logic cleans repetition and common Whisper hallucinations (e.g., "Thanks for watching").
  - **Model**: Groq `whisper-large-v3`.

### D. Reformed AI Assistant
- **Modes**:
  - **Direct Explanation**: Standard QA mode.
  - **Socratic Mode**: Asks leading questions to guide user discovery.
- **System Prompts**: 
  - Enforces Reformed theology (TULIP, Covenant Theology).
  - References historic confessions (Westminster, etc.).

---

## 3. Database Schema (Supabase)

### Tables
- `profiles`: User preferences and metadata.
- `folders`: Organizational units for notes.
- `notes`: Main content table (JSON/HTML content).
- `recordings`: Metadata for audio files (duration, transcript links).

### RLS Policies
All tables enforce strict ownership checks:
```sql
create policy "Users can only view their own notes"
on notes for select
using (auth.uid() = user_id);
```

---

## 4. Key Services (`/src/services`)

- `supabaseService.ts`: CRUD wrapper for database and storage. Includes **local caching fallback** for offline mode.
- `groqService.ts`: Interface for LLM chat and text generation.
- `audioRecorderService.ts`: Manages microphone stream, blob creation, and chunked transcription logic.
- `bibleService.ts`: Fetches Bible text and provides AI-powered word definitions.

---

## 5. Offline Mode & Resilience

### Authentication Caching
- On successful login, the user session is cached to `localStorage`.
- If the Supabase Auth service is unavailable on next load, the app uses the cached session to grant access.

### Data Caching
- `getNotes`, `getFolders`, `getRecordings` methods cache their results to `localStorage` on every successful fetch.
- On network failure, the app falls back to the local cache, ensuring users can view their notes even offline.

### Guest/Demo Mode
- `loginAsGuest()` creates a local-only "Guest User" session.
- Guest data is stored in `localStorage` only and is not synced to the cloud.

---

## 6. Deployment Pipeline

1. **Commit**: Changes pushed to GitHub `main` branch.
2. **Build**: Vercel automatically builds the Next.js app.
3. **Environment**: 
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_GROQ_API_KEY`
4. **Production**: Deployed to `word-flow-app.vercel.app`.
