const path = require('path');
const BabiliPlugin = require("babili-webpack-plugin");

module.exports = {

	entry: './webpack_entry.js',

	output: {
		filename: './dist/lostofs_bundle.min.js',
	},

	module: {
		rules: [{
			test: require.resolve('./dist/lostofs.js'),
			use: [{
				loader: 'expose-loader',
				options: 'lostofs'
			}],
		}],
	},

	resolve: {
		modules: [
			path.resolve(__dirname, './node_modules'),
		],
	},

	plugins: [
		new BabiliPlugin(),
	],

};
