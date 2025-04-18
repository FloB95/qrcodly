import { Application } from './Application';

const app = new Application();
void app.start();

process.once('SIGTERM', () => void app.shutdown('SIGTERM'));
process.once('SIGINT', () => void app.shutdown('SIGINT'));
