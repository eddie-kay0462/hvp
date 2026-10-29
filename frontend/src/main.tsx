import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { IS_CAMPUS } from "./config/appMode";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

// Campus builds (VITE_APP_MODE=<slug>) run the discovery-only app. It is a
// separate chunk, so the main marketplace's startup path is unchanged.
if (IS_CAMPUS) {
  import("./campus/CampusApp").then(({ default: CampusApp }) => root.render(<CampusApp />));
} else {
  root.render(<App />);
}
