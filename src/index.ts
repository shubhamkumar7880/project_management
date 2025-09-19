import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./db/index.js";

dotenv.config({
  path: "./.env",
});

const port: number = parseInt(process.env.PORT as string, 10) || 8000;

const startServer = async () => {
  const isDBConnected = await connectDB();

  if (!isDBConnected) {
    console.error("❌ Exiting: DB not available");
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
};

startServer();
