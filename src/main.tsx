import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PWAInstallPrompt } from "./components/pwa/PWAInstallPrompt";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <PWAInstallPrompt />
  </React.StrictMode>
);
