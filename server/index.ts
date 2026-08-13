import "dotenv/config";
import app, { server } from "./app";
import { log } from "./vite";

const port = Number.parseInt(process.env.PORT || "5000", 10);
server.listen({ port, host: "0.0.0.0" }, () => {
  log(`serving on port ${port}`);
});

export default app;
