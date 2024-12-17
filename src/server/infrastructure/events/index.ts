import { NodeEventEmitter } from "./NodeEventEmitter";

// Create a module-level variable to store the singleton instance
let eventEmitterInstance: NodeEventEmitter | null = null;

// Function to get the singleton instance of EventEmitter
export const getEventEmitter = (): NodeEventEmitter => {
  if (!eventEmitterInstance) {
    eventEmitterInstance = new NodeEventEmitter();
  }
  return eventEmitterInstance;
};

// Export the singleton instance directly for convenience
export default getEventEmitter();
