import { Modal, Text } from "@mantine/core";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const defaultCenter = [40.7128, -74.006]; // NYC fallback

const boroughIcons = {
  MANHATTAN: new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  }),
  BROOKLYN: new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  }),
  QUEENS: new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  }),
  BRONX: new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  }),
  "STATEN ISLAND": new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  }),
  default: new L.Icon.Default(),
};

const getAverageLatLng = (data) => {
  const validCoords = data
    .map((item) => ({
      lat: parseFloat(item.latitude),
      lon: parseFloat(item.longitude),
    }))
    .filter((coord) => !isNaN(coord.lat) && !isNaN(coord.lon));

  if (validCoords.length === 0) return defaultCenter;

  const avgLat =
    validCoords.reduce((sum, item) => sum + item.lat, 0) / validCoords.length;
  const avgLon =
    validCoords.reduce((sum, item) => sum + item.lon, 0) / validCoords.length;

  return [avgLat, avgLon];
};

export default function MapModal({ opened, onClose, zip, results }) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`311 Complaints Map for ${zip} - ${results.length} records`}
      size="xl"
      centered
    >
      <MapContainer
        center={getAverageLatLng(results)}
        zoom={13}
        style={{ height: "500px", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {results.map((item, idx) => {
          const lat = parseFloat(item.latitude);
          const lon = parseFloat(item.longitude);
          if (!lat || !lon) return null;
          return (
            <Marker
              key={idx}
              position={[lat, lon]}
              icon={boroughIcons[item.borough] || boroughIcons.default}
            >
              <Popup>
                <Text fw={600}>{item.complaint_type}</Text>
                <Text size="sm">{item.descriptor}</Text>
                <Text size="xs" c="gray">
                  {item.borough} · {item.created_date?.split("T")[0]}
                </Text>
                <Text size="xs" c="blue.6" mt={4}>
                  Status: {item.status || "Unknown"}
                </Text>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </Modal>
  );
}
