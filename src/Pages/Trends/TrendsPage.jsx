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
} from "@mantine/core";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  IconTrendingUp,
  IconCalendarTime,
  IconBuildingCommunity,
} from "@tabler/icons-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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
        const response = await axios.get(
          "https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=10000&$order=created_date DESC"
        );
        setData(response.data);
      } catch (err) {
        console.error("Error fetching trend data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filterDataByRange = () => {
    const cutoff = dayjs().subtract(Number(range), "day");
    return data.filter((item) => dayjs(item.created_date).isAfter(cutoff));
  };

  const filteredData = filterDataByRange();

  const getDaysArray = () => {
    const days = [];
    for (let i = Number(range) - 1; i >= 0; i--) {
      days.push(dayjs().subtract(i, "day").format("YYYY-MM-DD"));
    }
    return days;
  };

  const complaintsPerDay = () => {
    const counts = {};
    filteredData.forEach((item) => {
      const date = dayjs(item.created_date).format("YYYY-MM-DD");
      counts[date] = (counts[date] || 0) + 1;
    });
    return getDaysArray().map((date) => ({ date, value: counts[date] || 0 }));
  };

  const countByField = (field) => {
    const counts = {};
    filteredData.forEach((item) => {
      const key = item[field] || "Unknown";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const avgComplaints = Math.round(filteredData.length / Number(range));
  const peakDay = complaintsPerDay().reduce(
    (max, curr) => (curr.value > max.value ? curr : max),
    { date: "N/A", value: 0 }
  );

  const topTypes = countByField("complaint_type").slice(0, 5);
  const topBoroughs = countByField("borough").slice(0, 5);
  const topAgencies = countByField("agency_name").slice(0, 5);

  return (
    <Container size="xl" py="xl">
      <Title order={2} c="blue.7" mb="sm">
        📊 Citywide Trends
      </Title>
      <Text c="dimmed" size="sm" mb="md">
        Explore complaint trends and activity across NYC over recent days.
      </Text>

      <Select
        label="Timeframe"
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
            <Text fw={500} mb={6}>
              Complaints Per Day
            </Text>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={complaintsPerDay()}>
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
                <Stack>
                  {topBoroughs.map((item) => (
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
                    <IconBuildingCommunity size={16} />
                  </ThemeIcon>
                  <Text fw={500}>Top Agencies</Text>
                </Group>
                <Stack>
                  {topAgencies.map((item) => (
                    <Text key={item.name} size="sm">
                      {item.name}: {item.value.toLocaleString()}
                    </Text>
                  ))}
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Card withBorder shadow="sm" radius="md" padding="md">
                <Text fw={500}>Quick Stats</Text>
                <Text size="sm" mt="xs">
                  Avg. complaints per day: {avgComplaints.toLocaleString()}
                </Text>
                <Text size="sm">
                  Most active day: {peakDay.date} (
                  {peakDay.value.toLocaleString()} complaints)
                </Text>
              </Card>
            </Grid.Col>
          </Grid>
        </Stack>
      )}
    </Container>
  );
}
