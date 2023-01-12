const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
    mode: 'development',
    entry: './src/index.js',
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    plugins: [
        // new Serve({
        //   port: 8000,
        //   static: [path.resolve(__dirname, "dist"), path.resolve(__dirname, "static")],// path.resolve('./static')
        // }),
        new HtmlWebpackPlugin({
            title: 'Arduino webapp demo',
            // filename: "./public/index.html",
            // template: "index.html",
        }),
        new Dotenv(),
    ],
    module: {
        rules: [
        //   {
        //     test: /\.(js|jsx)$/i,
        //     loader: "babel-loader",
        //   },
        {
            test: /\.css$/i,
            use: ['style-loader', 'css-loader'],
        },
        {
            test: /\.html$/i,
            loader: 'html-loader',
        },
        //   {
        //     test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
        //     type: "asset",
        //   },

        // Add your rules for custom modules here
        // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
    devServer: {
        open: true,
        static: './dist',
        host: '127.0.0.1',
        port: 8000,
    },
    devtool: 'inline-source-map',
    watch: true,
};