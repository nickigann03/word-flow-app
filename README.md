# WordFlow - Intelligent Sermon Preparation Workspace

WordFlow is a specialized writing and study environment designed for efficient sermon preparation. It combines a distraction-free editor with powerful AI tools grounded in Reformed theology.

## 🚀 Features

### ✍️ Advanced Editor
- **Rich Text & Slash Commands**: Format effortlessly with Notion-style commands (`/`).
- **Drag & Drop Images**: Paste or drop images directly into your notes.
- **Floating Annotations**: Add sticky-note style text boxes anywhere on the canvas.
- **Multi-Tab Notes**: Organize sermon points into separate internal tabs.

### 🧠 Reformed AI Assistant
- **Theological Partner**: Chat with an AI assistant trained on historic Reformed confessions and systematic theology.
- **Two Modes**:
  - **Direct Teaching**: Get clear, biblically grounded answers.
  - **Socratic Guide**: The AI asks leading questions to help you deepen your own understanding.

### 🎙️ Audio & Transcription
- **Integrated Recorder**: Record sermon rehearsals or voice notes directly in the app.
- **High-Fidelity Transcription**: Powered by **Groq Whisper**, generating accurate text from your voice in seconds.
- **Cloud Sync**: Audio and transcripts are safely stored in the cloud.

### 📖 Bible Integration
- **Auto-Verse**: Type a reference (e.g., "John 3:16") to see the text instantly.
- **Deep-Dive Dictionary**: Click or hover over any word in the Bible Reader (ESV, KJV, etc.) to see its Definition, Greek/Hebrew original, and theological meaning.
- **Manuscript Mode**: Generate a specially formatted, line-spaced manuscript for preaching directly from a Bible passage.
- **Full Chapter Import**: Import entire chapters for exegesis.

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: Groq API (Llama 3 & Whisper V3)
- **Editor**: Tiptap

## 📦 Installation & Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/nickigann03/word-flow-app.git
   cd word-flow-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with the following keys:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   NEXT_PUBLIC_GROQ_API_KEY=your_groq_key
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 🔒 Privacy & Security
WordFlow uses Supabase Authentication and Row Level Security (RLS) to ensure your notes and recordings are private and accessible only by you.

## 🤝 Contributing
Open to contributions! Please fork the repo and submit a PR for any features or fixes.
