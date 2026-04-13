import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import clipboardy from 'clipboardy';
import { buildMasterPrompt } from '../prompt-builder.js';

export async function generateCommand() {
    const specDir = path.join(process.cwd(), '.spec');
    const outputFile = path.join(process.cwd(), 'AGENTS.md');

    try {
        if (!(await fs.pathExists(specDir))) {
            console.error(chalk.red(`Error: The .spec directory was not found. Did you run 'spec init' first?`));
            process.exit(1);
        }

        console.log(chalk.blue(`Reading specifications from ${specDir}...`));
        const masterPrompt = await buildMasterPrompt(specDir);

        // Save to AGENTS.md
        await fs.writeFile(outputFile, masterPrompt, 'utf8');
        console.log(chalk.green(`✓ Master prompt written to: ${chalk.bold('AGENTS.md')}`));

        // Copy to clipboard
        try {
            await clipboardy.write(masterPrompt);
            console.log(chalk.green(`✓ Master prompt copied to clipboard!`));
        } catch (clipError) {
            console.log(chalk.yellow(`! Could not copy to clipboard automatically, but AGENTS.md is ready.`));
        }

        console.log(chalk.blue(`\nNow hand the contents of AGENTS.md to your AI agent (Cursor, Claude Code, etc.) to generate your system.\n`));

    } catch (error) {
        console.error(chalk.red(`Error during generation: ${error.message}`));
        process.exit(1);
    }
}
