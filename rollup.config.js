import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import typescript from "rollup-plugin-typescript";
import { terser } from "rollup-plugin-terser";
import styles from "rollup-plugin-styles";
import image from "@rollup/plugin-image";
import pkg from "./package.json";

export default [
  {
    input: "src/main.ts",
    output: {
      name: "relay-www",
      file: pkg.browser,
      format: "umd",
    },
    plugins: [
      resolve(),
      commonjs(),
      styles(),
      typescript(),
      image(),
      terser({ output: { comments: false } }),
    ],
  },
  {
    input: "src/main.ts",
    plugins: [
      typescript(),
      styles(),
      image(),
      terser({ output: { comments: false } }),
    ],
    output: [{ file: pkg.module, format: "es" }],
  },
];
