import { Button, Group, Title, Flex } from "@mantine/core";
import { useNavigate, useLocation } from "react-router";

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const navButtons = [
    { label: "Home", route: "/" },
    { label: "Map", route: "/map" },
    { label: "ZIP Lookup", route: "/zip-lookup" },
    { label: "Trends", route: "/trends" },
    { label: "Boroughs", route: "/boroughs" },
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
            {navButtons.map(({ label, route }) => (
              <Button
                key={route}
                variant={location.pathname === route ? "filled" : "light"}
                color="blue"
                size="xs"
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
