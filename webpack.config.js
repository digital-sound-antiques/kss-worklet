import path from 'path';
import WorkerUrlPlugin from 'worker-url/plugin.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default {
  mode: 'development',
  // devtool: 'source-map',
  entry: {
    index: './src/index.ts',
  },
  resolve: {
    extensions: ['.js', ',jsx', '.ts', '.tsx'],
    extensionAlias: {
      '.js': ['.ts', '.js'],
      '.mjs': ['.mts', '.mjs'],
    },
    fallback: {
      fs: false,
      path: false,
    }
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader'
        }
      }
    ],
  },
  experiments: {
    outputModule: true,
  },
  output: {
    publicPath: '/kss-worklet/js/',
    path: path.resolve(__dirname, 'public/kss-worklet/js'),
    filename: '[name].js',
    library: {
      type: 'module'
    },
  },
  plugins: [
    new WorkerUrlPlugin()
  ],
  stats: {
    modules: false,
    children: false,
    entrypoints: false,
  },
};