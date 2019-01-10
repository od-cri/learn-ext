// Configuration for Production builds.
const merge = require('webpack-merge')
const base_config = require('./webpack.common')
const CleanWebpackPlugin = require('clean-webpack-plugin')


module.exports = merge(base_config, {
  mode: 'production',

  plugins: [
    // Remove contents of build directory and clear out web-ext-artifacts.
    new CleanWebpackPlugin([ 'ext', 'web-ext-artifacts' ]),
  ],
})
