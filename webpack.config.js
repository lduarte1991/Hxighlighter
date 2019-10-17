const path = require('path');
const webpack = require('webpack');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackAutoInject = require('webpack-auto-inject-version');

const PATHS = {
    vendor: path.join(__dirname, 'src/js/vendors/'),
    modules: path.join(__dirname, 'node_modules/')
}

module.exports = {
    entry: {
        text: ['./src/text-index.js'],
        text_lite: ['./src/author-index.js'],
        image_m2: ['./src/image-index-m2.js']
    },
    plugins: [
        new webpack.ProvidePlugin({
            "jquery": require.resolve('jquery'),
            "$": require.resolve('jquery'),
            'jQuery': require.resolve('jquery'),
            _: require.resolve('lodash'),
        }),
        new MiniCssExtractPlugin({
            filename: 'dist/hxighlighter_[name].css',
            chunkFilename: "[id].css"
        }),
        new webpack.DefinePlugin({
          'require.specified': 'require.resolve'
        }),
        new webpack.IgnorePlugin(/^codemirror$/),
        new WebpackAutoInject({
            components: {
                InjectAsComment: true
            },
            componentsOptions: {
                InjectAsComment: {
                    tag: 'Version: {version} - {date}',
                    dateFormat: 'dddd, mmmm dS, yyyy, h:MM:ss TT',
                    multiLineCommentType: false,
                }
            }
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
            'CodeMirror': 'codemirror',
            'jquery-tokeninput': PATHS.modules + 'jquery.tokeninput/',
            'handlebars': PATHS.modules + 'handlebars/dist/handlebars.min.js'
        }
    },
    optimization: {
        minimize: false
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            publicPath: '../',
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
                test: /mirador\.js/,
                use: 'script-loader'
            },
            {
                test: /(floating|sidebar)\.html$/,
                use: ['underscore-template-loader']
            },
            { test: /\.handlebars$/, loader: "handlebars-loader" },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    performance: {
        'hints': false
    }
}