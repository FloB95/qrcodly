const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (_env, argv) => {
	const isProduction = argv.mode === 'production';

	// Pin the API endpoint at build time. Production always points at the live
	// API; local dev defaults to localhost:5001 unless QRCODLY_API_URL is set.
	const apiBaseUrl =
		process.env.QRCODLY_API_URL ||
		(isProduction ? 'https://api.qrcodly.de/api/v1' : 'http://localhost:5001/api/v1');

	return {
		entry: './src/index.tsx',
		target: 'web',
		externals: {
			uxp: 'commonjs2 uxp',
			indesign: 'commonjs2 indesign',
			photoshop: 'commonjs2 photoshop',
			os: 'commonjs2 os',
		},
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: 'index.js',
			clean: true,
		},
		resolve: {
			extensions: ['.tsx', '.ts', '.js'],
			alias: {
				'@': path.resolve(__dirname, 'src'),
				'@shared/schemas': path.resolve(__dirname, '../../../packages/shared/src'),
			},
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					loader: 'ts-loader',
					exclude: /node_modules/,
					options: { transpileOnly: true },
				},
				{
					test: /\.css$/,
					use: ['style-loader', 'css-loader'],
				},
			],
		},
		plugins: [
			new webpack.DefinePlugin({
				__QRCODLY_API_URL__: JSON.stringify(apiBaseUrl),
			}),
			new CopyPlugin({
				patterns: [{ from: 'plugin', to: '.' }],
			}),
		],
		performance: { hints: false },
		devtool: isProduction ? false : 'eval-cheap-source-map',
	};
};
