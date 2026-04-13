import fs from 'fs-extra';
import path from 'path';

/**
 * Assembles the content of all .spec/*.md files into a single master prompt.
 */
export async function buildMasterPrompt(specDir) {
    const files = [
        'what.md',
        'how.md',
        'who.md',
        'when.md',
        'where.md',
        'why.md',
        'upstream.md',
        'downstream.md'
    ];

    let masterPrompt = `# SYSTEM SPECIFICATION OVERVIEW\n\n`;
    masterPrompt += `I have defined the system requirements across several dimensions. Please use this information to architect the database schema, design the API, and plan the implementation as requested.\n\n`;

    for (const fileName of files) {
        const filePath = path.join(specDir, fileName);
        if (await fs.pathExists(filePath)) {
            const content = await fs.readFile(filePath, 'utf8');
            const sectionName = fileName.replace('.md', '').toUpperCase();
            masterPrompt += `## DIMENSION: ${sectionName}\n\n`;
            masterPrompt += content + `\n\n---\n\n`;
        }
    }

    masterPrompt += `\n# INSTRUCTIONS FOR THE AI AGENT\n`;
    masterPrompt += `1. Analyze the dimensions provided above.\n`;
    masterPrompt += `2. Identify any ambiguities or missing information and ask clarifying questions if necessary.\n`;
    masterPrompt += `3. Generate a technical specification including database models, API contracts, and core logic patterns.\n`;
    masterPrompt += `4. If requested, proceed to generate the implementation candidates.\n`;

    return masterPrompt;
}
