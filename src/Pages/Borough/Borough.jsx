import {
  Container,
  Title,
  Select,
  Loader,
  Table,
  Text,
  Group,
  Button,
  ScrollArea,
  Stack,
  Card,
} from "@mantine/core";
import { useEffect, useState } from "react";
import axios from "axios";

export default function BoroughsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borough, setBorough] = useState("MANHATTAN");
  const [limit, setLimit] = useState("5000");
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
          `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=${limit}&$order=created_date DESC&$where=borough='${borough}' AND created_date between '${start}' and '${end}'`
        );
        setData(response.data);
      } catch (err) {
        console.error("Error fetching borough data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [borough, limit, range]);

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
          Analyze complaint patterns by borough and time window
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
        <Select
          label="Complaint Limit"
          value={limit}
          onChange={setLimit}
          data={[
            { value: "500", label: "Latest 500" },
            { value: "1000", label: "Latest 1,000" },
            { value: "5000", label: "Latest 5,000" },
            { value: "10000", label: "Latest 10,000" },
            { value: "20000", label: "Latest 20,000" },
            { value: "30000", label: "Latest 30,000" },
            { value: "50000", label: "Max 50,000" },
          ]}
          w={150}
        />
      </Group>

      {loading ? (
        <Loader />
      ) : (
        <ScrollArea>
          <Table highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Insight</Table.Th>
                <Table.Th>{borough}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {insights.map((insight) => (
                <>
                  <Table.Tr key={insight.label}>
                    <Table.Td colSpan={2}>
                      <Text fw={700} size="sm" c="blue">
                        {insight.label}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                  {(insight.data.length > 0
                    ? insight.data
                    : [{ name: "None", value: 0 }]
                  ).map((item) => (
                    <Table.Tr key={`${insight.label}-${item.name}`}>
                      <Table.Td>{item.name || "Unknown"}</Table.Td>
                      <Table.Td>{item.value.toLocaleString()}</Table.Td>
                    </Table.Tr>
                  ))}
                </>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </Container>
  );
}
