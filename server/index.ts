import "dotenv/config";
import app, { server } from "./app.js";
import { log } from "./vite.js";

const port = Number.parseInt(process.env.PORT || "5000", 10);
server.listen({ port, host: "0.0.0.0" }, () => {
  log(`serving on port ${port}`);
});

export default app;
