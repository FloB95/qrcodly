// No-op shim for posthog-js in browser extension
const posthog = {
	capture() {},
	identify() {},
	reset() {},
	isFeatureEnabled() {
		return false;
	},
	getFeatureFlag() {
		return undefined;
	},
	onFeatureFlags() {},
	reloadFeatureFlags() {},
	group() {},
	setPersonProperties() {},
};

export default posthog;
