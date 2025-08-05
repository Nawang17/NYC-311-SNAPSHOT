import {
  Container,
  Title,
  Select,
  Loader,
  Text,
  Group,
  Stack,
  Card,
  SimpleGrid,
} from "@mantine/core";
import { useEffect, useState } from "react";
import axios from "axios";

export default function BoroughsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borough, setBorough] = useState("MANHATTAN");
  const [range, setRange] = useState("This Week");

  const boroughOptions = [
    "MANHATTAN",
    "BRONX",
    "BROOKLYN",
    "QUEENS",
    "STATEN ISLAND",
  ];

  const timeOptions = [
    "Today",
    "Last 3 Days",
    "This Week",
    "This Month",
    "This Year",
  ];

  const getDateRange = (label) => {
    const now = new Date();
    let start = new Date();

    switch (label) {
      case "Today":
        start.setHours(0, 0, 0, 0);
        break;
      case "Last 3 Days":
        start.setDate(now.getDate() - 2);
        start.setHours(0, 0, 0, 0);
        break;
      case "This Week":
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case "This Month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "This Year":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start.setDate(now.getDate() - 2);
    }

    return [start.toISOString().split(".")[0], now.toISOString().split(".")[0]];
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [start, end] = getDateRange(range);
        const response = await axios.get(
          `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=50000&$order=created_date DESC&$where=borough='${borough}' AND created_date between '${start}' and '${end}'`
        );
        setData(response.data);
      } catch (err) {
        console.error("Error fetching borough data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [borough, range]);

  const countByField = (field, dataset, topN = 5) => {
    const counts = dataset.reduce((acc, item) => {
      const key = item[field] || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);
  };

  const insights = [
    {
      label: "Top Complaint Types",
      data: countByField("complaint_type", data),
    },
    { label: "Top Agencies", data: countByField("agency_name", data) },
    { label: "Top ZIP Codes", data: countByField("incident_zip", data) },
    { label: "Top Descriptors", data: countByField("descriptor", data) },
    { label: "Status Breakdown", data: countByField("status", data) },
    {
      label: "Top Resolutions",
      data: countByField("resolution_description", data),
    },
  ];

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
          Borough Insights
        </Text>
        <Text size="xs" pt="5px" c="gray.7">
          Explore the top complaint patterns in {borough} ({range}, max 50,000)
        </Text>
      </Card>

      <Group mb="lg" align="flex-end">
        <Select
          label="Select Borough"
          value={borough}
          onChange={setBorough}
          data={boroughOptions}
          w={250}
        />
        <Select
          label="Time Range"
          value={range}
          onChange={setRange}
          data={timeOptions}
          w={200}
        />
      </Group>
      {!loading && (
        <Text size="sm" c="gray.7" mb="md">
          Showing <strong>{data.length.toLocaleString()}</strong> records from{" "}
          <strong>{borough}</strong>
        </Text>
      )}
      {loading ? (
        <Loader />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {insights.map((insight) => (
            <Card key={insight.label} shadow="xs" padding="md" withBorder>
              <Text fw={600} size="sm" mb="sm" c="blue.7">
                {insight.label}
              </Text>
              <Stack spacing={4}>
                {insight.data.map((item) => (
                  <Group key={item.name} position="apart">
                    <Text size="sm" c="gray.7">
                      {item.name || "Unknown"}
                    </Text>
                    <Text fw={600} size="sm">
                      {item.value.toLocaleString()}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}
