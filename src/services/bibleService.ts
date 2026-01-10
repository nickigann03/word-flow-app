/**
 * Bible Service
 * Provides Bible verse lookup with multiple version support
 * Uses multiple APIs: bible-api.com (free/public domain) and API.Bible (for copyrighted versions)
 */

export interface BibleVerse {
    reference: string;
    text: string;
    translation: string;
    verses?: {
        book_name: string;
        chapter: number;
        verse: number;
        text: string;
    }[];
}

export interface BibleBook {
    id: string;
    name: string;
    chapters: number;
}

// Bible version configuration with API provider info
export interface BibleVersion {
    id: string;
    name: string;
    abbreviation: string;
    provider: 'bible-api' | 'api-bible' | 'esv-api';
    apiId?: string; // For API.Bible version IDs
}

// Supported Bible versions - organized by popularity
export const BIBLE_VERSIONS: BibleVersion[] = [
    // Most Popular (copyrighted - need API keys)
    { id: 'esv', name: 'English Standard Version', abbreviation: 'ESV', provider: 'esv-api' },
    { id: 'niv', name: 'New International Version', abbreviation: 'NIV', provider: 'api-bible', apiId: '78a9f6124f344018-01' },
    { id: 'nlt', name: 'New Living Translation', abbreviation: 'NLT', provider: 'api-bible', apiId: '65eec8e0b60e656b-01' },
    { id: 'nasb', name: 'New American Standard Bible', abbreviation: 'NASB', provider: 'api-bible', apiId: 'c315fa9f71d4af3a-01' },
    { id: 'nkjv', name: 'New King James Version', abbreviation: 'NKJV', provider: 'api-bible', apiId: 'de4e12af7f28f599-02' },
    // Public Domain (free, no API key needed)
    { id: 'kjv', name: 'King James Version', abbreviation: 'KJV', provider: 'bible-api' },
    { id: 'web', name: 'World English Bible', abbreviation: 'WEB', provider: 'bible-api' },
    { id: 'asv', name: 'American Standard Version', abbreviation: 'ASV', provider: 'bible-api' },
    { id: 'bbe', name: 'Bible in Basic English', abbreviation: 'BBE', provider: 'bible-api' },
    { id: 'darby', name: 'Darby Translation', abbreviation: 'DARBY', provider: 'bible-api' },
    { id: 'ylt', name: "Young's Literal Translation", abbreviation: 'YLT', provider: 'bible-api' },
];

export type BibleVersionId = string;

