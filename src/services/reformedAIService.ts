/**
 * Reformed AI Service
 * An evangelical reformed AI assistant for theological discussions
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile'; // Using currently available large model for theological depth

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    references?: BibleReference[];
}

export interface BibleReference {
    verse: string;
    text: string;
    relevance: string;
}

export interface WordDefinition {
    word: string;
    original: string;
    transliteration: string;
    definition: string;
    theologicalSignificance: string;
    relatedVerses: string[];
}

const REFORMED_SYSTEM_PROMPT = `You are a Reformed evangelical Christian AI assistant, deeply rooted in the historic Reformed tradition. Your theological framework is based on:

**Core Beliefs:**
1. **Sola Scriptura** - Scripture alone is the ultimate authority for faith and practice
2. **Sola Fide** - Justification by faith alone
3. **Sola Gratia** - Salvation by grace alone
4. **Solus Christus** - Christ alone as mediator
5. **Soli Deo Gloria** - Glory to God alone

**Theological Distinctives:**
- You affirm the doctrines of grace (TULIP): Total Depravity, Unconditional Election, Limited Atonement, Irresistible Grace, Perseverance of the Saints
- You hold to Covenant Theology and see continuity between Old and New Testaments
- You believe in the sovereignty of God in all things, including salvation
- You affirm the Westminster Confession of Faith and the historic creeds (Apostles', Nicene, Chalcedonian)
- You believe in the inerrancy and infallibility of Scripture

**Approach:**
- Always ground your answers in Scripture with specific verse references
- Quote Reformed theologians when relevant (Calvin, Luther, Edwards, Spurgeon, Packer, Sproul, etc.)
- Be pastoral, warm, and gracious while maintaining doctrinal precision
- Acknowledge mystery where the Bible is not explicit
- Address both head and heart - theology should lead to worship and godly living
- When referencing Bible verses, format them clearly so they can be parsed

**Response Format:**
- Provide clear, well-structured answers
- Always include relevant Scripture references in parentheses (e.g., Romans 8:28, John 3:16)
- If applicable, mention the original Greek/Hebrew words with their meanings
- End complex theological discussions with practical application

Remember: Your goal is to help believers grow in their knowledge and love of God through His Word, always pointing them to Christ.`;

class ReformedAIService {
    private conversationHistory: ChatMessage[] = [];

    /**
     * Send a message to the Reformed AI and get a response
     * @param userMessage The user's question
     * @param noteContext Optional - the content of the current note for context-aware responses
     */
    async chat(userMessage: string, noteContext?: string): Promise<ChatMessage> {
        const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GROQ API Key');
        }

        // Add user message to history
        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        };
        this.conversationHistory.push(userMsg);

        // Build system prompt with optional note context
        let systemPrompt = REFORMED_SYSTEM_PROMPT;
        if (noteContext && noteContext.trim().length > 0) {
            systemPrompt += `\n\n**CURRENT NOTE CONTEXT:**
The user is currently working on a note/sermon. Here is the content:
---
${noteContext.substring(0, 4000)}
${noteContext.length > 4000 ? '\n...[content truncated]' : ''}
---

When the user asks about "my note," "this sermon," "my outline," or similar references, they are referring to the above content. 
You can analyze, suggest improvements, provide theological insights, suggest related Bible verses, and help with the content.`;
        }

        // Build messages array for API
        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory.slice(-10).map(m => ({
                role: m.role,
                content: m.content
            }))
        ];

        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages,
                    max_tokens: 2048,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Groq API Error:', response.status, errorText);
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            // Parse Bible references from the response
            const references = this.extractBibleReferences(content);

            const assistantMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content,
                timestamp: new Date(),
                references
            };

            this.conversationHistory.push(assistantMsg);
            return assistantMsg;

        } catch (error) {
            console.error('Reformed AI Error:', error);
            throw error;
        }
    }

    /**
     * Get definition of a theological term with Reformed perspective
     */
    async getWordDefinition(word: string): Promise<WordDefinition> {
        const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GROQ API Key');
        }

        const prompt = `As a Reformed theologian, provide a comprehensive definition of "${word}".
        
        Return a JSON object with:
        {
            "word": "${word}",
            "original": "Greek or Hebrew word if applicable",
            "transliteration": "phonetic pronunciation",
            "definition": "Clear definition in 2-3 sentences",
            "theologicalSignificance": "Why this concept matters in Reformed theology (2-3 sentences)",
            "relatedVerses": ["verse1", "verse2", "verse3"] (up to 5 key verses)
        }`;

        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error('Word definition error:', error);
            return {
                word,
                original: '',
                transliteration: '',
                definition: 'Definition unavailable',
                theologicalSignificance: '',
                relatedVerses: []
            };
        }
    }

    /**
     * Ask a specific theological question
     */
    async askTheologicalQuestion(question: string): Promise<{
        answer: string;
        scripturalBasis: string[];
        reformedTeaching: string;
        practicalApplication: string;
    }> {
        const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GROQ API Key');
        }

        const prompt = `${REFORMED_SYSTEM_PROMPT}

Question: ${question}

Provide a comprehensive answer in JSON format:
{
    "answer": "Main theological answer (3-5 sentences)",
    "scripturalBasis": ["John 3:16 - explanation", "Romans 8:28 - explanation"],
    "reformedTeaching": "What the Reformed tradition specifically teaches about this (2-3 sentences)",
    "practicalApplication": "How this applies to Christian life today (1-2 sentences)"
}`;

        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    max_tokens: 1024
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error('Theological question error:', error);
            throw error;
        }
    }

    /**
     * Extract Bible references from text
     */
    private extractBibleReferences(text: string): BibleReference[] {
        // Regex to match common Bible reference formats
        const regex = /(?:(?:1|2|3|I|II|III)\s*)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of (?:Solomon|Songs)|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d+(?::\d+(?:-\d+)?)?/gi;

        const matches = text.match(regex) || [];
        return [...new Set(matches)].slice(0, 10).map(verse => ({
            verse,
            text: '',
            relevance: ''
        }));
    }

    /**
     * Clear conversation history
     */
    clearHistory(): void {
        this.conversationHistory = [];
    }

    /**
     * Get conversation history
     */
    getHistory(): ChatMessage[] {
        return [...this.conversationHistory];
    }
}

const reformedAIService = new ReformedAIService();
export default reformedAIService;
