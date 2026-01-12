import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PWAUpdatePrompt } from "./components/pwa/PWAUpdatePrompt";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <PWAUpdatePrompt />
  </React.StrictMode>
);
