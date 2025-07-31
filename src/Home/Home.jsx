// Enhanced version with more insights using additional fields

import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Text,
  Loader,
  Select,
  Group,
  Divider,
  Stack,
  Card,
  Grid,
  List,
  ThemeIcon,
  Button,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconBuildingCommunity,
  IconMapPin,
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
    "500",
    "1000",
    "3000",
    "5000",
    "10000",
    "15000",
    "20000",
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

  const allComplaints = countByField("complaint_type");
  const complaintsToShow = showAllComplaints
    ? allComplaints
    : allComplaints.slice(0, 5);
  const statusBreakdown = countByField("status");
  const topAgencies = countByField("agency_name").slice(0, 5);
  const topLocations = countByField("location_type").slice(0, 5);
  const topDescriptors = countByField("descriptor").slice(0, 5);
  const total = data.length;

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
    <Container size="xl" py="xl">
      <Title order={1} c="blue.7" mb="sm">
        🗽 NYC 311 Snapshot
      </Title>
      <Text c="dimmed" size="sm">
        Explore recent 311 service requests across New York City. This snapshot
        covers the most recent {total.toLocaleString()} complaints{" "}
        {borough === "ALL" ? "citywide" : `from ${borough}`}.
      </Text>

      <Text c="dimmed" size="xs" mb="md" mt="xs">
        Data sourced from{" "}
        <a
          href="https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2010-to-Present/erm2-nwe9"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#1c7ed6", textDecoration: "underline" }}
        >
          NYC Open Data
        </a>
        .
      </Text>

      <Group wrap mb="xl">
        <Select
          label="Select Borough"
          data={boroughs}
          value={borough}
          onChange={(v) => setBorough(v || "ALL")}
          w={220}
        />
        <Select
          label="Number of Complaints"
          data={limitOptions.map((v) => ({ label: v, value: v }))}
          value={limit.toString()}
          onChange={(v) => setLimit(Number(v))}
          w={220}
        />
      </Group>

      {loading ? (
        <Loader size="lg" color="blue" />
      ) : (
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" p="lg" pb="sm" withBorder radius="md">
              <Title order={4} mb="sm" c="blue.6">
                Complaint Types
              </Title>
              <List
                spacing="sm"
                size="sm"
                icon={
                  <ThemeIcon color="blue" size={20} radius="xl">
                    <IconAlertTriangle size={14} />
                  </ThemeIcon>
                }
              >
                {complaintsToShow.map((c) => (
                  <List.Item key={c.name}>
                    {c.name}: <strong>{c.value.toLocaleString()}</strong>
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
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" p="lg" withBorder radius="md">
              <Title order={4} mb="sm" c="green.7">
                Status Breakdown
              </Title>
              <List spacing="sm" size="sm">
                {statusBreakdown.map((s) => (
                  <List.Item key={s.name} icon={getStatusIcon(s.name)}>
                    {s.name}: <strong>{s.value.toLocaleString()}</strong>
                  </List.Item>
                ))}
              </List>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card shadow="sm" p="lg" withBorder radius="md">
              <Title order={4} mb="sm" c="blue.6">
                Top Agencies
              </Title>
              <List
                spacing="xs"
                size="sm"
                icon={
                  <ThemeIcon color="blue" size={18} radius="xl">
                    <IconBuildingCommunity size={14} />
                  </ThemeIcon>
                }
              >
                {topAgencies.map((a) => (
                  <List.Item key={a.name}>
                    {a.name}: <strong>{a.value.toLocaleString()}</strong>
                  </List.Item>
                ))}
              </List>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card shadow="sm" p="lg" withBorder radius="md">
              <Title order={4} mb="md" c="blue.6">
                Top Descriptors
              </Title>
              <List spacing="xs" size="sm">
                {topDescriptors.map((d) => (
                  <List.Item key={d.name}>
                    {d.name}: <strong>{d.value.toLocaleString()}</strong>
                  </List.Item>
                ))}
              </List>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card shadow="sm" p="lg" pb="md" withBorder radius="md">
              <Title order={4} mb="sm" c="blue.6">
                Top Location Types
              </Title>
              <List
                spacing="xs"
                size="sm"
                icon={
                  <ThemeIcon color="blue" size={18} radius="xl">
                    <IconMapPin size={14} />
                  </ThemeIcon>
                }
              >
                {topLocations.map((l) => (
                  <List.Item key={l.name}>
                    {l.name}: <strong>{l.value.toLocaleString()}</strong>
                  </List.Item>
                ))}
              </List>
            </Card>
          </Grid.Col>

          <Grid.Col span={12}>
            <Divider
              label="Stay tuned for trend insights and maps"
              labelPosition="center"
              color="blue"
              mt="lg"
            />
          </Grid.Col>
        </Grid>
      )}
    </Container>
  );
}
