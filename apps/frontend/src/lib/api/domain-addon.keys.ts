/**
 * Query keys for the custom-domain add-on.
 *
 * Kept out of `domain-addon.ts` so `custom-domain.ts` can invalidate the add-on without importing
 * it: the add-on module already imports the domain keys, and pulling the other direction into the
 * hook file would close an import cycle.
 */
export const domainAddonQueryKeys = {
	addon: ['domain-addon'] as const,
};
