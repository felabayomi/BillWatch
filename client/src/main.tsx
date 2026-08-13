import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) throw new Error("VITE_CLERK_PUBLISHABLE_KEY must be set");
const isSatellite = import.meta.env.VITE_CLERK_IS_SATELLITE === "true";

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={publishableKey}
    afterSignOutUrl="/"
    isSatellite={isSatellite}
    domain={isSatellite ? import.meta.env.VITE_CLERK_DOMAIN : undefined}
    signInUrl={isSatellite ? import.meta.env.VITE_CLERK_SIGN_IN_URL : undefined}
    signUpUrl={isSatellite ? import.meta.env.VITE_CLERK_SIGN_UP_URL : undefined}
  >
    <App />
  </ClerkProvider>,
);
