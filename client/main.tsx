import "./global.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

// Check if root is already created to prevent HMR double-mounting
declare global {
  interface Window {
    __viteReactRoot?: any;
  }
}

if (!window.__viteReactRoot) {
  window.__viteReactRoot = createRoot(rootElement);
}

window.__viteReactRoot.render(<App />);
