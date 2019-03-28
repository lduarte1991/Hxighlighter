const path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: {
        text: ['./src/text-index.js']
    }
    plugins: [],
    output: {
        path: __dirname,
        filename: 'dist/hxighlighter.js'
    },
    resolve: {
        extensions: ['.js']
    }
}