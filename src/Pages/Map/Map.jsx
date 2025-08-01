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

export default function MapPage() {
  const [complaints, setComplaints] = useState([]);
  const [limit, setLimit] = useState("500");
  const [borough, setBorough] = useState("CITYWIDE");
  const [loading, setLoading] = useState(true);

  const icon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let url = `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=${limit}&$order=created_date DESC`;
      if (borough !== "CITYWIDE") {
        url += `&borough=${borough}`;
      }
      try {
        const response = await axios.get(url);
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
      <Card
        withBorder
        radius="md"
        shadow="xs"
        mb="xl"
        padding="md"
        style={{ backgroundColor: "#f8f9fa" }}
      >
        <Text c="blue.8" size="sm" fw={600}>
          311 Complaints Map
        </Text>
        <Text size="xs" pt="5px" c="gray.7">
          View recent 311 complaints across NYC. Use the options below to
          customize the data.
        </Text>
      </Card>
      <Group mb="lg">
        <Select
          label="Complaint Limit"
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

      {loading ? (
        <Loader />
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
              <Marker key={idx} position={[lat, lon]} icon={icon}>
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
    </Container>
  );
}
