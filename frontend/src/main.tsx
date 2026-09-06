import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "katex/dist/katex.min.css";
import App from "./Studio";
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
