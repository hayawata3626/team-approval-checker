// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'
import license from 'rollup-plugin-license'

const config = {
  input: 'src/index.ts',
  output: {
    esModule: true,
    file: 'dist/index.js',
    format: 'es',
    sourcemap: false
  },
  plugins: [
    typescript(),
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
    json(),
    license({
      thirdParty: {
        output: { file: 'dist/licenses.txt' }
      }
    })
  ]
}

export default config
