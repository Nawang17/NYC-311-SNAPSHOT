import {
  Container,
  Select,
  Loader,
  Text,
  Group,
  Stack,
  Card,
  SimpleGrid,
  Title,
  ThemeIcon,
  Divider,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBuilding,
  IconMapPin,
  IconInfoCircle,
  IconClipboardCheck,
  IconCheckupList,
  IconTrophy,
  IconLocation,
  IconSearch,
} from "@tabler/icons-react";
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
    }
    const offset = now.getTimezoneOffset() * 60000;
    const startET = new Date(start.getTime() - offset)
      .toISOString()
      .split(".")[0];
    const endET = new Date(now.getTime() - offset).toISOString().split(".")[0];
    return [startET, endET];
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
      .filter((item) =>
        field === "resolution_description"
          ? item.name !== "Unknown" && item.name !== "N/A"
          : true
      )
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);
  };

  const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const topComplaint = countByField("complaint_type", data)[0];
  const busiestZip = countByField("incident_zip", data)[0];
  const descriptors = data.map((d) => d.descriptor).filter(Boolean);
  const randomDescriptor = getRandom(descriptors);

  const insights = [
    {
      label: "Top Complaint Types",
      icon: <IconAlertTriangle size={18} />,
      color: "red",
      data: countByField("complaint_type", data),
    },
    {
      label: "Top Agencies",
      icon: <IconBuilding size={18} />,
      color: "blue",
      data: countByField("agency_name", data),
    },
    {
      label: "Top ZIP Codes",
      icon: <IconMapPin size={18} />,
      color: "teal",
      data: countByField("incident_zip", data),
    },
    {
      label: "Top Descriptors",
      icon: <IconInfoCircle size={18} />,
      color: "indigo",
      data: countByField("descriptor", data),
    },
    {
      label: "Status Breakdown",
      icon: <IconCheckupList size={18} />,
      color: "grape",
      data: countByField("status", data),
    },
    {
      label: "Top Resolutions",
      icon: <IconClipboardCheck size={18} />,
      color: "orange",
      data: countByField("resolution_description", data),
    },
  ];

  return (
    <Container size="xl" py="xl">
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

      {loading ? (
        <Loader />
      ) : (
        <>
          <Card
            withBorder
            shadow="xs"
            radius="md"
            p="lg"
            mb="xl"
            style={{ background: "#fffdf5" }}
          >
            <Group align="center" spacing="xs" mb="sm">
              <ThemeIcon variant="light" color="orange" radius="xl">
                <IconTrophy size={18} />
              </ThemeIcon>
              <Title order={4} c="orange.9">
                {borough} Complaint Snapshot
              </Title>
            </Group>
            <Stack spacing="xs">
              <Group spacing="xs">
                <ThemeIcon color="red" variant="light" radius="xl">
                  <IconAlertTriangle size={16} />
                </ThemeIcon>
                <Text size="sm">
                  Most reported issue:{" "}
                  <strong>{topComplaint?.name || "Noise"}</strong>
                </Text>
              </Group>
              <Group spacing="xs">
                <ThemeIcon color="teal" variant="light" radius="xl">
                  <IconLocation size={16} />
                </ThemeIcon>
                <Text size="sm">
                  Busiest ZIP: <strong>{busiestZip?.name}</strong> with{" "}
                  <strong>{busiestZip?.value.toLocaleString()}</strong>{" "}
                  complaints
                </Text>
              </Group>
              <Group spacing="xs">
                <ThemeIcon color="gray" variant="light" radius="xl">
                  <IconSearch size={16} />
                </ThemeIcon>
                <Text size="sm">
                  Recent descriptor: <strong>{randomDescriptor}</strong>
                </Text>
              </Group>
              <Divider my="sm" />
              <Text size="sm" c="gray.7">
                Total: <strong>{data.length.toLocaleString()}</strong>{" "}
                complaints in <strong>{borough}</strong> ({range})
              </Text>
            </Stack>
          </Card>
          <Title order={4} mb="sm">
            Detailed Breakdown
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {insights.map((insight) => (
              <Card
                key={insight.label}
                shadow="sm"
                radius="md"
                withBorder
                padding="md"
                // style={{
                //   backgroundColor: `var(--mantine-color-${insight.color}-0)`,
                // }}
              >
                <Group mb="sm">
                  <ThemeIcon variant="light" color={insight.color} radius="xl">
                    {insight.icon}
                  </ThemeIcon>
                  <Title order={6} c={`${insight.color}.9`}>
                    {insight.label}
                  </Title>
                </Group>
                <Stack spacing="md">
                  {insight.data.map((item) => (
                    <Stack key={item.name} spacing={2}>
                      <Text size="sm" c="gray.6" lh={1.3}>
                        {item.name}
                      </Text>
                      <Text fw={800} size="lg" c={`${insight.color}.9`}>
                        {item.value.toLocaleString()}
                      </Text>
                    </Stack>
                  ))}
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </>
      )}
    </Container>
  );
}