// Bible books for navigation
export const BIBLE_BOOKS: BibleBook[] = [
    // Old Testament
    { id: 'genesis', name: 'Genesis', chapters: 50 },
    { id: 'exodus', name: 'Exodus', chapters: 40 },
    { id: 'leviticus', name: 'Leviticus', chapters: 27 },
    { id: 'numbers', name: 'Numbers', chapters: 36 },
    { id: 'deuteronomy', name: 'Deuteronomy', chapters: 34 },
    { id: 'joshua', name: 'Joshua', chapters: 24 },
    { id: 'judges', name: 'Judges', chapters: 21 },
    { id: 'ruth', name: 'Ruth', chapters: 4 },
    { id: '1samuel', name: '1 Samuel', chapters: 31 },
    { id: '2samuel', name: '2 Samuel', chapters: 24 },
    { id: '1kings', name: '1 Kings', chapters: 22 },
    { id: '2kings', name: '2 Kings', chapters: 25 },
    { id: '1chronicles', name: '1 Chronicles', chapters: 29 },
    { id: '2chronicles', name: '2 Chronicles', chapters: 36 },
    { id: 'ezra', name: 'Ezra', chapters: 10 },
    { id: 'nehemiah', name: 'Nehemiah', chapters: 13 },
    { id: 'esther', name: 'Esther', chapters: 10 },
    { id: 'job', name: 'Job', chapters: 42 },
    { id: 'psalms', name: 'Psalms', chapters: 150 },
    { id: 'proverbs', name: 'Proverbs', chapters: 31 },
    { id: 'ecclesiastes', name: 'Ecclesiastes', chapters: 12 },
    { id: 'songofsolomon', name: 'Song of Solomon', chapters: 8 },
    { id: 'isaiah', name: 'Isaiah', chapters: 66 },
    { id: 'jeremiah', name: 'Jeremiah', chapters: 52 },
    { id: 'lamentations', name: 'Lamentations', chapters: 5 },
    { id: 'ezekiel', name: 'Ezekiel', chapters: 48 },
    { id: 'daniel', name: 'Daniel', chapters: 12 },
    { id: 'hosea', name: 'Hosea', chapters: 14 },
    { id: 'joel', name: 'Joel', chapters: 3 },
    { id: 'amos', name: 'Amos', chapters: 9 },
    { id: 'obadiah', name: 'Obadiah', chapters: 1 },
    { id: 'jonah', name: 'Jonah', chapters: 4 },
    { id: 'micah', name: 'Micah', chapters: 7 },
    { id: 'nahum', name: 'Nahum', chapters: 3 },
    { id: 'habakkuk', name: 'Habakkuk', chapters: 3 },
    { id: 'zephaniah', name: 'Zephaniah', chapters: 3 },
    { id: 'haggai', name: 'Haggai', chapters: 2 },
    { id: 'zechariah', name: 'Zechariah', chapters: 14 },
    { id: 'malachi', name: 'Malachi', chapters: 4 },
    // New Testament
    { id: 'matthew', name: 'Matthew', chapters: 28 },
    { id: 'mark', name: 'Mark', chapters: 16 },
    { id: 'luke', name: 'Luke', chapters: 24 },
    { id: 'john', name: 'John', chapters: 21 },
    { id: 'acts', name: 'Acts', chapters: 28 },
    { id: 'romans', name: 'Romans', chapters: 16 },
    { id: '1corinthians', name: '1 Corinthians', chapters: 16 },
    { id: '2corinthians', name: '2 Corinthians', chapters: 13 },
    { id: 'galatians', name: 'Galatians', chapters: 6 },
    { id: 'ephesians', name: 'Ephesians', chapters: 6 },
    { id: 'philippians', name: 'Philippians', chapters: 4 },
    { id: 'colossians', name: 'Colossians', chapters: 4 },
    { id: '1thessalonians', name: '1 Thessalonians', chapters: 5 },
    { id: '2thessalonians', name: '2 Thessalonians', chapters: 3 },
    { id: '1timothy', name: '1 Timothy', chapters: 6 },
    { id: '2timothy', name: '2 Timothy', chapters: 4 },
    { id: 'titus', name: 'Titus', chapters: 3 },
    { id: 'philemon', name: 'Philemon', chapters: 1 },
    { id: 'hebrews', name: 'Hebrews', chapters: 13 },
    { id: 'james', name: 'James', chapters: 5 },
    { id: '1peter', name: '1 Peter', chapters: 5 },
    { id: '2peter', name: '2 Peter', chapters: 3 },
    { id: '1john', name: '1 John', chapters: 5 },
    { id: '2john', name: '2 John', chapters: 1 },
    { id: '3john', name: '3 John', chapters: 1 },
    { id: 'jude', name: 'Jude', chapters: 1 },
    { id: 'revelation', name: 'Revelation', chapters: 22 },
];

class BibleService {
    private cache: Map<string, BibleVerse> = new Map();

    /**
     * Get version configuration
     */
    private getVersionConfig(versionId: string): BibleVersion {
        return BIBLE_VERSIONS.find(v => v.id === versionId) || BIBLE_VERSIONS.find(v => v.id === 'kjv')!;
    }

