const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile'; // Using currently available stable model

export const getTheologicalDefinition = async (term: string) => {
    const prompt = `You are a helpful theology assistant. Provide a concise, 2-sentence definition of the Christian theological term "${term}". Then provide 1 key Bible verse reference. Format as JSON: {"definition": "...", "verse": "Book Ch:V"}`;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq API Error (Definition):', response.status, errorText);
            throw new Error(`Groq API Error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error('Groq AI Error:', error);
        return { definition: "Automated definition unavailable.", verse: "" };
    }
};

export const summarizeSermon = async (notesContent: string) => {
    if (!notesContent) return '';

    const prompt = `Summarize these sermon notes into 3 key bullet points and 1 actionable application step. Keep it concise. Notes: ${notesContent.substring(0, 6000)}`;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq API Error (Summary):', response.status, errorText);
            throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Groq AI Summary Error:', error);
        throw error;
    }
};

const groqService = {
    getTheologicalDefinition,
    summarizeSermon
};

export default groqService;
