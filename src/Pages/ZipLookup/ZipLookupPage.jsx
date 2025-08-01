import {
  Container,
  Title,
  Text,
  TextInput,
  Button,
  Card,
  Stack,
  Loader,
  Group,
  Divider,
  ThemeIcon,
  Select,
  Pagination,
} from "@mantine/core";
import { IconMapPin, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import axios from "axios";

export default function ZipLookupPage() {
  const [zip, setZip] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState("1000");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

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

  return (
    <>
      <Container size="xl" py="xl">
        <Group align="center" mb="sm">
          <ThemeIcon color="blue" variant="light" size="lg">
            <IconMapPin size={20} />
          </ThemeIcon>
          <Title order={2} c="blue.7">
            ZIP Code Lookup
          </Title>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Enter a NYC ZIP code to explore recent 311 complaints in that area.
        </Text>

        <Stack mb="xl">
          <TextInput
            label="ZIP Code"
            placeholder="e.g. 10027"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            maxLength={5}
            radius="md"
          />
          <Select
            label="Number of Records"
            data={[
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
      </Container>
    </>
  );
}
