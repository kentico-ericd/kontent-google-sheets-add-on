var path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry:{
      lib:'./index.js'
  },
  output: 
  {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'var',
    library: 'AppLib'
  },
  module:
  {
  rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    useBuiltIns: 'usage',
                    corejs: { version: '3.12.1' }
                  }
                ]
              ]
            }
          }
        }
      ] 
  },
  plugins: [
    new CopyPlugin({
        patterns: [
            'script/*.js',
            'endpoints/*.js',
            'appsscript.json',
            '.clasp.json'
        ]
    })
  ]
};