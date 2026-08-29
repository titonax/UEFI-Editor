/**
 * UEFI Editor QWen - Main Entry Point
 * 
 * A modern, modular UEFI/BIOS Setup Editor built with React and TypeScript.
 * This application allows users to view and modify UEFI firmware setup configurations.
 * 
 * @module main
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import { Notifications } from "@mantine/notifications";
import App from "./App";

/**
 * Application theme configuration
 */
const theme = createTheme({
  primaryColor: "blue",
  fontFamily: "Inter, sans-serif",
  headings: {
    fontFamily: "Inter, sans-serif",
  },
  colors: {
    blue: [
      "#e7f5ff",
      "#d0ebff",
      "#a5d8ff",
      "#74c0fc",
      "#4dabf7",
      "#339af0",
      "#228be6",
      "#1c7ed6",
      "#1971c2",
      "#1864ab",
    ],
  },
  radius: {
    lg: "8px",
  },
});

/**
 * Initializes and mounts the React application
 */
function initializeApp(): void {
  const rootElement: HTMLElement | null = document.getElementById("root");

  if (rootElement === null) {
    throw new Error(
      "Failed to mount application: root element not found in DOM"
    );
  }

  const root = createRoot(rootElement);

  root.render(
    <StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" autoClose={5000} />
        <App />
      </MantineProvider>
    </StrictMode>
  );
}

// Initialize application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
