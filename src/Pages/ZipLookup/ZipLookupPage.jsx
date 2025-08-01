import {
  Container,
  Text,
  TextInput,
  Button,
  Card,
  Stack,
  Loader,
  Divider,
  Select,
  Pagination,
  Modal,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

export default function ZipLookupPage() {
  const [zip, setZip] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState("500");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const topRef = useRef(null);
  const icon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  const getAverageLatLng = (data) => {
    const validCoords = data
      .map((item) => ({
        lat: parseFloat(item.latitude),
        lon: parseFloat(item.longitude),
      }))
      .filter((coord) => !isNaN(coord.lat) && !isNaN(coord.lon));

    if (validCoords.length === 0) return [40.7128, -74.006]; // default to NYC

    const avgLat =
      validCoords.reduce((sum, item) => sum + item.lat, 0) / validCoords.length;
    const avgLon =
      validCoords.reduce((sum, item) => sum + item.lon, 0) / validCoords.length;

    return [avgLat, avgLon];
  };

  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [page]);
  const handleSearch = async () => {
    if (!zip.match(/^\d{5}$/)) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }
    setError(null);
    setLoading(true);
    setResults([]);
    setPage(1);
    try {
      const response = await axios.get(
        `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=${limit}&$order=created_date DESC&incident_zip=${zip}`
      );
      setResults(response.data);
      if (response.data.length === 0) {
        setError("No complaints found for this ZIP code.");
      }
    } catch (err) {
      setError("Failed to fetch data. Try again later." + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedResults = results.slice(startIdx, endIdx);
  const totalPages = Math.ceil(results.length / itemsPerPage);
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <>
      <Container size="xl" py="xl" ref={topRef}>
        <Card
          withBorder
          radius="md"
          shadow="xs"
          mb="xl"
          padding="md"
          style={{ backgroundColor: "#f8f9fa" }}
        >
          <Text c="blue.8" size="sm" fw={600}>
            ZIP Code Lookup
          </Text>
          <Text size="xs" pt="5px" c="gray.7">
            Enter a NYC ZIP code to explore recent 311 complaints in that area.
          </Text>
        </Card>
        <Stack mb="xl">
          <TextInput
            label="ZIP Code"
            placeholder="e.g. 11372"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            maxLength={5}
            radius="md"
          />
          <Select
            label="Number of Records"
            data={[
              { value: "500", label: "Latest 500" },
              { value: "1000", label: "Latest 1,000" },
              { value: "2000", label: "Latest 2,000" },
              { value: "3000", label: "Latest 3,000" },
            ]}
            value={limit}
            onChange={setLimit}
            radius="md"
          />
          <Button
            leftSection={<IconSearch size={16} />}
            onClick={handleSearch}
            disabled={loading || !zip}
            color="blue"
          >
            {loading ? <Loader size="xs" /> : "Search"}
          </Button>
          {error && (
            <Text c="red" size="xs">
              {error}
            </Text>
          )}
        </Stack>
        {results.length > 0 && (
          <Button
            variant="light"
            onClick={() => setMapOpen(true)}
            color="blue"
            size="xs"
            mb="sm"
            style={{ alignSelf: "flex-start" }}
          >
            Show Map
          </Button>
        )}

        {results.length > 0 && (
          <Stack>
            <Divider
              label={`Found ${results.length} complaints in ${zip}`}
              labelPosition="center"
              mb="md"
            />
            {paginatedResults.map((item, index) => (
              <Card key={index} withBorder shadow="sm" padding="md" radius="md">
                <Text fw={600} mb={4}>
                  {item.complaint_type}
                </Text>
                <Text size="sm" c="gray.7" mb={4}>
                  {item.descriptor || "No description"} ·{" "}
                  {item.created_date?.split("T")[0]}
                </Text>
                <Text size="xs" c="gray.6">
                  Agency: {item.agency_name || "N/A"} · Borough:{" "}
                  {item.borough || "N/A"}
                </Text>
              </Card>
            ))}
            {totalPages > 1 && (
              <Pagination
                mt="md"
                value={page}
                onChange={setPage}
                total={totalPages}
              />
            )}
          </Stack>
        )}
        <Modal
          opened={mapOpen}
          onClose={() => setMapOpen(false)}
          title={`311 Complaints Map for ${zip} - ${results.length} records`}
          size="xl"
          centered
        >
          <MapContainer
            center={getAverageLatLng(results)}
            zoom={14}
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
        </Modal>
      </Container>
    </>
  );
}
