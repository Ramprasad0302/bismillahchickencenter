import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import App from "./App";
import api from "./services/api";
import { installHttpCache } from "./services/httpCache";
import "./index.css";

// Pages use both the shared `api` instance and plain axios; cache both.
installHttpCache(axios);
installHttpCache(api);

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
