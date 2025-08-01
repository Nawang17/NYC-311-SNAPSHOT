import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const markerIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function ComplaintMap({ complaints, borough }) {
  const validComplaints = complaints
    .filter((c) => c.latitude && c.longitude)
    .slice(0, 800); // Limit to 500 complaints for performance

  const boroughCenterMap = {
    MANHATTAN: [40.7831, -73.9712],
    BROOKLYN: [40.6782, -73.9442],
    QUEENS: [40.7282, -73.7949],
    BRONX: [40.8448, -73.8648],
    "STATEN ISLAND": [40.5795, -74.1502],
    ALL: [40.7128, -74.006], // NYC
  };

  const center = boroughCenterMap[borough] || boroughCenterMap["ALL"];
  const zoom = borough === "ALL" ? 11 : 12;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "500px", width: "100%", marginTop: "2rem" }}
      key={borough} // force re-render when borough changes
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {validComplaints.map((c, idx) => (
        <Marker
          key={idx}
          position={[parseFloat(c.latitude), parseFloat(c.longitude)]}
          icon={markerIcon}
        >
          <Popup>
            <strong>{c.complaint_type}</strong>
            <br />
            {c.descriptor}
            <br />
            {c.borough}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
