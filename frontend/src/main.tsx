import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");
  
  createRoot(rootElement).render(<App />);
} catch (e) {
  console.error("Failed to mount React app:", e);
  document.body.innerHTML = `<div style="color: red; padding: 20px;">
    <h1>Application Error</h1>
    <p>Failed to start the application.</p>
    <pre>${e instanceof Error ? e.message : String(e)}</pre>
  </div>`;
}
