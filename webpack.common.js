const WebpackBar = require('webpackbar')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MomentLocalesPlugin = require('moment-locales-webpack-plugin')
const _ = require('lodash')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const glob = require('glob')

const { dotenv, abspath, locale } = require('./modules/plugins')


const BuildTargets = {
  chrome: {
    buildPath: abspath('./.builds/chrome'),
    manifestPath: './src/manifest.chrome.json',
  },
  firefox: {
    buildPath: abspath('./.builds/firefox'),
    manifestPath: './src/manifest.gecko.json',
  },
}
const target = BuildTargets[dotenv.flags.target || 'firefox']

// Files that should be copied into the extension directory.
const copySourceBundleRules = [
  { from: target.manifestPath, to: './manifest.json' },
  { from: './assets/icons', to: './icons' },
  {
    from: './assets/locales/*.yml',
    to: './_locales/[name]/messages.json',
    toType: 'template',
    transform: locale.transpile,
  },
  {
    from: './modules/atlas/dotatlas/*.js',
    to: './atlas/',
    flatten: true,
  },
]

// Setup html generator plugin using HtmlWebpackPlugin

// Link entry points with the chunks defined here.
// By convention, every static html target page contains `markup.pug`. We
// glob down the fs tree to look for all such files and get the template path,
// and filenames.
const staticPages = glob
  .sync('./src/pages/**/markup.pug')
  .map((entry) => {
    const pageName = /src\/pages\/(.*)\/markup.pug$/.exec(entry)[1]
    const chunkName = `pages_${pageName}`
    return {
      name: pageName,
      plugin: new HtmlWebpackPlugin({
        filename: `pages/${pageName}.html`,
        template: `src/pages/${pageName}/markup.pug`,
        chunks: [ 'vendors', 'pages_root', chunkName ],
      }),
      entrypoint: [ chunkName, `./src/pages/${pageName}/index.js` ],
    }
  })

// Gather staticPages entries into separate plugin and entrypoint entities.
// We'll merge the entrypoints and plugin instances to respective webpack
// config fields.
const staticEntrypoints = staticPages
  .reduce((acc, { entrypoint }) => {
    const [ chunkName, entryPath ] = entrypoint
    acc[chunkName] = entryPath
    return acc
  }, {})

const staticPageGeneratorPlugins = staticPages
  .reduce((acc, { plugin }) => [ ...acc, plugin ], [])


module.exports = {
  entry: {
    app_root: './src/index.js',
    background: './src/procs/background.js',

    pages_root: './src/pages/index.js',
    ...staticEntrypoints,
  },
  output: {
    publicPath: '/',
    chunkFilename: '[name].js',
    filename: (chunkData) => {
      if (/pages_.*/.test(chunkData.chunk.name)) {
        // Put the static html inside `pages/chunks`
        return 'chunks/[name].js'
      } else {
        // Otherwise put it in root directory.
        return '[name].js'
      }
    },
    path: target.buildPath,
  },

  resolve: {
    // Alias allows importing modules independent of base paths.
    alias: {
      '~mixins': abspath('src/mixins'),
      '~procs': abspath('src/procs'),
      '~components': abspath('src/components'),
      '~styles': abspath('src/styles'),
      '~pug-partials': abspath('src/pages/partials'),
      '~pages': abspath('src/pages'),
      '~page-commons': abspath('src/pages/_commons'),
      '~media': abspath('assets/media'),
      '@ilearn/modules': abspath('modules'),
    },
    extensions: [ '.mjs', '.esm.js', '.js', '.jsx', '.json' ],
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          { loader: 'css-loader', options: { importLoaders: 1 } },
          {
            loader: 'postcss-loader',
            options: { plugins: [
              require('autoprefixer'),
              require('cssnano'),
            ] },
          },
        ],
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.s(c|a)ss$/,
        exclude: /node_modules/,
        use: [
          { loader: 'css-loader', options: { importLoaders: 1 } },
          {
            loader: 'postcss-loader',
            options: { plugins: [
              require('autoprefixer'),
              require('cssnano'),
            ] },
          },
          {
            loader: 'sass-loader',
            options: { sassOptions: {
              includePaths: [ abspath('./src') ],
            }},
          },
        ],
      },
      {
        test: /\.(eot|ttf|woff|woff2)$/,
        use: [ {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            outputPath: 'fonts/',
          },
        } ],
      },
      {
        test: /\.pug$/,
        use: ['pug-loader'],
      },
      {
        test: /\.svg$/,
        use: [ 'svg-inline-loader' ],
      },
    ],
  },

  optimization: {
    splitChunks: {
      // chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          reuseExistingChunk: true,
        },
      },
    },
  },

  stats: {
    children: false,
    entrypoints: false,
    hash: false,
    modules: false,
    version: false,
    warnings: false,
    excludeAssets: /^(fonts|icons|atlas)\/.*/,
    assets: dotenv.flags.verbose === 'yes',
    assetsSort: 'name',
  },

  node: {
    global: false,
  },

  plugins: [
    new WebpackBar({ name: 'webext-ilearn', profile: false, basic: false }),
    new BundleAnalyzerPlugin({ analyzerMode: 'static', openAnalyzer: false, logLevel: 'error' }),
    new CopyWebpackPlugin(copySourceBundleRules, { copyUnmodified: true }),
    new MomentLocalesPlugin({ localesToKeep: ['fr'] }),
    dotenv.PackageEnv.webpackPlugin,
    ...staticPageGeneratorPlugins,
  ],
}
