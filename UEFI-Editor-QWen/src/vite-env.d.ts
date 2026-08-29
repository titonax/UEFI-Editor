/// <reference types="vite/client" />

/**
 * Vite environment type declarations
 * Extends ImportMeta with Vite-specific properties
 */

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_URL?: string;
  readonly VITE_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Module declarations for CSS modules
 */
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

/**
 * Module declarations for image assets
 */
declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

declare module "*.gif" {
  const content: string;
  export default content;
}

declare module "*.webp" {
  const content: string;
  export default content;
}
