import {
  Container,
  Title,
  Text,
  Card,
  Stack,
  Group,
  ThemeIcon,
  Anchor,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconDatabase,
  IconMap2,
  IconCode,
} from "@tabler/icons-react";

export default function AboutPage() {
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
          About NYC 311 Snapshot
        </Text>
      </Card>

      <Stack spacing="xl">
        <Card withBorder radius="md" shadow="sm" p="lg">
          <Group mb="sm">
            <ThemeIcon color="blue" variant="light" radius="xl">
              <IconInfoCircle size={18} />
            </ThemeIcon>
            <Text fw={600}>What is this?</Text>
          </Group>
          <Text size="sm" c="gray.7">
            NYC 311 Snapshot is a civic dashboard that visualizes real-time 311
            complaints across New York City. It helps residents explore what
            issues are being reported in their neighborhoods using official
            public data.
          </Text>
        </Card>

        <Card withBorder radius="md" shadow="sm" p="lg">
          <Group mb="sm">
            <ThemeIcon color="blue" variant="light" radius="xl">
              <IconDatabase size={18} />
            </ThemeIcon>
            <Text fw={600}>Where does the data come from?</Text>
          </Group>
          <Text size="sm" c="gray.7">
            All complaint data is sourced from{" "}
            <Anchor
              href="https://data.cityofnewyork.us/Public-Safety/311-Service-Requests-from-2010-to-Present/erm2-nwe9"
              target="_blank"
              c="blue.7"
              underline
            >
              NYC Open Data
            </Anchor>
            , which provides a real-time feed of 311 service requests.
          </Text>
        </Card>

        <Card withBorder radius="md" shadow="sm" p="lg">
          <Group mb="sm">
            <ThemeIcon color="blue" variant="light" radius="xl">
              <IconMap2 size={18} />
            </ThemeIcon>
            <Text fw={600}>Why did you build this?</Text>
          </Group>
          <Text size="sm" c="gray.7">
            To make civic data more accessible and user-friendly. By turning raw
            datasets into intuitive visuals, NYC 311 Snapshot helps residents
            understand trends and explore quality-of-life issues across
            different boroughs.
          </Text>
        </Card>

        <Card withBorder radius="md" shadow="sm" p="lg">
          <Group mb="sm">
            <ThemeIcon color="blue" variant="light" radius="xl">
              <IconCode size={18} />
            </ThemeIcon>
            <Text fw={600}>Built with</Text>
          </Group>
          <Text size="sm" c="gray.7">
            This project was built using React, Mantine, Leaflet, and NYC Open
            Data.{" "}
            <Anchor
              href="https://github.com/Nawang17/NYC-311-SNAPSHOT"
              target="_blank"
              c="blue.7"
              underline
            >
              View the code on GitHub
            </Anchor>
            .
          </Text>
        </Card>
      </Stack>
    </Container>
  );
}
