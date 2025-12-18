import 'dotenv/config';
import * as OpenAPI from 'fumadocs-openapi';
import { rimraf } from 'rimraf';
import { openapi } from '@/lib/openapi';
import fs from 'fs';

const out = './content/docs/api';

async function generate() {
	// clean generated files
	await rimraf(out, {
		filter(v) {
			return !v.endsWith('meta.json');
		},
	});

	await OpenAPI.generateFiles({
		input: openapi,
		output: out,
	});

	// copy api index file to the docs folder
	fs.copyFileSync('./content/api-index.mdx', `${out}/index.mdx`);
}

void generate();
