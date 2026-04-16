const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
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
		new CopyPlugin({
			patterns: [{ from: 'plugin', to: '.' }],
		}),
	],
	performance: { hints: false },
	devtool: 'eval-cheap-source-map',
};
