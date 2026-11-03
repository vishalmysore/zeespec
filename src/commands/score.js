import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { score, parseDoc } from '../../web/src/epic/engine.js';
import { lint } from '../../web/src/epic/lints.js';
import { SAMPLES } from '../../web/src/epic/samples.js';

// Score spec artifacts against the EPIC framework (arXiv:2610.07534), same engine as the web EPIC tab.
//   spec score                      # .spec/ and AGENTS.md in the current folder
//   spec score specs/003-feature --min 23 --json

function collect(p, out = []) {
    if (fs.statSync(p).isDirectory()) {
        for (const f of fs.readdirSync(p)) {
            if (!/node_modules|^\.git$/.test(f)) collect(path.join(p, f), out);
        }
    } else if (/\.(md|markdown)$/i.test(p)) {
        out.push({ name: path.relative(process.cwd(), p) || p, text: fs.readFileSync(p, 'utf8') });
    }
    return out;
}

function defaultPaths() {
    return ['.spec', 'AGENTS.md'].filter(p => fs.existsSync(path.join(process.cwd(), p)));
}

export async function scoreCommand(paths, options) {
    const targets = paths.length ? paths : defaultPaths();
    if (!options.sample && !targets.length) {
        console.error(chalk.red(`Error: nothing to score. Pass spec files or folders, or run 'spec init' first.`));
        process.exit(1);
    }
    const files = options.sample ? SAMPLES.strong.files : targets.flatMap(p => collect(p));
    if (!files.length) {
        console.error(chalk.red('Error: no Markdown files found.'));
        process.exit(1);
    }
    const r = score(files);

    if (options.json) {
        console.log(JSON.stringify({
            total: r.total,
            tier: r.tier.id,
            dimensions: Object.fromEntries(r.dimensions.map(d => [d.id, d.score])),
            gaps: r.practices.filter(p => p.level < 1).map(p => ({ id: p.id, level: p.level, hint: p.hint })),
        }, null, 2));
    } else {
        console.log(chalk.blue(`\nEPIC score — ${r.docs.map(d => `${d.name} [${d.kind}]`).join(', ')}\n`));
        for (const d of r.dimensions) {
            const bar = '●'.repeat(d.score) + '○'.repeat(3 - d.score);
            console.log(`  ${d.id.padEnd(3)} ${d.name.padEnd(36)} ${bar}  ${d.score}/3`);
            for (const p of d.practices.filter(p => p.level < 1)) {
                console.log(chalk.gray(`        ${p.level ? '◐' : '✗'} ${p.id} ${p.hint}`));
            }
        }
        const color = { top: chalk.green, middle: chalk.yellow, bottom: chalk.red }[r.tier.id];
        console.log(`\n  Total: ${color(`${r.total}/30 — ${r.tier.label}`)}   (${r.satisfied}/40 practices fully met)`);
        const lints = lint(files.map(f => parseDoc(f.name, f.text)));
        if (lints.length) console.log(`  ${lints.length} line finding(s), e.g. ${lints[0].doc}:${lints[0].line} — ${lints[0].msg}`);
        console.log(chalk.gray('  Full report: https://vishalmysore.github.io/zeespec/app/#epic\n'));
    }

    const min = options.min != null ? Number(options.min) : null;
    if (min != null && r.total < min) {
        console.error(chalk.red(`EPIC score ${r.total} is below --min ${min}`));
        process.exit(2);
    }
}
