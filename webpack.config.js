const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.[contenthash].js',
        publicPath: '',  // 修改为相对路径
        chunkFilename: '[name].[contenthash].js',
        clean: true     // 在每次构建前清理dist目录
    },
    devtool: 'source-map',
    // 设置明确的模式
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    // 性能提示配置 - 忽略大体积资产警告
    performance: {
        hints: false,
        maxEntrypointSize: 2000000, // 2MB
        maxAssetSize: 2000000 // 2MB
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html'
        }),
        // 提供polyfills
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
            Web3: 'web3'
        }),
        // 复制WalletConnect加载器和MetaMask助手到输出目录
        new CopyWebpackPlugin({
            patterns: [
                { from: 'walletconnect-loader.js', to: '.' },
                { from: 'metamask-helper.js', to: '.' }
            ]
        })
    ],
    resolve: {
        fallback: {
            crypto: require.resolve('crypto-browserify'),
            stream: require.resolve('stream-browserify'),
            assert: require.resolve('assert'),
            http: require.resolve('stream-http'),
            https: require.resolve('https-browserify'),
            os: require.resolve('os-browserify'),
            url: require.resolve('url')
        },
        extensions: ['.js', '.json'],
        alias: {
            '@walletconnect/web3-provider': path.resolve(__dirname, 'node_modules/@walletconnect/web3-provider')
        }
    },
    externals: {
        '@walletconnect/web3-provider': 'WalletConnectProvider'
    },
    optimization: {
        runtimeChunk: 'single',
        splitChunks: {
            chunks: 'all',
            maxInitialRequests: Infinity,
            minSize: 20000,
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name(module) {
                        // 获取第三方库的名称
                        const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
                        // 返回名称以避免冲突
                        return `npm.${packageName.replace('@', '')}`;
                    }
                }
            }
        }
    },
    // 添加开发服务器配置
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 8080,
        hot: true,
        historyApiFallback: true,  // 允许刷新页面不会404
        open: true,                // 自动打开浏览器
        devMiddleware: {
            writeToDisk: true      // 将文件写入磁盘
        },
        client: {
            overlay: true,    // 在浏览器中显示编译错误
            progress: true    // 在浏览器中显示编译进度
        },
        watchFiles: ['src/**/*', 'public/**/*']  // 监视这些文件的变化
    },
    // 添加特殊处理以支持WalletConnect
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: ['@babel/plugin-transform-runtime']
                    }
                }
            }
        ]
    }
};