const path = require('path');

module.exports = {
	entry: './lib/lostofs.js',

	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'lostofs.js',
		libraryTarget: 'commonjs2',
	},
};
