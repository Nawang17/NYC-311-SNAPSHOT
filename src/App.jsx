import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";
import HomePage from "./Home/Home";

export default function App() {
  return (
    <MantineProvider>
      <HomePage />
    </MantineProvider>
  );
}
