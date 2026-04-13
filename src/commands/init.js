import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function initCommand() {
    const targetDir = path.join(process.cwd(), '.spec');
    const templateDir = path.resolve(__dirname, '..', 'templates');

    try {
        if (await fs.pathExists(targetDir)) {
            console.log(chalk.yellow(`! The .spec directory already exists at ${targetDir}`));
            return;
        }

        await fs.ensureDir(targetDir);
        await fs.copy(templateDir, targetDir);

        console.log(chalk.green(`\n✓ Successfully scaffolded .spec/ folder with 8 template files.`));
        console.log(chalk.blue(`\nNext steps:`));
        console.log(`1. Open the files in .spec/`);
        console.log(`2. Replace the examples with your own system description.`);
        console.log(`3. Run 'spec generate' to build your master agent prompt.\n`);

    } catch (error) {
        console.error(chalk.red(`Error during initialization: ${error.message}`));
        process.exit(1);
    }
}
