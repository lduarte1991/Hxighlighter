const path = require('path');
const webpack = require('webpack');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const PATHS = {
    vendor: path.join(__dirname, 'src/js/vendors/'),
}

module.exports = {
    entry: {
        text: ['./src/text-index.js']
    },
    plugins: [
        new webpack.ProvidePlugin({
            "jquery": require.resolve('jquery'),
            "$": require.resolve('jquery'),
            'jQuery': require.resolve('jquery'),
        }),
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
        extensions: ['.js'],
        alias: {
            'annotator': PATHS.vendor + 'Annotator/annotator.ui.js',
        }
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
            {
                test: /annotator\.ui\.js/,
                use: ["imports-loader?$=jquery&window.jQuery=jquery"]
            },
            {
                test: /\.html$/,
                use: ['underscore-template-loader']
            }
        ]
    },
    performance: {
        'hints': false
    }
}