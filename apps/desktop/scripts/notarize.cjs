const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
	const { electronPlatformName, appOutDir } = context;

	if (electronPlatformName !== 'darwin') {
		return;
	}

	if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD || !process.env.APPLE_TEAM_ID) {
		console.log('Skipping notarization — missing Apple credentials');
		return;
	}

	const appName = context.packager.appInfo.productFilename;

	console.log(`Notarizing ${appName}...`);

	await notarize({
		appBundleId: 'de.qrcodly.desktop',
		appPath: `${appOutDir}/${appName}.app`,
		appleId: process.env.APPLE_ID,
		appleIdPassword: process.env.APPLE_ID_PASSWORD,
		teamId: process.env.APPLE_TEAM_ID,
		tool: 'notarytool',
	});

	console.log('Notarization complete');
};
