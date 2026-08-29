import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";
import importPlugin from "eslint-plugin-import";
import jsdoc from "eslint-plugin-jsdoc";
import security from "eslint-plugin-security";
import prettier from "eslint-plugin-prettier";

export default tseslint.config(
  { ignores: ["dist", "build", "node_modules", "coverage", "*.min.js"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
      jsdoc.configs["flat/recommended-typescript-error"],
      security.configs.recommended,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
    settings: { 
      react: { version: "detect" },
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "react-x": reactX,
      "react-dom": reactDom,
      prettier,
    },
    rules: {
      // React Hooks
      ...reactHooks.configs.recommended.rules,
      
      // React Refresh
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      
      // React Best Practices
      ...reactX.configs["recommended-typescript"].rules,
      ...reactDom.configs.recommended.rules,
      
      // Prettier integration
      "prettier/prettier": ["error", {}, { usePrettierrc: true }],
      
      // TypeScript strict rules
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { 
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/strict-boolean-expressions": [
        "warn",
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: true,
          allowNullableBoolean: true,
          allowNullableString: true,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],
      
      // Import organization
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-duplicates": "error",
      "import/no-unresolved": "error",
      "import/named": "error",
      
      // JSDoc requirements
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          publicOnly: true,
          exemptEmptyConstructors: true,
        },
      ],
      "jsdoc/require-param-type": "off",
      "jsdoc/require-return-type": "off",
      
      // Security
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-eval-with-expression": "error",
      
      // General best practices
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      
      // Code complexity
      complexity: ["warn", { max: 15 }],
      "max-depth": ["warn", { max: 4 }],
      "max-lines-per-function": ["warn", { max: 80 }],
      "max-params": ["warn", { max: 4 }],
      "max-statements": ["warn", { max: 30 }],
      
      // Naming conventions
      camelcase: ["error", { properties: "never", allow: ["^UNSAFE_"] }],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: {
            regex: "^I[A-Z]",
            match: false,
          },
        },
        {
          selector: "typeAlias",
          format: ["PascalCase"],
        },
        {
          selector: "enumMember",
          format: ["PascalCase"],
        },
      ],
      
      // Disable conflicting rules
      "jsdoc/require-returns-check": "off",
      "jsdoc/require-param": "off",
    },
  }
);
