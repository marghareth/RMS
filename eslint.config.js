import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // These two rules come from the experimental "React Compiler readiness"
      // preset bundled with eslint-config-next 16. They flag standard,
      // working patterns (setState in an effect reacting to a prop/query
      // change, Date.now() used for a default value) as errors even though
      // nothing is functionally broken. Downgraded to warnings so real
      // issues aren't drowned out; revisit if/when opting into the React
      // Compiler.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;
