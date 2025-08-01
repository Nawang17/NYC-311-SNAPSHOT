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
import { IconGitCompare } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import axios from "axios";

export default function BoroughsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borough, setBorough] = useState("MANHATTAN");
  const [compareBorough, setCompareBorough] = useState(null);
  const [compareData, setCompareData] = useState([]);
  const [limit, setLimit] = useState("500");
  const [showComparison, setShowComparison] = useState(false);
  const [showCompareSelect, setShowCompareSelect] = useState(false);

  const boroughOptions = [
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
        const response = await axios.get(
          `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=${limit}&$order=created_date DESC&borough=${borough}`
        );
        setData(response.data);

        if (compareBorough && showComparison) {
          const compareResponse = await axios.get(
            `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=${limit}&$order=created_date DESC&borough=${compareBorough}`
          );
          setCompareData(compareResponse.data);
        } else {
          setCompareData([]);
        }
      } catch (err) {
        console.error("Error fetching borough data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [borough, compareBorough, limit, showComparison]);

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
      data: countByField("complaint_type", data, 5),
      compareData: countByField("complaint_type", compareData, 5),
    },
    {
      label: "Top Agencies",
      data: countByField("agency_name", data, 5),
      compareData: countByField("agency_name", compareData, 5),
    },
    {
      label: "Top ZIP Codes",
      data: countByField("incident_zip", data, 5),
      compareData: countByField("incident_zip", compareData, 5),
    },
    {
      label: "Top Descriptors",
      data: countByField("descriptor", data, 5),
      compareData: countByField("descriptor", compareData, 5),
    },
    {
      label: "Status Breakdown",
      data: countByField("status", data, 5),
      compareData: countByField("status", compareData, 5),
    },
    {
      label: "Top Resolutions",
      data: countByField("resolution_description", data, 5),
      compareData: countByField("resolution_description", compareData, 5),
    },
  ];

  const handleCompareClick = () => {
    setShowCompareSelect(true);
  };

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
          Analyze complaint patterns and compare key metrics across boroughs
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
          label="Complaint Limit"
          value={limit}
          onChange={setLimit}
          data={[
            { value: "500", label: "Latest 500" },
            { value: "1000", label: "Latest 1,000" },
            { value: "2000", label: "Latest 2,000" },
            { value: "3000", label: "Latest 3,000" },
            { value: "5000", label: "Latest 5,000" },
            { value: "10000", label: "Latest 10,000" },

            { value: "20000", label: "Latest 20,000" },

            { value: "30000", label: "Latest 30,000" },
          ]}
          w={150}
        />
        {!showCompareSelect && (
          <Button
            variant="outline"
            color="blue"
            onClick={handleCompareClick}
            leftSection={<IconGitCompare size={16} />}
          >
            Compare with Other Borough
          </Button>
        )}
        {showCompareSelect && (
          <>
            <Select
              label="Compare With"
              value={compareBorough}
              onChange={setCompareBorough}
              data={boroughOptions.filter((b) => b !== borough)}
              placeholder="Select borough"
              clearable
              w={250}
              disabled={loading}
            />
            {compareBorough && (
              <Button
                variant={showComparison ? "light" : "filled"}
                color="blue"
                onClick={() => setShowComparison(!showComparison)}
                leftSection={<IconGitCompare size={16} />}
              >
                {showComparison ? "Hide Comparison" : "Show Comparison"}
              </Button>
            )}
          </>
        )}
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
                {showComparison && compareBorough && (
                  <Table.Th>{compareBorough}</Table.Th>
                )}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {insights.map((insight) => (
                <>
                  <Table.Tr key={insight.label}>
                    <Table.Td colSpan={3}>
                      <Text fw={700} size="sm" c="blue">
                        {insight.label}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                  {(insight.data.length > 0
                    ? insight.data
                    : [{ name: "None", value: 0 }]
                  ).map((item, idx) => (
                    <Table.Tr key={`${insight.label}-${item.name}`}>
                      <Table.Td>{item.name || "Unknown"}</Table.Td>
                      <Table.Td>{item.value.toLocaleString()}</Table.Td>
                      {showComparison && compareBorough && (
                        <Table.Td>
                          {insight.compareData[idx]
                            ? insight.compareData[idx].value.toLocaleString()
                            : "—"}
                        </Table.Td>
                      )}
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
