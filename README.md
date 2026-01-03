# Word Flow - AI Theological Editor

Word Flow is a powerfully simple, Notion-style editor designed specifically for theologians, pastors, and serious bible students. It combines a distraction-free writing environment with advanced AI exegesis tools, live transcription, and seamless Bible integration.

![Word Flow Screenshot](public/screenshot.png) *(Placeholder)*

## ✨ Key Features

### 📝 Advanced Rich Text Editor
*   **Distraction-Free UI**: Clean, minimalist interface using the **Outfit** font for optimal readability.
*   **Notion-Style Formatting**: Supports H1, H2, Lists, Blockquotes, and more via a floating menu.
*   **Custom Fonts**: Adjust font sizes (S, M, L, XL) and colors (Red, Blue, Yellow) for emphasis.
*   **Exegesis Tools**:
    *   **Comments**: Highlight text to add inline comments (blue highlight).
    *   **Circle Words**: Mark key theological terms with a red circle.
    *   **Highlight**: Standard yellow highlighting.

### 🧠 AI & Exegesis Integration
*   **Theological Definitions**: Highlight any word -> Click **"Exegete"** -> Get instant theological definition and relevant Bible verse.
*   **Bible Verse Hover**: Type any reference (e.g., `John 3:16`, `Gen 1:1`). Hover over it to read the text instantly. Click **"Insert"** to add it to your notes.
*   **AI Analysis**: Click **"Analyze Note"** to generate a concise summary and key takeaways of your sermon/notes using Groq AI.

### 📖 Bible Reader (Split Screen)
*   **Integrated Bible Panel**: Click **"Bible Reader"** in the sidebar to open a split-screen Bible reader alongside your notes.
*   **Multiple Translations**: Choose from KJV, WEB, ASV, BBE, Darby, and YLT translations.
*   **Easy Navigation**: Browse by book and chapter with quick navigation arrows.
*   **Word Meaning Lookup**: Click any word to see its Greek/Hebrew origin and meaning.
*   **Verse Insertion**: Click "Insert" on any verse to add it as a blockquote in your notes.
*   **Smart Search**: Search for Bible verses by topic or keyword using AI-powered search.

### 💬 Reformed AI Chat Agent
*   **Theological AI Assistant**: Click **"Reformed AI"** in the sidebar to chat with an evangelical Reformed AI.
*   **Scripture-Based Answers**: All responses are grounded in Scripture with specific verse references.
*   **Reformed Tradition**: The AI is rooted in the historic Reformed tradition (5 Solas, TULIP, Covenant Theology).
*   **Word Definitions**: Double-click any word in the chat to get its theological definition.
*   **Verse Linking**: Bible references in responses are clickable and can be inserted into your notes.
*   **Quick Questions**: Pre-made theological questions to get you started.

### 🎙️ Sermon Recording & Transcription
*   **Full Sermon Recording**: Click **"Record Sermon"** to record an entire sermon locally.
*   **Whisper Transcription**: After recording, the audio is transcribed using Groq's Whisper API.
*   **Automatic Formatting**: The transcript is inserted as a formatted section in your notes with timestamp and duration.
*   **AI Summary**: Long transcripts automatically receive an AI-generated summary.
*   **Transcript Import**: Click the **Upload Icon** to paste a sermon transcript or YouTube summary for AI formatting.

### 📂 Organization & Sync
*   **Cloud Sync**: All notes are auto-saved to Firebase Firestore.
*   **Folders**: Organize notes into custom folders.
*   **Images**: Paste images directly (Ctrl+V) or insert via URL. Images are stored securely in Firebase Storage.
*   **Export**: Export your notes to **PDF** or **Markdown**.

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   Firebase Project (Firestore, Auth, Storage enabled)
*   Groq API Key

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/word-flow.git
    cd word-flow-app
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env.local` file in the root directory:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    
    NEXT_PUBLIC_GROQ_API_KEY=your_groq_key
    
    # Optional: For ESV, NIV, NLT, NASB, NKJV Bible versions
    NEXT_PUBLIC_ESV_API_KEY=your_esv_key          # Get free at https://api.esv.org
    NEXT_PUBLIC_API_BIBLE_KEY=your_api_bible_key  # Get free at https://scripture.api.bible
    ```

4.  **Run Locally**:
    ```bash
    npm run dev
    ```
    Visit `http://localhost:3000`.

## 🛠️ Tech Stack
*   **Framework**: Next.js 16 (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS v4
*   **Editor**: Tiptap (Headless ProseMirror wrapper)
*   **Backend**: Firebase (Firestore, Auth, Storage)
*   **AI**: Groq (LLaMA 3 70b), Gladia (Transcription)

## 📄 License
MIT
