import { AbstractCommand } from '@/core/command/abstract-command';
import { type Command } from 'commander';
import { injectable } from 'tsyringe';

@injectable()
export default class ListCommand extends AbstractCommand {
	constructor() {
		super();
	}

	protected initialize(): void {
		this.command.name('list').description('List all registered commands');
	}

	protected async execute(
		_options: Record<string, unknown>,
		parentCommand: Command,
	): Promise<void> {
		return new Promise((resolve) => {
			console.log('Registered commands:');
			parentCommand.commands.forEach((cmd) => {
				console.log(`- ${cmd.name()}: ${cmd.description()}`);
			});
			resolve();
		});
	}
}
