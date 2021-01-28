import { uglify } from 'rollup-plugin-uglify';

export default {
    input: 'index.js',
    output: {
        file: 'dist/jsonrpc.bundle.js',
        format: 'umd',
        name: 'TINYRPC'
    },
    plugins: [
        uglify()
    ]
};
