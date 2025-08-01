import { Container, Group, Text, Anchor, Box } from "@mantine/core";
import { IconBrandGithub, IconUser } from "@tabler/icons-react";

export default function AppFooter() {
  return (
    <Box
      component="footer"
      bg="gray.0"
      py="md"
      mt="xl"
      style={{ borderTop: "1px solid #e0e0e0" }}
    >
      <Container size="xl">
        <Group position="apart" align="center" wrap="wrap">
          <Text size="xs" c="gray.6">
            Built with{" "}
            <Anchor
              href="https://data.cityofnewyork.us/Public-Safety/311-Service-Requests-from-2010-to-Present/erm2-nwe9"
              target="_blank"
              c="blue.7"
              underline="hover"
            >
              NYC Open Data
            </Anchor>
          </Text>

          <Group spacing="xs">
            <Anchor
              href="https://github.com/Nawang17/NYC-311-SNAPSHOT"
              target="_blank"
              title="View source code on GitHub"
              c="blue.7"
              size="xs"
              underline="hover"
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <IconBrandGithub size={14} />
              <Text size="xs">Source code</Text>
            </Anchor>

            <Anchor
              href="https://nawang17.github.io/Portfolio/"
              target="_blank"
              title="Portfolio"
              c="blue.7"
              size="xs"
              style={{ display: "flex", alignItems: "center", gap: 4 }}
              underline="hover"
            >
              <IconUser size={14} />
              <Text size="xs">Portfolio</Text>
            </Anchor>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
