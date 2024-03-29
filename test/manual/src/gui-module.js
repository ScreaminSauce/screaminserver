'use strict';
const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

class GuiBuilder {
    constructor(outputFolder) {
        this._config = {
            entry: {
                'manualtest': path.resolve(__dirname, "gui/manualtest.js"),
                'manualtest2': path.resolve(__dirname, "gui/manualtest2.js"),
            },
            output: {
                filename: '[name].js',
                path: path.resolve(outputFolder),
                sourceMapFilename: '[name].map'
            },
            devtool: false,
            module: {
                rules: [{
                    test: /\.s[c|a]ss$/,
                    use: ['style-loader', MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
                }]
            },
            plugins: [
                new CleanWebpackPlugin(),
                new CopyWebpackPlugin({
                    patterns: [
                        { from: path.resolve(__dirname + '/gui/static' ) + '/**', 
                        context: path.resolve(__dirname + '/gui/static')}
                    ]
                }),
                new MiniCssExtractPlugin()
            ]
        }
    }

    getAppInfo(){
        return [
            {
                urlPath: "/public/index.html",
                icon: '/public/batdomo.jpg',
                regName: "manualtest",
                displayName: "Manual Test",
                description: "Simple module for manual testing the GUI server"
            }
        ]
    }

    build(logger) {
        return new Promise((resolve, reject) => {
            webpack([this._config], (err, stats) => {
                if (stats && stats.hasErrors()){
                    let info = stats.toJson();
                    info.errors.forEach((sError) => {
                        logger.error(JSON.stringify(sError, null, 2));
                    })
                    logger.error(err);
                }
                if (err) {
                    logger.error(err);
                    reject(err);
                } else {
                    logger.info({module: "manualtest"}, "Webpack build complete for module.")
                    resolve();
                }
            });
        })
    }
}


module.exports = {
    name: "manualtest",
    type:"gui",
    gui:GuiBuilder
};


