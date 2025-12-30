# Word Flow - AI Theological Editor

Word Flow is a powerfully simple, Notion-style editor designed specifically for theologians, pastors, and serious bible students. It combines a distraction-free writing environment with advanced AI exegesis tools, live transcription, and seamless Bible integration.

![Word Flow Screenshot](public/screenshot.png) *(Placeholder)*

## ✨ Key Features

### 📝 Advanced Rich Text Editor
*   **Destraction-Free UI**: Clean, minimalist interface using the **Outfit** font for optimal readability.
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

### 🎙️ Live Transcription & Dictation
*   **Live Dictation**: Click **"Dictate"** to transcribe your voice in real-time (powered by Gladia).
*   **Transcript Import**: Click the **Upload Icon** to paste a sermon transcript or YouTube summary. The AI will automatically summarize and format it for you.

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
*   Gladia API Key

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
    
    NEXT_PUBLIC_GLADIA_API_KEY=your_gladia_key
    NEXT_PUBLIC_GROQ_API_KEY=your_groq_key
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
