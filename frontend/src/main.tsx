import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  createRoot(rootElement).render(
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  );
} catch (e) {
  console.error("Failed to mount React app:", e);
  document.body.innerHTML = `<div style="color: red; padding: 20px;">
    <h1>Application Error</h1>
    <p>Failed to start the application.</p>
    <pre>${e instanceof Error ? e.message : String(e)}</pre>
  </div>`;
}
