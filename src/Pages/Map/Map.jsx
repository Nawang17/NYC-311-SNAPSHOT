import {
  Container,
  Title,
  Loader,
  Select,
  Text,
  Group,
  Paper,
  Card,
} from "@mantine/core";
import { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const boroughBounds = {
  MANHATTAN: [40.7831, -73.9712],
  BROOKLYN: [40.6782, -73.9442],
  QUEENS: [40.7282, -73.7949],
  BRONX: [40.8448, -73.8648],
  "STATEN ISLAND": [40.5795, -74.1502],
};
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

export default function MapPage() {
  const [complaints, setComplaints] = useState([]);
  const [limit, setLimit] = useState("500");
  const [borough, setBorough] = useState("CITYWIDE");
  const [loading, setLoading] = useState(true);
  const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let url = `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=${limit}&$order=created_date DESC`;
      if (borough !== "CITYWIDE") {
        url += `&borough=${borough}`;
      }
      try {
        const response = await axios.get(url, {
          headers: APP_TOKEN ? { "X-App-Token": APP_TOKEN } : undefined,
        });
        setComplaints(response.data);
      } catch (err) {
        console.error("Error fetching map data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [limit, borough]);

  const center =
    borough === "CITYWIDE"
      ? [40.7128, -74.006]
      : boroughBounds[borough] || [40.7128, -74.006];

  return (
    <Container size="xl" py="xl">
      <Text size="sm" c="gray.7" mb="lg">
        Visualize recent 311 complaints across New York City. Filter by borough
        and record limit to customize your view.
      </Text>

      <Card withBorder radius="md" shadow="xs" mb="lg" p="md">
        <Group align="flex-end">
          <Select
            label="Number of Complaints"
            value={limit}
            onChange={setLimit}
            data={[
              { value: "500", label: "Latest 500" },
              { value: "1000", label: "Latest 1,000" },
              { value: "2000", label: "Latest 2,000" },
              { value: "3000", label: "Latest 3,000" },
            ]}
            maw={200}
          />
          <Select
            label="Borough"
            value={borough}
            onChange={setBorough}
            data={[
              "CITYWIDE",
              "MANHATTAN",
              "BRONX",
              "BROOKLYN",
              "QUEENS",
              "STATEN ISLAND",
            ]}
            maw={200}
          />
        </Group>
      </Card>
      <Group mb="md" gap="xs">
        <Text size="xs" c="dimmed" fw={500}>
          Marker Legend:
        </Text>
        <Group gap="xs">
          <span
            style={{
              background: "#228be6",
              width: 12,
              height: 12,
              borderRadius: "50%",
            }}
          />
          <Text size="xs">Manhattan</Text>
          <span
            style={{
              background: "#40c057",
              width: 12,
              height: 12,
              borderRadius: "50%",
            }}
          />
          <Text size="xs">Brooklyn</Text>
          <span
            style={{
              background: "gold",
              width: 12,
              height: 12,
              borderRadius: "50%",
            }}
          />
          <Text size="xs">Queens</Text>
          <span
            style={{
              background: "red",
              width: 12,
              height: 12,
              borderRadius: "50%",
            }}
          />
          <Text size="xs">Bronx</Text>
          <span
            style={{
              background: "purple",
              width: 12,
              height: 12,
              borderRadius: "50%",
            }}
          />
          <Text size="xs">Staten Island</Text>
        </Group>
      </Group>
      <Card withBorder radius="md" p={0} style={{ overflow: "hidden" }}>
        {loading ? (
          <Loader my="xl" />
        ) : (
          <MapContainer
            center={center}
            zoom={borough === "CITYWIDE" ? 11 : 13}
            style={{ height: "600px", zIndex: 0 }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {complaints.map((item, idx) => {
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
        )}
      </Card>
    </Container>
  );
}
