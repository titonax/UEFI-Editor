/**
 * Layout Component
 * 
 * Main application layout wrapper with consistent styling
 * @module components/Layout/Layout
 */

import { ReactNode } from "react";
import { Box, Container } from "@mantine/core";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps): JSX.Element {
  return (
    <Box style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Container fluid style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </Container>
    </Box>
  );
}
