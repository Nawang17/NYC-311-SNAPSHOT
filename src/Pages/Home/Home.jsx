import {
  Container,
  Title,
  Text,
  Grid,
  Card,
  Group,
  ThemeIcon,
  Skeleton,
  Badge,
  Divider,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBuildingCommunity,
  IconMapPin,
  IconBuildingSkyscraper,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

export default function HomePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek;
        const startOfWeek = new Date(now.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);
        const startISO = startOfWeek.toISOString().split("T")[0] + "T00:00:00";

        const url =
          `https://data.cityofnewyork.us/resource/erm2-nwe9.json` +
          `?$limit=50000&$order=created_date DESC&$where=created_date >= '${startISO}'`;

        const response = await axios.get(url);
        setData(response.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const topComplaint = countByField("complaint_type")[0];
  const topBorough = countByField("borough")[0];
  const topAgency = countByField("agency_name")[0];
  const topLocation = countByField("location_type")[0];

  const groupByDayAndField = (field, records) => {
    const grouped = {};

    records.forEach((item) => {
      const date = new Date(item.created_date);
      const day = format(date, "yyyy-MM-dd"); // <-- group by day
      const key = item[field] || "Unknown";

      if (!grouped[day]) grouped[day] = {};
      if (!grouped[day][key]) grouped[day][key] = 0;

      grouped[day][key]++;
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([day, entries]) => ({
        day,
        ...entries,
      }));
  };
  const dailyData = groupByDayAndField("borough", data);

  return (
    <Container size="xl" py="xl">
      <Card
        withBorder
        radius="md"
        shadow="sm"
        mb="xl"
        p="lg"
        // style={{
        //   background:
        //     "linear-gradient(135deg, #fff9ed 0%, #ffffff 60%, #fdf7ee 100%)",
        // }}
      >
        <Group justify="space-between" align="flex-start" mb="xs">
          <div>
            <Title order={3} c="orange.9" mb={2}>
              This Week’s NYC 311 Overview
            </Title>
            <Text size="sm" c="gray.7">
              Here’s what people are reporting the most, where it’s happening,
              and who’s handling it.
            </Text>
          </div>
          <Badge color="orange" variant="light" size="lg">
            {data.length.toLocaleString()} total complaints
          </Badge>
        </Group>

        <Divider my="md" />

        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon size="lg" radius="xl" variant="light" color="red">
                <IconAlertTriangle size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Most Reported Issue
                </Text>
                <Text fw={600} c="red.8">
                  {topComplaint?.name || <Skeleton height={14} />}
                </Text>
                <Text size="xs">
                  {topComplaint?.value?.toLocaleString()} reports
                </Text>
              </div>
            </Group>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
                <IconMapPin size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Borough with Most Activity
                </Text>
                <Text fw={600} c="blue.8">
                  {topBorough?.name || <Skeleton height={14} />}
                </Text>
                <Text size="xs">
                  {topBorough?.value?.toLocaleString()} complaints
                </Text>
              </div>
            </Group>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon size="lg" radius="xl" variant="light" color="indigo">
                <IconBuildingSkyscraper size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Most Involved Agency
                </Text>
                <Text fw={600} c="indigo.8">
                  {topAgency?.name || <Skeleton height={14} />}
                </Text>
                <Text size="xs">
                  {topAgency?.value?.toLocaleString()} cases
                </Text>
              </div>
            </Group>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon size="lg" radius="xl" variant="light" color="grape">
                <IconBuildingCommunity size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Most Common Location
                </Text>
                <Text fw={600} c="grape.8">
                  {topLocation?.name || <Skeleton height={14} />}
                </Text>
                <Text size="xs">
                  {topLocation?.value?.toLocaleString()} mentions
                </Text>
              </div>
            </Group>
          </Grid.Col>
        </Grid>
      </Card>
      {loading ? (
        <Skeleton height={300} radius="md" />
      ) : (
        <>
          <Card withBorder mt="lg" p="md">
            <Title order={5}>This Week’s Daily Borough Trends</Title>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="MANHATTAN" stroke="#1e88e5" />
                <Line type="monotone" dataKey="BROOKLYN" stroke="#43a047" />
                <Line type="monotone" dataKey="QUEENS" stroke="#fb8c00" />
                <Line type="monotone" dataKey="BRONX" stroke="#e53935" />
                <Line
                  type="monotone"
                  dataKey="STATEN ISLAND"
                  stroke="#8e24aa"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </Container>
  );
}
