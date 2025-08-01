import {
  Container,
  Title,
  Text,
  Select,
  Loader,
  Card,
  Stack,
  Grid,
  ThemeIcon,
  Group,
  Divider,
} from "@mantine/core";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  IconTrendingUp,
  IconCalendarTime,
  IconClockHour4,
} from "@tabler/icons-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import dayjs from "dayjs";

export default function TrendsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const past = dayjs()
          .subtract(Number(range), "day")
          .format("YYYY-MM-DDTHH:mm:ss");
        const encodedWhere = encodeURIComponent(`created_date > '${past}'`);
        const response = await axios.get(
          `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=3000&$order=created_date DESC&$where=${encodedWhere}`
        );
        setData(response.data);
      } catch (err) {
        console.error("Error fetching trend data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [range]);

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

  const complaintsByDay = () => {
    const counts = {};
    data.forEach((item) => {
      const date = dayjs(item.created_date).format("MMM D");
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());
  };

  const topTypes = countByField("complaint_type").slice(0, 5);
  const topBoroughs = countByField("borough").slice(0, 5);
  const trendData = complaintsByDay();

  return (
    <Container size="xl" py="xl">
      <Title order={2} c="blue.7" mb="sm">
        📊 Citywide Trends
      </Title>
      <Text c="dimmed" size="sm" mb="md">
        Dive into recent 311 complaint trends across NYC by type, location, and
        time.
      </Text>

      <Select
        label="Time Range"
        value={range}
        onChange={setRange}
        data={[
          { value: "7", label: "Last 7 Days" },
          { value: "14", label: "Last 14 Days" },
          { value: "30", label: "Last 30 Days" },
        ]}
        mb="lg"
        maw={200}
      />

      {loading ? (
        <Loader />
      ) : (
        <Stack>
          <Card withBorder shadow="sm" radius="md" padding="md">
            <Group mb="xs">
              <ThemeIcon variant="light" color="blue">
                <IconClockHour4 size={16} />
              </ThemeIcon>
              <Text fw={500}>Complaint Volume Over Time</Text>
            </Group>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={trendData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#228be6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Card withBorder shadow="sm" radius="md" padding="md">
                <Group mb="xs">
                  <ThemeIcon variant="light" color="blue">
                    <IconTrendingUp size={16} />
                  </ThemeIcon>
                  <Text fw={500}>Top Complaint Types</Text>
                </Group>
                <Divider mb="sm" />
                <Stack>
                  {topTypes.map((item) => (
                    <Text key={item.name} size="sm">
                      {item.name}: {item.value.toLocaleString()}
                    </Text>
                  ))}
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Card withBorder shadow="sm" radius="md" padding="md">
                <Group mb="xs">
                  <ThemeIcon variant="light" color="blue">
                    <IconCalendarTime size={16} />
                  </ThemeIcon>
                  <Text fw={500}>Complaints by Borough</Text>
                </Group>
                <Divider mb="sm" />
                <Stack>
                  {topBoroughs.map((item) => (
                    <Text key={item.name} size="sm">
                      {item.name}: {item.value.toLocaleString()}
                    </Text>
                  ))}
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Stack>
      )}
    </Container>
  );
}
