// 🚀 BUNDLE SPLITTING CONFIGURATION
// Este archivo personaliza el webpack de Create React App usando CRACO
// para implementar bundle splitting y optimizaciones de carga

const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // 📦 OPTIMIZACIÓN: Bundle Splitting para mejorar carga inicial
      if (env === 'production') {
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            // Separar vendor libraries en un chunk separado
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 20,
            },
            // Separar React en su propio chunk
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 30,
            },
            // Separar bibliotecas grandes como Supabase
            supabase: {
              test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
              name: 'supabase',
              chunks: 'all',
              priority: 25,
            },
            // Componentes comunes de la aplicación
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        };

        // 🎯 OPTIMIZACIÓN: Configurar nombres de chunks más descriptivos
        webpackConfig.optimization.chunkIds = 'named';
        webpackConfig.optimization.moduleIds = 'named';
      }

      // 📊 OPTIMIZACIÓN: Preload de chunks críticos
      webpackConfig.module.rules.push({
        test: /\.(js|jsx)$/,
        include: path.resolve(__dirname, 'src/components'),
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react'],
            plugins: [
              // Plugin para añadir preload hints
              '@babel/plugin-syntax-dynamic-import',
            ],
          },
        },
      });

      return webpackConfig;
    },
  },
  // 🚀 OPTIMIZACIÓN: DevServer optimizations para desarrollo
  devServer: {
    // Comprimir archivos durante desarrollo
    compress: true,
    // Cache de archivos estáticos
    static: {
      directory: path.join(__dirname, 'public'),
    },
  },
};
