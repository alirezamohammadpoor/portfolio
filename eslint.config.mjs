import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  { ignores: [".next/**", "out/**", "next-env.d.ts"] },
  ...nextCoreWebVitals,
  {
    // eslint-config-next 16 pulls in eslint-plugin-react-hooks v7, whose new
    // rules flag pre-existing code that lint never checked (the old FlatCompat
    // config crashed before it linted anything). Downgraded to warnings to keep
    // the upgrade behaviour-neutral.
    // TODO: burn down and restore to "error".
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
