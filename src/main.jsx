import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "leaflet/dist/leaflet.css";
import { BrowserRouter, Routes, Route } from "react-router";
import { MantineProvider } from "@mantine/core";
import ZipLookupPage from "./Pages/ZipLookup/ZipLookupPage.jsx";
import Header from "./component/Header.jsx";
import TrendsPage from "./Pages/Trends/TrendsPage.jsx";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <MantineProvider>
        <Header />
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/zip-lookup" element={<ZipLookupPage />} />
          <Route path="/trends" element={<TrendsPage />} />
        </Routes>
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>
);
