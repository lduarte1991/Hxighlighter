const path = require('path');
var webpack = require('webpack');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: {
        text: ['./src/text-index.js']
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'dist/hxighlighter_[name].css',
            chunkFilename: "[id].css"
        }),
    ],
    output: {
        path: __dirname,
        filename: 'dist/hxighlighter_[name].js'
    },
    resolve: {
        extensions: ['.js']
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            publicPath: '../'
                        }
                    },
                    "css-loader"
                ]
            },
            {
                test: /\.(eot|gif|svg|png|jpg|ttf|woff(2)?)(\?v=\d+\.\d+\.\d+)?/,
                use: require.resolve('url-loader')
            },
        ]
    },
    performance: {
        'hints': false
    }
}