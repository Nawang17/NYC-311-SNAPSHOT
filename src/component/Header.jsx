import {
  Button,
  Group,
  Title,
  Flex,
  Paper,
  useMantineTheme,
  rem,
  ActionIcon,
  Drawer,
  Divider,
} from "@mantine/core";
import { useNavigate, useLocation } from "react-router";
import { useDisclosure } from "@mantine/hooks";
import {
  IconHome,
  IconMapPin,
  IconMap2,
  IconBuildingCommunity,
  IconInfoCircle,
  IconMenu2,
} from "@tabler/icons-react";
import { useMemo } from "react";

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useMantineTheme();
  const [opened, { open, close }] = useDisclosure(false);

  const navButtons = useMemo(
    () => [
      { label: "Home", route: "/", icon: <IconHome size={16} /> },
      {
        label: "Boroughs",
        route: "/borough/Queens",
        icon: <IconBuildingCommunity size={16} />,
      },
      {
        label: "ZIP Lookup",
        route: "/zip-lookup",
        icon: <IconMapPin size={16} />,
      },
      { label: "Map", route: "/map", icon: <IconMap2 size={16} /> },
      { label: "About", route: "/about", icon: <IconInfoCircle size={16} /> },
    ],
    []
  );

  const isActive = (route) => {
    // Treat root as exact, others as "startsWith" so /map/whatever stays active
    return route === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(route);
  };

  const Brand = (
    <Title
      order={2}
      onClick={() => {
        navigate("/");
        close();
      }}
      style={{
        cursor: "pointer",
        fontWeight: 800,
        letterSpacing: -0.2,
        color: theme.colors.blue[7],
      }}
    >
      NYC 311 Snapshot
    </Title>
  );

  const NavButtons = ({ vertical = false }) => (
    <Group
      spacing={vertical ? "sm" : "xs"}
      direction={vertical ? "column" : "row"}
      mt={vertical ? "md" : 0}
      align={vertical ? "stretch" : "center"}
    >
      {navButtons.map(({ label, route, icon }) => {
        const active = isActive(route);
        return (
          <Button
            key={route}
            variant={active ? "filled" : "subtle"}
            color="blue"
            size="xs"
            leftSection={icon}
            radius="xl"
            onClick={() => {
              navigate(route);
              close();
            }}
            styles={{
              root: {
                transition: "transform 120ms ease, box-shadow 120ms ease",
                boxShadow: active
                  ? `0 1px 0 ${theme.colors.blue[2]} inset`
                  : "none",
              },
              inner: { gap: rem(8) },
            }}
            onMouseEnter={(e) => {
              if (!active)
                e.currentTarget.style.boxShadow = `0 0 0 1px ${theme.colors.gray[3]} inset`;
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.boxShadow = "none";
            }}
          >
            {label}
          </Button>
        );
      })}
    </Group>
  );

  return (
    <Paper
      shadow="xs"
      radius={0}
      withBorder
      style={{
        borderBottom: `1px solid ${theme.colors.gray[3]}`,
        position: "sticky",
        top: 0,
        zIndex: 200,
        backgroundColor: theme.white,
        backdropFilter: "saturate(180%) blur(8px)",
      }}
    >
      <div
        style={{
          maxWidth: rem(1320),
          margin: "0 auto",
          padding: "0.875rem 1.25rem",
        }}
      >
        <Flex justify="space-between" align="center" gap="md" wrap="nowrap">
          {Brand}

          {/* Desktop nav */}
          <div className="hide-on-mobile" style={{ display: "none" }} />

          <Group
            spacing="xs"
            align="center"
            // show on >= sm
            style={{
              display: "none",
            }}
            className="nav-desktop"
          >
            <NavButtons />
          </Group>

          {/* Mobile burger */}
          <ActionIcon
            variant="subtle"
            color="blue"
            size="lg"
            aria-label="Open menu"
            onClick={open}
            // show on < sm
            className="nav-burger"
          >
            <IconMenu2 size={20} />
          </ActionIcon>
        </Flex>
      </div>

      {/* Mobile drawer */}
      <Drawer
        opened={opened}
        onClose={close}
        padding="md"
        size="md"
        title={Brand}
        overlayProps={{ opacity: 0.3, blur: 2 }}
      >
        <Divider mb="sm" />
        <NavButtons vertical />
      </Drawer>

      {/* Quick CSS for responsive switch (no CSS file needed) */}
      <style>{`
        @media (min-width: 640px) {
          .nav-desktop { display: flex !important; }
          .nav-burger  { display: none !important; }
        }
      `}</style>
    </Paper>
  );
}
