export interface Template {
    id: string;
    name: string;
    description: string;
    content: string;
}

// Get today's date formatted nicely
const getTodayFormatted = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return today.toLocaleDateString('en-US', options);
};

export const BASE_TEMPLATES: Template[] = [
    {
        id: 'blank',
        name: 'Blank Document',
        description: 'Start with a clean slate.',
        content: ''
    },
    {
        id: 'sermon-notes',
        name: 'Sermon Notes',
        description: 'Template for taking sermon notes with speaker, date, and questions.',
        content: `<h1>Sermon Notes</h1>

<p><strong>📅 Date:</strong> ${getTodayFormatted()}</p>
<p><strong>🎤 Speaker:</strong> [Pastor/Speaker Name]</p>
<p><strong>📖 Scripture:</strong> [Book Chapter:Verses]</p>

<hr>

<h2>📝 Sermon Content</h2>
<p><em>Main points and notes from the sermon...</em></p>

<ul>
<li></li>
<li></li>
<li></li>
</ul>

<hr>

<h2>❓ Questions I Have</h2>
<p><em>Questions that arise during the sermon...</em></p>

<ul>
<li></li>
<li></li>
</ul>

<hr>

<h2>💡 Personal Application</h2>
<p><em>How does this apply to my life?</em></p>

<p></p>
`
    },
    {
        id: 'expository',
        name: 'Expository Study',
        description: 'Verse-by-verse analysis and study.',
        content: `<p></p>`
    },
    {
        id: 'bible-study',
        name: 'Bible Study Notes',
        description: 'For personal or group Bible study sessions.',
        content: `<h1>Bible Study: [Book/Topic]</h1>

<p><strong>📅 Date:</strong> ${getTodayFormatted()}</p>
<p><strong>📖 Passage:</strong> [Book Chapter:Verses]</p>
<p><strong>👥 Group/Personal:</strong> [Study Type]</p>

<hr>

<h2>📖 Read the Passage</h2>
<p><em>Write out or summarize the passage...</em></p>

<p></p>

<h2>🔍 Observe</h2>
<p><em>What do you notice? Who, what, where, when, why, how?</em></p>

<ul>
<li></li>
<li></li>
</ul>

<h2>🧠 Interpret</h2>
<p><em>What does it mean? Historical context, key words, themes...</em></p>

<ul>
<li></li>
<li></li>
</ul>

<h2>💡 Apply</h2>
<p><em>How should I respond? What changes should I make?</em></p>

<ul>
<li></li>
</ul>

<h2>🙏 Prayer</h2>
<p><em>Response in prayer...</em></p>

<p></p>
`
    }
];

export const getAllTemplates = () => BASE_TEMPLATES;
