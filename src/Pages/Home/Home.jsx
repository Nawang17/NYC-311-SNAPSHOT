import {
  Container,
  Title,
  Text,
  Grid,
  Card,
  Group,
  Button,
  Skeleton,
  ThemeIcon,
  Flex,
} from "@mantine/core";
import { IconMapPin, IconTrendingUp } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import axios from "axios";

export default function HomePage() {
  const [data, setData] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const getStartOfWeek = () => {
          const now = new Date();
          const dayOfWeek = now.getDay(); // Sunday = 0
          const diff = now.getDate() - dayOfWeek;
          const startOfWeek = new Date(now.setDate(diff));
          startOfWeek.setHours(0, 0, 0, 0);
          return startOfWeek.toISOString().split("T")[0] + "T00:00:00";
        };

        const startOfWeek = getStartOfWeek();

        const url =
          `https://data.cityofnewyork.us/resource/erm2-nwe9.json` +
          `?$limit=50000` +
          `&$order=created_date DESC` +
          `&$where=created_date >= '${startOfWeek}'`;

        const response = await axios.get(url);
        setData(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const countByField = (field, subset = data) => {
    const counts = {};
    subset.forEach((item) => {
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

  return (
    <Container size="xl" py="xl">
      <Card
        withBorder
        radius="lg"
        shadow="md"
        mb="xl"
        padding="lg"
        style={{
          background: "linear-gradient(135deg, #fff5e6, #fffaf3)",
        }}
      >
        <Text c="orange.9" size="md" fw={700} mb={5}>
          What are New Yorkers reporting ?
        </Text>
        <Text size="sm" c="gray.8">
          Based on <strong>this week's</strong> 311 reports across all five
          boroughs. Total: <strong>{data.length.toLocaleString()}</strong>{" "}
          complaints.
        </Text>
      </Card>

      <Grid gutter="xl" mb="xl">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Group justify="space-between">
              <Text size="sm" fw={600} c="blue.8">
                Top Complaint Type
              </Text>
              <ThemeIcon color="blue" variant="light">
                <IconTrendingUp size={18} />
              </ThemeIcon>
            </Group>
            <Title order={3} mt="sm" c="blue.9">
              {topComplaint?.name || <Skeleton height={20} />}
            </Title>
            <Text size="sm" c="gray.7">
              {topComplaint?.value?.toLocaleString()} reports
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Group justify="space-between">
              <Text size="sm" fw={600} c="teal.8">
                Most Active Borough
              </Text>
              <ThemeIcon color="teal" variant="light">
                <IconMapPin size={18} />
              </ThemeIcon>
            </Group>
            <Title order={3} mt="sm" c="teal.9">
              {topBorough?.name || <Skeleton height={20} />}
            </Title>
            <Text size="sm" c="gray.7">
              {topBorough?.value?.toLocaleString()} complaints
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Grid gutter="xl" mb="xl">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Group justify="space-between">
              <Text size="sm" fw={600} c="indigo.8">
                Top Reporting Agency
              </Text>
              <ThemeIcon color="indigo" variant="light">
                <IconTrendingUp size={18} />
              </ThemeIcon>
            </Group>
            <Title order={3} mt="sm" c="indigo.9">
              {topAgency?.name || <Skeleton height={20} />}
            </Title>
            <Text size="sm" c="gray.7">
              {topAgency?.value?.toLocaleString()} records
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Group justify="space-between">
              <Text size="sm" fw={600} c="grape.8">
                Most Common Location Type
              </Text>
              <ThemeIcon color="grape" variant="light">
                <IconMapPin size={18} />
              </ThemeIcon>
            </Group>
            <Title order={3} mt="sm" c="grape.9">
              {topLocation?.name || <Skeleton height={20} />}
            </Title>
            <Text size="sm" c="gray.7">
              {topLocation?.value?.toLocaleString()} mentions
            </Text>
          </Card>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
