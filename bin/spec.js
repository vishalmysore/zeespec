#!/usr/bin/env node

import { program } from 'commander';
import { initCommand } from '../src/commands/init.js';
import { generateCommand } from '../src/commands/generate.js';
import { scoreCommand } from '../src/commands/score.js';

program
    .name('spec')
    .description('System-First Spec: Turn plain English descriptions into full technical specifications.')
    .version('1.0.0');

program
    .command('init')
    .description('Scaffold the .spec/ folder with template files.')
    .action(initCommand);

program
    .command('generate')
    .description('Assemble .spec files into a master prompt (AGENTS.md and clipboard).')
    .action(generateCommand);

program
    .command('score')
    .description('Score spec files against the EPIC framework (40 practices, 0-30). Defaults to .spec/ and AGENTS.md.')
    .argument('[paths...]', 'spec files or folders')
    .option('--min <n>', 'exit with code 2 if the score is below n (e.g. 23 = top band)')
    .option('--json', 'print machine-readable JSON')
    .option('--sample', 'score the built-in strong sample')
    .action(scoreCommand);

program.parse(process.argv);
