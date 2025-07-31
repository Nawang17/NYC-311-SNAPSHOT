import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Text,
  Loader,
  Select,
  Group,
  Paper,
  Divider,
  Stack,
  Badge,
  List,
  ThemeIcon,
  Button,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
} from "@tabler/icons-react";
import axios from "axios";

export default function HomePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borough, setBorough] = useState("ALL");
  const [limit, setLimit] = useState(3000);
  const [showAllComplaints, setShowAllComplaints] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const baseURL = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
        const query = borough === "ALL" ? "" : `&borough=${borough}`;
        const response = await axios.get(
          `${baseURL}?$limit=${limit}&$order=created_date DESC${query}`
        );
        setData(response.data);
        console.log("Fetched 311 data:", response.data);
      } catch (error) {
        console.error("Failed to fetch 311 data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [borough, limit]);

  const boroughs = [
    "ALL",
    "BROOKLYN",
    "MANHATTAN",
    "BRONX",
    "QUEENS",
    "STATEN ISLAND",
  ];

  const limitOptions = [
    { label: "500", value: "500" },
    { label: "1,000", value: "1000" },
    { label: "3,000  (Default)", value: "3000" },
    { label: "5,000", value: "5000" },
    { label: "10,000", value: "10000" },
    { label: "15,000", value: "15000" },
    { label: "20,000", value: "20000" },
    { label: "25,000", value: "25000" },
    { label: "30,000 (May slow browser)", value: "30000" },
  ];

  const countByField = (field) => {
    const counts = {};
    data.forEach((item) => {
      const key = item[field] || "Unknown";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const totalComplaints = data.length;
  const topComplaints = countByField("complaint_type").slice(0, 5);
  const statusBreakdown = countByField("status");

  const getStatusIcon = (status) => {
    if (status.toLowerCase().includes("closed")) {
      return (
        <ThemeIcon color="green" size={20} radius="xl">
          <IconCircleCheck size={14} />
        </ThemeIcon>
      );
    } else if (status.toLowerCase().includes("open")) {
      return (
        <ThemeIcon color="yellow" size={20} radius="xl">
          <IconInfoCircle size={14} />
        </ThemeIcon>
      );
    } else {
      return (
        <ThemeIcon color="gray" size={20} radius="xl">
          <IconAlertTriangle size={14} />
        </ThemeIcon>
      );
    }
  };

  return (
    <Container size="lg">
      <Title mt="md" order={1} fw={700} c="blue.7">
        NYC 311 Snapshot
      </Title>
      <Text mt="sm" c="dimmed" size="sm">
        Explore recent 311 service requests across New York City. This snapshot
        covers the most recent {limit.toLocaleString()} complaints{" "}
        {borough !== "ALL" ? `from ${borough}` : "citywide"}.
      </Text>

      <Group mt="lg" gap="md" wrap="wrap">
        <Select
          label="Filter by Borough"
          placeholder="All Boroughs"
          data={boroughs}
          value={borough}
          onChange={(value) => setBorough(value || "ALL")}
          w={250}
          size="sm"
          radius="md"
        />
        <Select
          label="How many complaints?"
          data={limitOptions}
          value={limit.toString()}
          onChange={(value) => setLimit(Number(value))}
          w={250}
          size="sm"
          radius="md"
        />
      </Group>

      {loading ? (
        <Loader mt="xl" size="lg" color="blue" />
      ) : (
        <Stack gap="xl" mt="xl">
          <Paper shadow="md" radius="lg" p="lg" withBorder bg="gray.0">
            <Group justify="space-between">
              <Text size="lg" fw={600}>
                Summary for {borough === "ALL" ? "All Boroughs" : borough}
              </Text>
              <Badge size="lg" color="blue" variant="filled">
                {totalComplaints.toLocaleString()} Complaints
              </Badge>
            </Group>
            <Text size="sm" mt="xs" c="dimmed">
              Data pulled live from{" "}
              <a
                href="https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2010-to-Present/erm2-nwe9/about_data"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#228be6", textDecoration: "underline" }}
              >
                NYC Open Data
              </a>
              .
            </Text>
          </Paper>

          <Paper shadow="xs" radius="md" p="md" withBorder>
            <Text fw={600} mb="sm" size="md" c="blue.6">
              Complaint Types
            </Text>

            <List
              spacing="xs"
              size="sm"
              icon={
                <ThemeIcon color="blue" size={20} radius="xl">
                  <IconAlertTriangle size={14} />
                </ThemeIcon>
              }
            >
              {(showAllComplaints
                ? countByField("complaint_type")
                : topComplaints
              ).map((item, index) => (
                <List.Item key={index}>
                  {item.name}: <strong>{item.value.toLocaleString()}</strong>
                </List.Item>
              ))}
            </List>

            <Button
              variant="subtle"
              size="xs"
              mt="sm"
              onClick={() => setShowAllComplaints((prev) => !prev)}
            >
              {showAllComplaints
                ? "Show Top 5 Only"
                : "Show All Complaint Types"}
            </Button>
          </Paper>

          <Paper shadow="xs" radius="md" p="md" withBorder>
            <Text fw={600} mb="sm" size="md" c="green.7">
              Complaint Status Breakdown
            </Text>
            <List spacing="xs" size="sm">
              {statusBreakdown.map((item, index) => (
                <List.Item key={index} icon={getStatusIcon(item.name)}>
                  {item.name}: <strong>{item.value.toLocaleString()}</strong>
                </List.Item>
              ))}
            </List>
          </Paper>

          <Divider
            label="More Insights Coming Soon"
            labelPosition="center"
            my="lg"
            color="blue"
          />
        </Stack>
      )}
    </Container>
  );
}
