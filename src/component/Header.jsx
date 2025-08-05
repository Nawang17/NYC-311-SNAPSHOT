import { Button, Group, Title, Flex } from "@mantine/core";
import { useNavigate, useLocation } from "react-router";
import {
  IconHome,
  IconMapPin,
  IconMap2,
  IconTrendingUp,
  IconBuildingCommunity,
  IconInfoCircle,
} from "@tabler/icons-react";

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();

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
    { label: "Map", route: "/map", icon: <IconMap2 size={16} /> },

    // { label: "Trends", route: "/trends", icon: <IconTrendingUp size={16} /> },

    {
      label: "About",
      route: "/about",
      icon: <IconInfoCircle size={16} />,
    },
  ];

  return (
    <div
      style={{
        borderBottom: "1px solid #e0e0e0",
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: "1330px",
          margin: "0 auto",
          padding: "1rem 1.5rem",
        }}
      >
        <Flex justify="space-between" align="center" wrap="wrap">
          <Title
            order={2}
            c="blue.7"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            NYC 311 Snapshot
          </Title>

          <Group spacing="xs" mt={{ base: "md", sm: 0 }}>
            {navButtons.map(({ label, route, icon }) => (
              <Button
                key={route}
                variant={location.pathname === route ? "filled" : "light"}
                color="blue"
                size="xs"
                leftSection={icon}
                onClick={() => navigate(route)}
              >
                {label}
              </Button>
            ))}
          </Group>
        </Flex>
      </div>
    </div>
  );
}
