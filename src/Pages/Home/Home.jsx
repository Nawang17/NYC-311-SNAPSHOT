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
        const response = await axios.get(
          "https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=10000&$order=created_date DESC"
        );
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
        radius="md"
        shadow="xs"
        mb="xl"
        padding="md"
        style={{ backgroundColor: "#f8f9fa" }}
      >
        <Text c="blue.8" size="sm" fw={600}>
          What are New Yorkers reporting right now?
        </Text>
        <Text size="xs" pt="5px" c="gray.7">
          These insights are based on the latest <strong>10,000</strong> 311
          service requests across the five boroughs.
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
