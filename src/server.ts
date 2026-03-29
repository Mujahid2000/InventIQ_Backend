import dotenv from "dotenv";
import { createApp, ensureDbConnection } from "./app";

dotenv.config();

const PORT = Number(process.env.PORT || 5000);
const isVercel = Boolean(process.env.VERCEL);
const app = createApp();

if (!isVercel) {
  ensureDbConnection()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Failed to start server due to DB connection error:", err);
      process.exit(1);
    });
}

export default app;
module.exports = app;
