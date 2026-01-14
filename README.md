# WordFlow - AI Theological Editor

WordFlow is a powerfully simple, Notion-style editor designed specifically for theologians, pastors, and serious Bible students. It combines a distraction-free writing environment with advanced AI exegesis tools, live transcription, and seamless Bible integration.

![WordFlow Screenshot](public/screenshot.png)

## ✨ Key Features

### 📝 Advanced Rich Text Editor
*   **Distraction-Free UI**: Clean, minimalist dark interface using the **Outfit** font
*   **Collapsible Sidebar**: Toggle between full and icon-only views to maximize workspace
*   **Notion-Style Editing**: 
    *   **Slash Commands** (`/`) - Quick insert headings, lists, tables, code blocks, callouts, dividers
    *   **Tables** - Full table support with add/delete rows & columns
    *   **Task Lists** - Interactive checkboxes with strikethrough
    *   **Toggle Blocks** - Collapsible content sections
    *   **Callouts** - Info, Warning, Success, Error styled boxes
    *   **Code Blocks** - Syntax highlighted code with lowlight
*   **Text Formatting**:
    *   Font sizes (S, M, L, XL) and colors
    *   Text alignment (Left, Center, Right, **Justify**)
    *   Subscript/Superscript for footnotes
    *   Tab indentation for paragraphs and lists
*   **Exegesis Tools**:
    *   **Comments**: Add inline comments (blue highlight)
    *   **Circle Words**: Mark key theological terms (red circle)
    *   **Highlight**: Standard yellow highlighting

### 🧠 AI & Exegesis Integration
*   **Theological Definitions**: Select any word → Click **"Exegete"** → Get instant theological definition with relevant Bible verse
*   **Bible Verse Hover**: Type references like `John 3:16` or `Gen 1:1` → Hover to see full text → Click **"Insert"** to add as blockquote
*   **AI Analysis**: Click **"Analyze Note"** to generate AI-powered summary and key takeaways
*   **Toast Notifications**: Modern popup notifications for all status updates (loading, success, error)

### 📖 Bible Reader (Split Screen)
*   **Integrated Bible Panel**: Open alongside your notes for seamless study
*   **Multiple Translations**: ESV, NIV, NLT, NASB, NKJV, KJV, WEB, ASV, BBE, DARBY, YLT
*   **Smart Book Search**: Type to filter books instantly (e.g., type "Titus" to find it)
*   **Easy Navigation**: Browse by book/chapter with quick arrows
*   **Word Meaning Lookup**: Click any word for Greek/Hebrew origin and meaning
*   **Verse Insertion**: One-click insert verses as formatted blockquotes
*   **AI-Powered Search**: Search for verses by topic or keyword

### 💬 Reformed AI Chat Agent
*   **Theological AI Assistant**: Chat with an evangelical Reformed AI assistant
*   **Note Context Awareness**: AI can read and analyze your current note content
    *   Shows "Note Context Active" when viewing a note
    *   Ask questions like "What are the main themes in my sermon?"
*   **Scripture-Based Answers**: All responses grounded in Scripture with verse references
*   **Reformed Tradition**: 5 Solas, TULIP, Covenant Theology perspective
*   **Word Definitions**: Double-click words for theological definitions
*   **Clickable Verses**: Bible references can be inserted into notes

### 🎙️ Sermon Recording & Transcription
*   **Full Sermon Recording**: Record entire sermons with one click
*   **Whisper Transcription**: Audio transcribed using Groq's Whisper API
*   **Automatic Formatting**: Transcript inserted with timestamp and duration
*   **AI Summary**: Long transcripts automatically receive AI-generated summaries
*   **Transcript Import**: Paste YouTube summaries or transcripts for AI formatting

### 📂 Organization & Sync
*   **Cloud Sync**: Auto-save to Firebase Firestore
*   **Folders**: Organize notes into custom folders
*   **Images**: Paste images (Ctrl+V) → Automatic Firebase Storage upload
*   **Export**: Export notes to **PDF** or **Markdown**

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   Firebase Project (Firestore, Auth, Storage enabled)
*   Groq API Key

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/nickigann03/word-flow-app.git
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
*   **Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS v4
*   **Editor**: Tiptap (ProseMirror wrapper) with custom extensions
*   **Backend**: Firebase (Firestore, Auth, Storage)
*   **AI**: Groq (LLaMA 3.3 70B for chat, Whisper for transcription)
*   **Bible APIs**: bible-api.com, ESV API, API.Bible

## 📱 UI Components
*   **Toast Notifications**: Modern popup system for status updates
*   **Collapsible Sidebar**: Maximize workspace with icon-only mode
*   **Expandable Panels**: Bible Reader and AI Chat can be expanded
*   **Floating Menus**: Bubble menu for text formatting, floating menu for blocks

## 🔧 Troubleshooting

### Firebase Storage CORS Issues
If you're getting CORS errors when uploading images or audio recordings, you need to configure CORS for your Firebase Storage bucket:

**Option 1: Use the helper script (Windows)**
1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Open terminal and run: `gcloud auth login`
3. Double-click `fix-cors.bat` and enter your Firebase Project ID

**Option 2: Manual gsutil command**
```bash
# Login to Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Apply CORS configuration
gsutil cors set cors.json gs://YOUR_PROJECT_ID.appspot.com

# Verify it worked
gsutil cors get gs://YOUR_PROJECT_ID.appspot.com
```

**Option 3: Firebase Console**
1. Go to [Google Cloud Console](https://console.cloud.google.com/storage/browser)
2. Select your storage bucket
3. Go to "Permissions" → "CORS configuration"
4. Paste the contents of `cors.json`

### Sermon Recording Issues
If transcription fails after recording:
- ✅ **Your audio is automatically downloaded** to your Downloads folder
- ✅ The recording is also saved to Firebase Storage (if CORS is configured)
- You can manually transcribe using [otter.ai](https://otter.ai), [Riverside.fm](https://riverside.fm), or Google Docs Voice Typing

### Missing API Keys
Check your `.env.local` or Vercel Environment Variables:
- `NEXT_PUBLIC_GROQ_API_KEY` - Required for transcription and AI features
- `NEXT_PUBLIC_FIREBASE_*` - Required for authentication and data storage

## 📄 License
MIT

