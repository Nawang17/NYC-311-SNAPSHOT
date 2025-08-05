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
  const itemsPerPage = 10;
  const topRef = useRef(null);

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
      const msg = err.response
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
        <Text c="blue.8" size="sm" fw={600}>
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

      {Object.keys(boroughSummary).length > 0 && (
        <Card shadow="xs" radius="md" mb="sm" p="sm">
          <Text size="xs" fw={500} mb={4}>
            Borough Summary
          </Text>
          {Object.entries(boroughSummary).map(([b, count]) => (
            <Text size="xs" key={b}>
              {b}: {count}
            </Text>
          ))}
        </Card>
      )}

      {results.length > 0 && (
        <>
          <Button
            variant="light"
            onClick={() => setMapOpen(true)}
            color="blue"
            size="xs"
            mb="sm"
            leftSection={<IconMapPin size={14} />}
          >
            Show Map
          </Button>

          <Divider
            label={`Found ${results.length} complaints in ${zip}`}
            labelPosition="center"
            mb="md"
          />

          <Stack>
            {paginatedResults.map((item, index) => (
              <Card key={index} withBorder shadow="sm" padding="md" radius="md">
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
                <Text size="xs" c="blue.7" fw={500}>
                  Status: {item.status || "Unknown"}
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
        </>
      )}

      <MapModal
        opened={mapOpen}
        onClose={() => setMapOpen(false)}
        zip={zip}
        results={results}
      />
    </Container>
  );
}
