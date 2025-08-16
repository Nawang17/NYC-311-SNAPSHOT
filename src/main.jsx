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
import BoroughsPage from "./Pages/Borough/Borough.jsx";
import MapPage from "./Pages/Map/Map.jsx";
import AppFooter from "./component/Footer.jsx";
import AboutPage from "./Pages/About/About.jsx";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <MantineProvider>
        <Header />
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/zip-lookup" element={<ZipLookupPage />} />
          <Route path="/trends" element={<TrendsPage />} />

          <Route path="/borough/:slug" element={<BoroughsPage />} />
          <Route path="/map" element={<MapPage />} />

          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
        <AppFooter />
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>
);
