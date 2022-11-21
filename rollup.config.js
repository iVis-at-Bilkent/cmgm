import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import pkg from './package.json';
import { terser } from 'rollup-plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';

export default [
	// browser-friendly UMD build
	{
		input: 'src/complexity-manager.js',
		output: {
			name: 'cmgm',
			file: pkg.browser,
			format: 'umd',
			exports: 'auto',
			plugins: [isProduction && terser()]
		},
		plugins: [
			nodeResolve(), // so Rollup can find `ms`
			commonjs(), // so Rollup can convert `ms` to an ES module
/* 			babel({
				exclude: ['node_modules/**']
			}) */
		]
	},

	// CommonJS (for Node) and ES module (for bundlers) build.
	// (We could have three entries in the configuration array
	// instead of two, but it's quicker to generate multiple
	// builds from a single configuration where possible, using
	// an array for the `output` option, where we can specify 
	// `file` and `format` for each target)
	{
		input: 'src/complexity-manager.js',
		external: [],
		output: [
			{ file: pkg.main, format: 'cjs', exports: 'auto', plugins: [isProduction && terser()] },
			{ file: pkg.module, format: 'es', exports: 'auto', plugins: [isProduction && terser()] }
		],
/* 		plugins: [
			babel({
				exclude: ['node_modules/**']
			})
		] */
	}
];