    /**
     * Fetch a Bible verse with specified translation
     */
    /**
     * Fetch a Bible verse with specified translation
     */
    async getVerse(reference: string, translation: BibleVersionId = 'esv'): Promise<BibleVerse> {
        const cacheKey = `${reference}:${translation}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const version = this.getVersionConfig(translation);

        try {
            let verse: BibleVerse;

            switch (version.provider) {
                case 'bible-api':
                    verse = await this.fetchFromBibleApi(reference, translation);
                    break;
                case 'api-bible':
                    verse = await this.fetchFromApiBible(reference, version);
                    break;
                case 'esv-api':
                    verse = await this.fetchFromEsvApi(reference);
                    break;
                default:
                    verse = await this.fetchFromBibleApi(reference, 'esv');
            }

            this.cache.set(cacheKey, verse);
            return verse;
        } catch (error) {
            console.error('Bible API Error:', error);
            // Fallback to KJV if the requested version fails
            if (translation !== 'kjv') {
                console.log('Falling back to KJV...');
                return this.fetchFromBibleApi(reference, 'kjv');
            }
            return {
                reference,
                text: 'Error loading verse. Please try again.',
                translation: translation.toUpperCase()
            };
        }
    }

    /**
     * Fetch from bible-api.com (free, public domain versions)
     */
    private async fetchFromBibleApi(reference: string, translation: string): Promise<BibleVerse> {
        const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=${translation}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`bible-api.com error: ${response.status}`);
        }

        const data = await response.json();
        return {
            reference: data.reference || reference,
            text: data.text || 'Verse not found',
            translation: translation.toUpperCase(),
            verses: data.verses
        };
    }

    /**
     * Fetch from API.Bible (for NIV, NLT, NASB, NKJV, etc.)
     * Requires NEXT_PUBLIC_API_BIBLE_KEY in .env.local
     */
    private async fetchFromApiBible(reference: string, version: BibleVersion): Promise<BibleVerse> {
        const apiKey = process.env.NEXT_PUBLIC_API_BIBLE_KEY;

        if (!apiKey) {
            console.warn(`API.Bible key not configured. Falling back to KJV for ${version.abbreviation}`);
            return this.fetchFromBibleApi(reference, 'kjv');
        }

        // Parse reference to API.Bible format (e.g., "John 3:16" -> "JHN.3.16")
        const bibleId = version.apiId;
        const passageId = this.convertToApiBibleFormat(reference);

        const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/passages/${passageId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`;

        const response = await fetch(url, {
            headers: {
                'api-key': apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`API.Bible error: ${response.status}`);
        }

        const data = await response.json();
        return {
            reference: data.data?.reference || reference,
            text: data.data?.content || 'Verse not found',
            translation: version.abbreviation
        };
    }

    /**
     * Fetch from ESV API (for ESV translation)
     * Requires NEXT_PUBLIC_ESV_API_KEY in .env.local
     */
    private async fetchFromEsvApi(reference: string): Promise<BibleVerse> {
        const apiKey = process.env.NEXT_PUBLIC_ESV_API_KEY;

        if (!apiKey) {
            console.warn('ESV API key not configured. Falling back to KJV');
            return this.fetchFromBibleApi(reference, 'kjv');
        }

        const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(reference)}&include-passage-references=true&include-verse-numbers=true&include-footnotes=false&include-headings=false`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Token ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`ESV API error: ${response.status}`);
        }

        const data = await response.json();
        const passages = data.passages || [];

        return {
            reference: data.query || reference,
            text: passages.join('\n\n') || 'Verse not found',
            translation: 'ESV'
        };
    }

    /**
     * Convert standard reference to API.Bible format
     * e.g., "John 3:16" -> "JHN.3.16", "Genesis 1:1-5" -> "GEN.1.1-GEN.1.5"
     */
    private convertToApiBibleFormat(reference: string): string {
        const bookMappings: Record<string, string> = {
            'genesis': 'GEN', 'exodus': 'EXO', 'leviticus': 'LEV', 'numbers': 'NUM',
            'deuteronomy': 'DEU', 'joshua': 'JOS', 'judges': 'JDG', 'ruth': 'RUT',
            '1 samuel': '1SA', '2 samuel': '2SA', '1 kings': '1KI', '2 kings': '2KI',
            '1 chronicles': '1CH', '2 chronicles': '2CH', 'ezra': 'EZR', 'nehemiah': 'NEH',
            'esther': 'EST', 'job': 'JOB', 'psalms': 'PSA', 'psalm': 'PSA', 'proverbs': 'PRO',
            'ecclesiastes': 'ECC', 'song of solomon': 'SNG', 'isaiah': 'ISA', 'jeremiah': 'JER',
            'lamentations': 'LAM', 'ezekiel': 'EZK', 'daniel': 'DAN', 'hosea': 'HOS',
            'joel': 'JOL', 'amos': 'AMO', 'obadiah': 'OBA', 'jonah': 'JON', 'micah': 'MIC',
            'nahum': 'NAM', 'habakkuk': 'HAB', 'zephaniah': 'ZEP', 'haggai': 'HAG',
            'zechariah': 'ZEC', 'malachi': 'MAL',
            'matthew': 'MAT', 'mark': 'MRK', 'luke': 'LUK', 'john': 'JHN', 'acts': 'ACT',
            'romans': 'ROM', '1 corinthians': '1CO', '2 corinthians': '2CO', 'galatians': 'GAL',
            'ephesians': 'EPH', 'philippians': 'PHP', 'colossians': 'COL',
            '1 thessalonians': '1TH', '2 thessalonians': '2TH', '1 timothy': '1TI', '2 timothy': '2TI',
            'titus': 'TIT', 'philemon': 'PHM', 'hebrews': 'HEB', 'james': 'JAS',
            '1 peter': '1PE', '2 peter': '2PE', '1 john': '1JN', '2 john': '2JN', '3 john': '3JN',
            'jude': 'JUD', 'revelation': 'REV'
        };

        // Parse reference like "John 3:16" or "Genesis 1:1-5" or "Numbers 1-36"
        // Updated regex to support Chapter-Chapter ranges
        const match = reference.match(/^(\d?\s?[a-zA-Z\s]+)\s+(\d+)(?:[:](\d+)(?:-(\d+))?|[-](\d+))?$/i);

        if (!match) return reference;

        const bookName = match[1].trim().toLowerCase();
        const startChapter = match[2];
        const startVerse = match[3];
        const endVerse = match[4];
        const endChapter = match[5]; // Captured Group 5 for Chapter range

        const bookCode = bookMappings[bookName] || bookName.substring(0, 3).toUpperCase();

        if (endChapter) {
            // Case: Numbers 1-36 -> NUM.1.1-NUM.36.100 (Approx format, API.Bible usually needs verse ranges for proper passage IDs, 
            // but for full chapters, we might need a different strategy.
            // API.Bible format for Chapters: JHN.1-JHN.21
            return `${bookCode}.${startChapter}-${bookCode}.${endChapter}`;
        } else if (startVerse && endVerse) {
            return `${bookCode}.${startChapter}.${startVerse}-${bookCode}.${startChapter}.${endVerse}`;
        } else if (startVerse) {
            return `${bookCode}.${startChapter}.${startVerse}`;
        } else {
            return `${bookCode}.${startChapter}`;
        }
    }

    /**
     * Fetch an entire chapter
     */
    async getChapter(book: string, chapter: number, translation: BibleVersionId = 'esv'): Promise<BibleVerse> {
        const reference = `${book} ${chapter}`;
        return this.getVerse(reference, translation);
    }

    /**
     * Fetch an entire book with formatted chapters
     * Returns HTML-formatted text with chapter headings and verse numbers
     */
    async getFullBook(bookName: string, translation: BibleVersionId = 'esv'): Promise<string> {
        const book = BIBLE_BOOKS.find(b =>
            b.name.toLowerCase() === bookName.toLowerCase() ||
            b.id.toLowerCase() === bookName.toLowerCase()
        );

        if (!book) {
            throw new Error(`Book "${bookName}" not found`);
        }

        const chapters: string[] = [];

        // Fetch all chapters
        for (let i = 1; i <= book.chapters; i++) {
            try {
                const chapterData = await this.getChapter(book.name, i, translation);

                // Format chapter header
                let chapterHtml = `<h2>${book.name} ${i}</h2>\n`;

                // Format verses
                if (chapterData.verses && chapterData.verses.length > 0) {
                    // Individual verses available
                    chapterData.verses.forEach(v => {
                        chapterHtml += `<sup>${v.verse}</sup> ${v.text} `;
                    });
                } else if (chapterData.text) {
                    // Plain text format
                    chapterHtml += `<p>${chapterData.text}</p>`;
                }

                chapters.push(chapterHtml);
            } catch (error) {
                console.error(`Failed to fetch ${book.name} ${i}:`, error);
                chapters.push(`<h2>${book.name} ${i}</h2>\n<p><em>Failed to load chapter</em></p>`);
            }
        }

        return chapters.join('\n\n');
    }

    /**
     * Search for verses containing a term (basic search via API)
     */
    async searchVerses(query: string, translation: BibleVersionId = 'kjv'): Promise<BibleVerse[]> {
        // The bible-api.com doesn't support search, so we'll use Groq for intelligent search
        const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        if (!apiKey) {
            console.error('No Groq API key for Bible search');
            return [];
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile', // Updated to currently available model
                    messages: [{
                        role: 'user',
                        content: `Find up to 5 Bible verses that are most relevant to: "${query}". 
                        Return ONLY a JSON array of verse references like: ["John 3:16", "Romans 8:28", "Psalm 23:1"]
                        Include both Old and New Testament if applicable.`
                    }],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) return [];

            const data = await response.json();
            const content = JSON.parse(data.choices[0].message.content);
            const references = content.verses || content.references || [];

            // Fetch each verse
            const verses = await Promise.all(
                references.slice(0, 5).map((ref: string) => this.getVerse(ref, translation))
            );

            return verses;
        } catch (error) {
            console.error('Bible search error:', error);
            return [];
        }
    }

    /**
     * Get Greek/Hebrew word meaning using AI
     */
    async getWordMeaning(word: string, context?: string): Promise<{
        original: string;
        transliteration: string;
        meaning: string;
        usage: string;
    }> {
        const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        if (!apiKey) {
            console.error('No Groq API key configured for word meanings');
            return {
                original: word,
                transliteration: '',
                meaning: 'API key not configured',
                usage: ''
            };
        }

        try {
            console.log(`Fetching meaning for word: "${word}"`);

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile', // Updated to currently available model
                    messages: [{
                        role: 'user',
                        content: `As a Biblical scholar, provide the Greek or Hebrew origin and meaning of the English word "${word}"${context ? ` as used in this Bible passage: "${context.substring(0, 200)}"` : ''}.

Return a JSON object with these exact fields:
{
    "original": "the Greek or Hebrew word (use actual Greek/Hebrew characters if possible)",
    "transliteration": "phonetic spelling in English letters",
    "meaning": "clear definition in 2-3 sentences",
    "usage": "brief note on how this word is used in Scripture"
}

Only return the JSON object, no other text.`
                    }],
                    response_format: { type: 'json_object' },
                    max_tokens: 500,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Groq API error for word meaning:', response.status, errorText);
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            if (!content) {
                console.error('No content in Groq response');
                throw new Error('Empty response');
            }

            console.log('Word meaning response:', content);
            const parsed = JSON.parse(content);

            return {
                original: parsed.original || word,
                transliteration: parsed.transliteration || '',
                meaning: parsed.meaning || 'No definition available',
                usage: parsed.usage || ''
            };
        } catch (error) {
            console.error('Word meaning error:', error);
            return {
                original: word,
                transliteration: '',
                meaning: 'Definition unavailable. Please try again.',
                usage: ''
            };
        }
    }
}

const bibleService = new BibleService();
export default bibleService;
