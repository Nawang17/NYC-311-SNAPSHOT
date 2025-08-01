import {
  Container,
  Title,
  Select,
  Loader,
  Card,
  Stack,
  Grid,
  Text,
  ThemeIcon,
  Group,
  Divider,
  Badge,
} from "@mantine/core";
import {
  IconBuildingCommunity,
  IconActivity,
  IconScale,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import axios from "axios";

export default function BoroughsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borough, setBorough] = useState("MANHATTAN");
  const [allBoroughsData, setAllBoroughsData] = useState({});

  const boroughs = [
    "MANHATTAN",
    "BRONX",
    "BROOKLYN",
    "QUEENS",
    "STATEN ISLAND",
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const boroughPromises = boroughs.map((b) =>
          axios.get(
            `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=1000&$order=created_date DESC&borough=${b}`
          )
        );
        const responses = await Promise.all(boroughPromises);
        const dataMap = {};
        responses.forEach((res, i) => {
          dataMap[boroughs[i]] = res.data;
        });
        setAllBoroughsData(dataMap);
        setData(dataMap[borough]);
      } catch (err) {
        console.error("Error fetching borough data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (allBoroughsData[borough]) {
      setData(allBoroughsData[borough]);
    }
  }, [borough, allBoroughsData]);

  const countByField = (dataArr, field) => {
    const counts = {};
    dataArr.forEach((item) => {
      const key = item[field] || "Unknown";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const topTypes = countByField(data, "complaint_type");
  const topAgencies = countByField(data, "agency_name");

  const mostActiveBorough = Object.entries(allBoroughsData).reduce(
    (max, [b, arr]) =>
      arr.length > max.count ? { name: b, count: arr.length } : max,
    { name: "N/A", count: 0 }
  );

  return (
    <Container size="xl" py="xl">
      <Title order={2} c="blue.7" mb="sm">
        🏙 Borough Breakdown
      </Title>
      <Text c="dimmed" size="sm" mb="md">
        Compare complaint trends across NYC boroughs.
      </Text>

      <Select
        label="Select a borough"
        value={borough}
        onChange={setBorough}
        data={boroughs}
        mb="lg"
        maw={300}
      />

      <Divider
        label={`Most active borough: ${mostActiveBorough.name} (${mostActiveBorough.count})`}
        mb="xl"
      />

      {loading ? (
        <Loader />
      ) : (
        <Grid gutter="lg">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Card withBorder shadow="sm" radius="md" padding="md">
              <Group mb="xs">
                <ThemeIcon variant="light" color="blue">
                  <IconActivity size={16} />
                </ThemeIcon>
                <Text fw={500}>Top Complaint Types in {borough}</Text>
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
                  <IconBuildingCommunity size={16} />
                </ThemeIcon>
                <Text fw={500}>Top Agencies in {borough}</Text>
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

          <Grid.Col span={12}>
            <Card withBorder shadow="sm" radius="md" padding="md">
              <Group mb="xs">
                <ThemeIcon variant="light" color="blue">
                  <IconScale size={16} />
                </ThemeIcon>
                <Text fw={500}>Complaint Volume by Borough</Text>
              </Group>
              <Stack>
                {Object.entries(allBoroughsData)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([b, arr]) => (
                    <Text key={b} size="sm">
                      {b}: {arr.length.toLocaleString()} complaints
                    </Text>
                  ))}
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      )}
    </Container>
  );
}
