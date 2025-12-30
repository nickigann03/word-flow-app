export interface Template {
    id: string;
    name: string;
    description: string;
    content: string;
}

export const templates: Template[] = [
    {
        id: 'blank',
        name: 'Blank Document',
        description: 'Start with a clean slate.',
        content: ''
    },
    {
        id: '3-point',
        name: '3-Point Sermon',
        description: 'Classic homiletic structure.',
        content: `# Sermon Title\n\n**Main Text:** [Insert Verse]\n\n## Introduction\n- Hook:\n- Context:\n- Proposition:\n\n## I. Point One\n- Explanation:\n- Illustration:\n- Application:\n\n## II. Point Two\n- Explanation:\n- Illustration:\n- Application:\n\n## III. Point Three\n- Explanation:\n- Illustration:\n- Application:\n\n## Conclusion\n- Summary:\n- Call to Action:`
    },
    {
        id: 'expository',
        name: 'Expository',
        description: 'Verse-by-verse analysis.',
        content: `# Expository Sermon\n\n**Text:** \n\n## Verse 1\n- Observation:\n- Interpretation:\n\n## Verse 2\n- Observation:\n- Interpretation:\n\n## Application\n`
    }
];

export const getAllTemplates = () => templates;
