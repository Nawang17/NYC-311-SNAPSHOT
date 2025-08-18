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
  Tooltip,
  Group,
  Badge,
} from "@mantine/core";
import { IconSearch, IconMapPin } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import MapModal from "./MapModal";

export default function ZipLookupPage() {
  const [zip, setZip] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState("500");
  const [page, setPage] = useState(1);

  const [mapOpen, setMapOpen] = useState(false);
  const [mapFocus, setMapFocus] = useState(null); // {lat, lon, id, title, address, when} | null

  const itemsPerPage = 10;
  const topRef = useRef(null);

  const hasCoords = (r) => {
    // NYC 311 has latitude/longitude fields; sometimes there's a "location" object too
    const lat =
      r?.latitude != null
        ? parseFloat(r.latitude)
        : r?.location?.coordinates?.[1];
    const lon =
      r?.longitude != null
        ? parseFloat(r.longitude)
        : r?.location?.coordinates?.[0];
    return Number.isFinite(lat) && Number.isFinite(lon);
  };

  const getCoords = (r) => {
    const lat =
      r?.latitude != null
        ? parseFloat(r.latitude)
        : r?.location?.coordinates?.[1];
    const lon =
      r?.longitude != null
        ? parseFloat(r.longitude)
        : r?.location?.coordinates?.[0];
    return { lat, lon };
  };
  const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;
  const handleSearch = async () => {
    if (!/^\d{5}$/.test(zip)) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }
    setError(null);
    setLoading(true);
    setResults([]);
    setPage(1);
    setMapFocus(null);

    try {
      // Request only the fields we use, including coordinates
      const url = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
      const params = {
        $limit: limit,
        $order: "created_date DESC",
        incident_zip: zip,
        $select: [
          "unique_key",
          "created_date",
          "complaint_type",
          "descriptor",
          "borough",
          "agency_name",
          "status",
          "incident_zip",
          "incident_address",
          "city",
          "latitude",
          "longitude",
          "location",
        ].join(","),
      };

      const response = await axios.get(url, {
        params,
        headers: APP_TOKEN ? { "X-App-Token": APP_TOKEN } : undefined,
      });
      const rows = Array.isArray(response.data) ? response.data : [];

      setResults(rows);
      if (rows.length === 0) setError("No complaints found for this ZIP code.");
    } catch (err) {
      const msg = err?.response
        ? `Error ${err.response.status}: ${err.response.statusText}`
        : "Failed to fetch data. Try again later.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [page]);

  const startIdx = (page - 1) * itemsPerPage;
  const paginatedResults = results.slice(startIdx, startIdx + itemsPerPage);
  const totalPages = Math.ceil(results.length / itemsPerPage);

  const boroughSummary = results.reduce((acc, item) => {
    if (item.borough) acc[item.borough] = (acc[item.borough] || 0) + 1;
    return acc;
  }, {});

  return (
    <Container size="xl" py="xl" ref={topRef}>
      <Card
        withBorder
        radius="md"
        shadow="xs"
        mb="xl"
        padding="md"
        bg="#f8f9fa"
      >
        <Text c="indigo.8" size="sm" fw={600}>
          ZIP Code Lookup
        </Text>
        <Text size="xs" pt={4} c="gray.7">
          Enter a NYC ZIP code to explore recent 311 complaints in that area.
        </Text>
      </Card>

      <Stack mb="xl">
        <Tooltip
          label="Must be 5-digit NYC ZIP code"
          position="right"
          withArrow
        >
          <TextInput
            label="ZIP Code"
            placeholder="e.g. 11372"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={5}
            radius="md"
          />
        </Tooltip>

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
          color="indigo"
        >
          {loading ? <Loader size="xs" /> : "Search"}
        </Button>
        {error && (
          <Text c="red" size="xs">
            {error}
          </Text>
        )}
      </Stack>

      {Object.keys(boroughSummary).length > 0 && (
        <Card withBorder shadow="xs" radius="md" mb="sm" p="sm">
          <Text size="xs" fw={500} mb={6}>
            Borough Summary
          </Text>
          <Group gap="xs">
            {Object.entries(boroughSummary).map(([b, count]) => (
              <Badge key={b} variant="light" color="indigo">
                {b}: {count}
              </Badge>
            ))}
          </Group>
        </Card>
      )}

      {results.length > 0 && (
        <>
          <Group justify="space-between" align="center" mb="sm">
            <Button
              variant="light"
              onClick={() => {
                setMapFocus(null); // show all pins
                setMapOpen(true);
              }}
              color="indigo"
              size="xs"
              leftSection={<IconMapPin size={14} />}
            >
              Show Map ({results.length.toLocaleString()})
            </Button>
            <Text size="xs" c="gray.7">
              Found {results.length.toLocaleString()} complaints in {zip}
            </Text>
          </Group>

          <Divider mb="md" />

          <Stack>
            {paginatedResults.map((item) => {
              const coordsAvailable = hasCoords(item);
              return (
                <Card
                  key={item.unique_key || item.created_date}
                  withBorder
                  shadow="sm"
                  padding="md"
                  radius="md"
                >
                  <Group justify="space-between" align="start">
                    <div>
                      <Text fw={600} mb={4}>
                        {item.complaint_type}
                      </Text>
                      <Text size="sm" c="gray.7" mb={4}>
                        {item.descriptor || "No description"} ·{" "}
                        {item.created_date?.split("T")[0]}
                      </Text>
                      <Text size="xs" c="gray.6" mb={4}>
                        Agency: {item.agency_name || "N/A"} · Borough:{" "}
                        {item.borough || "N/A"}
                      </Text>
                      <Text size="xs" c="indigo.7" fw={500}>
                        Status: {item.status || "Unknown"}
                      </Text>
                      {item.incident_address && (
                        <Text size="xs" c="gray.6" mt={4}>
                          Address: {item.incident_address}
                          {item.city ? `, ${item.city}` : ""}
                        </Text>
                      )}
                    </div>
                  </Group>
                </Card>
              );
            })}

            {totalPages > 1 && (
              <Pagination
                mt="md"
                value={page}
                onChange={setPage}
                total={totalPages}
              />
            )}
          </Stack>
        </>
      )}

      <MapModal
        opened={mapOpen}
        onClose={() => setMapOpen(false)}
        zip={zip}
        results={results}
        focus={mapFocus} // NEW: optional single-report focus
      />
    </Container>
  );
}
