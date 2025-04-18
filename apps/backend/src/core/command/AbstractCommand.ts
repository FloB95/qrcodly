import { Command } from 'commander';

export abstract class AbstractCommand {
	protected command: Command;

	constructor() {
		this.command = new Command();
		this.initialize();
	}

	/**
	 * Initializes the command with options and action.
	 */
	protected abstract initialize(): void;

	/**
	 * Executes the command logic.
	 */
	protected abstract execute(options: Record<string, unknown>, parentCommand: Command): Promise<void>;

	/**
	 * Registers the command to be executed.
	 */
	public register(parentCommand: Command): void {
		this.command.action(async (options: Record<string, unknown>) => {
			try {
				await this.execute(options, parentCommand);
				process.exit(0);
			} catch (error) {
				console.error('Command execution failed:', error);
				process.exit(1);
			}
		});

		parentCommand.addCommand(this.command);
	}
}
