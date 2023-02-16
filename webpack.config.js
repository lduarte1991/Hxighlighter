const path = require('path');
const webpack = require('webpack');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const WebpackAutoInject = require('webpack-auto-inject-version-next');

const PATHS = {
    vendor: path.join(__dirname, 'src/js/vendors/'),
    modules: path.join(__dirname, 'node_modules/')
}

module.exports = {
    entry: {
        text: ['./src/text-index.js'],
        text_lite: ['./src/author-index.js'],
        image_m2: ['./src/image-index-m2.js'],
        video_vjs: ['./src/video-index-vjs.js']
    },
    plugins: [
        new webpack.ProvidePlugin({
            "jquery": require.resolve('jquery'),
            "$": require.resolve('jquery'),
            'jQuery': require.resolve('jquery'),
            _: require.resolve('lodash'),
            'toastr': require.resolve('toastr'),
            "videojs": require.resolve('video.js')
        }),
        new MiniCssExtractPlugin({
            filename: 'dist/hxighlighter_[name].css',
            chunkFilename: "[id].css"
        }),
        new webpack.DefinePlugin({
          'require.specified': 'require.resolve'
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /^codemirror$/
        }),
        new WebpackAutoInject({
            components: {
                InjectAsComment: true,
                InjectByTag: false
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
        filename: 'dist/hxighlighter_[name].js',
        assetModuleFilename: '[hash][ext][query]'
    },
    resolve: {
        extensions: ['.js'],
        // Note: mainFields prioritizes the "main" entrypoint to deal with a video.js conflict 
        //       between video.es.js and video.cjs.js
        mainFields: ['main', 'module'], 
        alias: {
            'annotator': PATHS.vendor + 'Annotator/annotator.ui.js',
            'CodeMirror': 'codemirror',
            'jquery-tokeninput': PATHS.modules + 'jquery.tokeninput/',
            'handlebars': PATHS.modules + 'handlebars/dist/handlebars.min.js',
            'videojs': PATHS.modules + 'video.js',
            'videojs-transcript': PATHS.modules + 'videojs-transcript-ac/dist/videojs-transcript.js',
            'videojs-youtube': PATHS.modules + 'videojs-youtube/dist/Youtube.js'
        }
    },
    optimization: {
        minimize: false,
        minimizer: [
            // For webpack@5 you can use the `...` syntax to extend existing minimizers (i.e. `terser-webpack-plugin`), uncomment the next line
            `...`,
            new CssMinimizerPlugin(),
          ],
    },
    externals: {
        'Mirador': 'Mirador'
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
                test: /\.(eot|ttf|woff(2)?)(\?v=\d+\.\d+\.\d+)?/,
                type: 'asset/resource',
                generator: {
                    publicPath: '../fonts/',
                    outputPath: 'dist/fonts/'
                }
            }, 
            {
                test: /\.(gif|svg|png|jpg)(\?v=\d+\.\d+\.\d+)?/,
                type: 'asset/inline'
            },
            {
                test: /annotator\.ui\.js/,
                use: [{
                    loader: "imports-loader",
                    options: {
                        imports: [
                            "defaults jquery $",
                            "defaults jquery window.jQuery"
                        ]
                    }
                }]
            },
            // {
            //     test: /mirador\.js/,
            //     use: 'script-loader'
            // },
            {
                test: /videojs-transcript.js/,
                use: [{
                    loader: "imports-loader",
                    options: {
                        imports: [
                            "defaults videojs videojs"
                        ]
                    }
                }]
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
