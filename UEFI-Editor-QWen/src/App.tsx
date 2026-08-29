/**
 * Main Application Component
 * 
 * Root component that orchestrates the UEFI Editor application
 * @module App
 */

import { useState, useCallback } from "react";
import type { Data } from "./core/types";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import Layout from "./components/Layout/Layout";
import FileUploads from "./components/FileUploads/FileUploads";
import Navigation from "./components/Navigation/Navigation";
import FormUi from "./components/FormUi/FormUi";
import { useNotifications } from "@mantine/notifications";

/**
 * Props for the App component
 */
interface AppProps {
  /** Initial data to load (optional) */
  initialData?: Data;
}

/**
 * Main application component
 * 
 * Manages global state and coordinates between sub-components:
 * - File uploads for firmware images
 * - Navigation tree for menu structure
 * - Form UI for editing setup values
 */
export default function App({ initialData }: AppProps = {}): JSX.Element {
  const notifications = useNotifications();
  
  const [firmwareData, setFirmwareData] = useState<Data | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles successful data load from uploaded files
   * @param data - Loaded firmware data
   */
  const handleDataLoad = useCallback((data: Data): void => {
    setFirmwareData(data);
    setError(null);
    notifications.show({
      title: "Success",
      message: "Firmware data loaded successfully",
      color: "green",
    });
  }, [notifications]);

  /**
   * Handles errors during file upload or parsing
   * @param errorMessage - Error message to display
   */
  const handleError = useCallback((errorMessage: string): void => {
    setError(errorMessage);
    setFirmwareData(null);
    notifications.show({
      title: "Error",
      message: errorMessage,
      color: "red",
    });
  }, [notifications]);

  /**
   * Updates firmware data with new modifications
   * @param newData - Updated firmware data
   */
  const handleDataUpdate = useCallback((newData: Data): void => {
    setFirmwareData(newData);
  }, []);

  /**
   * Clears all loaded data and resets state
   */
  const handleReset = useCallback((): void => {
    setFirmwareData(null);
    setError(null);
    notifications.show({
      title: "Reset",
      message: "Application reset successfully",
      color: "blue",
    });
  }, [notifications]);

  return (
    <Layout>
      <Header 
        firmwareData={firmwareData}
        onReset={handleReset}
      />
      
      <main style={{ flex: 1, overflow: "auto" }}>
        {firmwareData === null ? (
          <FileUploads 
            onDataLoad={handleDataLoad}
            onError={handleError}
            isLoading={isLoading}
          />
        ) : (
          <div style={{ display: "flex", height: "100%", gap: "1rem" }}>
            <Navigation 
              data={firmwareData}
              onDataUpdate={handleDataUpdate}
            />
            <FormUi 
              data={firmwareData}
              onDataUpdate={handleDataUpdate}
            />
          </div>
        )}
        
        {error !== null && (
          <div style={{ color: "red", padding: "1rem" }}>
            {error}
          </div>
        )}
      </main>
      
      <Footer version="1.0.0" />
    </Layout>
  );
}
