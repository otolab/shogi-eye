// rollup.config.js

import fs from 'fs'

// import babel        from 'rollup-plugin-babel'
import importAlias  from 'rollup-plugin-import-alias'
import nodeResolve  from 'rollup-plugin-node-resolve'
import commonjs     from 'rollup-plugin-commonjs'
import nodeBuiltins from 'rollup-plugin-node-builtins'
import nodeGlobals  from 'rollup-plugin-node-globals'
import postprocess  from 'rollup-plugin-postprocess'
import css          from '@henrikjoreteg/rollup-plugin-css'

// import {terser}     from 'rollup-plugin-terser'
// import {sizeSnapshot} from "rollup-plugin-size-snapshot"
import analyze from 'rollup-plugin-analyzer'

import vue          from 'rollup-plugin-vue'
import postcssFontAwesome from 'postcss-font-awesome'

import webWorkerLoader from 'rollup-plugin-web-worker-loader'

const base = {

  plugins: [
    importAlias({
      Paths: {
        "opencv": __dirname+"/src/libs/opencv.js",
        "libs": "./src/libs"
      },
    }),

    webWorkerLoader({
      inline: true,
      // loadPath: '/assets/'
    }),

    // CommonJSモジュールをES6に変換
    commonjs({
      exclude: ["**/*.worker.js"],
      extensions: [ '.js' ],
    }),

    nodeGlobals(),

    nodeBuiltins(),

    // npmモジュールを`node_modules`から読み込む
    nodeResolve({ jsnext: true }),

    // .vueのrequire
    vue({
      css: true, // dynamically inject
      postcss: [
        postcssFontAwesome({
          replacement: false
        })
      ],
    }),

    css({
      output: './docs/demo/assets/s.css',
    }),

    // babel({
    //   exclude: 'node_modules/**',
    //   runtimeHelpers: true,
    //   babelrc: false,
    //   presets: [
    //     [
    //       '@babel/env',
    //       {
    //         modules: false,
    //         "targets": {
    //           "browsers": [
    //             "> 1%",
    //             "last 2 versions",
    //             "not ie <= 12"
    //           ]
    //         }
    //       }
    //     ]
    //   ],
    //   "plugins": [
    //     "transform-es2015-destructuring",
    //   ]
    // }),

    analyze({
      writeTo: (analysisString) => fs.writeFileSync('analysis.txt', analysisString)
    }),

    // sizeSnapshot(),
 
    // terser(),
  ],
}


export default Object.assign({
    input: `./src/index.js`,
    output: {
      file: `./docs/demo/assets/index.js`,
      format: 'es',
      sourcemap: false,
    }
  }, base)

