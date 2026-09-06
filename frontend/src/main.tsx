import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fasl-work/caos-app-shell/styles.css";
import "./floraria.css";
import App from "./App";
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
