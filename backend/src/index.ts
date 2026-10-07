import express, { Request, Response } from "express";
import { config } from "./config/env";
import { connectDatabase } from "./config/db";
import healthRouter from "./routes/health.route";

const app = express();

app.use(express.json());

// Routes
app.use(healthRouter);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from Express + TypeScript!");
});

const startServer = async () => {
  await connectDatabase();

  app.listen(config.port, () => {
    console.log(` Server running on http://localhost:${config.port}`);
  });
};

startServer();