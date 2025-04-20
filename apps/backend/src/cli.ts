#!/usr/bin/env node

import { Command } from 'commander';
import './core/setup';
import { readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { container } from 'tsyringe';
import { fileURLToPath } from 'url';
import { type AbstractCommand } from './core/command/abstract.command';

process.env.TZ = 'Europe/Berlin';

async function loadCommands(parentCommand: Command) {
	// Get the current file's directory using fileURLToPath and dirname
	const __dirname = dirname(fileURLToPath(import.meta.url)); // <-- Important change here
	const modulesDir = resolve(__dirname, 'modules');
	const coreCommandsDir = resolve(__dirname, 'core', 'command');

	// Combine core commands and module commands into a single array of directories
	const commandDirs = [{ path: coreCommandsDir, exclude: 'abstract-command.ts' }];

	// Read all module directories and add their command paths
	const moduleDirs = readdirSync(modulesDir, { withFileTypes: true }).filter((dirent) =>
		dirent.isDirectory(),
	);
	for (const moduleDir of moduleDirs) {
		commandDirs.push({
			path: resolve(modulesDir, moduleDir.name, 'command'),
			exclude: 'abstract-command.ts',
		});
	}

	// Load commands from all directories
	for (const { path, exclude } of commandDirs) {
		if (existsSync(path)) {
			const commandFiles = readdirSync(path).filter(
				(file) => file.endsWith('.command.ts') && file !== exclude,
			);

			for (const file of commandFiles) {
				const { default: CommandClass } = (await import(resolve(path, file))) as unknown as {
					default: new () => AbstractCommand;
				};
				if (CommandClass) {
					const commandInstance = container.resolve<AbstractCommand>(CommandClass);
					if (commandInstance instanceof CommandClass) {
						commandInstance.register(parentCommand);
					}
				}
			}
		}
	}
}

async function run() {
	const program = new Command();

	program.name('app-cli').description('CLI tool for managing the application');

	// Load commands dynamically
	await loadCommands(program);

	// Parse the arguments
	program.parse(process.argv);
}

run().catch((err) => {
	console.error('Error occurred:', err);
	process.exit(1);
});
