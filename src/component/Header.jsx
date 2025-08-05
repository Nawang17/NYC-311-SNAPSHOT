import {
  Button,
  Group,
  Title,
  Flex,
  Paper,
  useMantineTheme,
  rem,
} from "@mantine/core";
import { useNavigate, useLocation } from "react-router";
import {
  IconHome,
  IconMapPin,
  IconMap2,
  IconBuildingCommunity,
  IconInfoCircle,
} from "@tabler/icons-react";

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useMantineTheme();

  const navButtons = [
    { label: "Home", route: "/", icon: <IconHome size={16} /> },
    {
      label: "Boroughs",
      route: "/boroughs",
      icon: <IconBuildingCommunity size={16} />,
    },
    {
      label: "ZIP Lookup",
      route: "/zip-lookup",
      icon: <IconMapPin size={16} />,
    },
    {
      label: "Map",
      route: "/map",
      icon: <IconMap2 size={16} />,
    },
    {
      label: "About",
      route: "/about",
      icon: <IconInfoCircle size={16} />,
    },
  ];

  return (
    <Paper
      shadow="xs"
      radius={0}
      withBorder
      style={{
        borderBottom: `1px solid ${theme.colors.gray[3]}`,
        position: "sticky",
        top: 0,
        zIndex: 100,
        backgroundColor: theme.white,
      }}
    >
      <div
        style={{
          maxWidth: rem(1320),
          margin: "0 auto",
          padding: "1rem 1.5rem",
        }}
      >
        <Flex justify="space-between" align="center" wrap="wrap">
          <Title
            order={2}
            c="blue.7"
            style={{ cursor: "pointer", fontWeight: 700 }}
            onClick={() => navigate("/")}
          >
            NYC 311 Snapshot
          </Title>

          <Group spacing="xs" mt={{ base: "md", sm: 0 }}>
            {navButtons.map(({ label, route, icon }) => (
              <Button
                key={route}
                variant={location.pathname === route ? "filled" : "subtle"}
                color="blue"
                size="xs"
                leftSection={icon}
                onClick={() => navigate(route)}
                radius="xl"
              >
                {label}
              </Button>
            ))}
          </Group>
        </Flex>
      </div>
    </Paper>
  );
}
