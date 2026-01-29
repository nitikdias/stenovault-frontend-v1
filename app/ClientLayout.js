"use client";

import TokenRefreshManager from "./components/TokenRefreshManager";

// ✅ Token refresh is now handled by TokenRefreshManager component
// This component provides the client-side boundary for the token refresh logic

export default function ClientLayout({ children }) {
  console.log("🎨 ClientLayout: Rendering");
  
  return (
    <>
      <TokenRefreshManager />
      {children}
    </>
  );
}
