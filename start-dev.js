// 开发服务器启动脚本
const path = require('path');
const Webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('./webpack.config.js');

// 确保publicPath正确
webpackConfig.output.publicPath = '/';

// 明确设置模式为开发模式
webpackConfig.mode = 'development';

// 创建Webpack实例
const compiler = Webpack(webpackConfig);

// 配置开发服务器
const devServerOptions = {
    static: {
        directory: path.join(__dirname, 'dist'),
    },
    hot: true,
    historyApiFallback: true,
    compress: true,
    port: 8080,
    open: true,
    devMiddleware: {
        publicPath: '/',
        writeToDisk: true
    }
};

// 创建服务器
const server = new WebpackDevServer(devServerOptions, compiler);

// 启动服务器
const runServer = async () => {
    console.log('启动开发服务器...');
    console.log('工作目录:', process.cwd());
    try {
        await server.start();
        console.log('开发服务器正在运行: http://localhost:8080');
    } catch (error) {
        console.error('启动开发服务器时出错:', error);
    }
};

runServer(); 