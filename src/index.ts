import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.route"
import userRoutes from "./routes/user.route";
import { connectDatabase } from "./config/db";
import dotenv from "dotenv";

dotenv.config();

connectDatabase();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.NODE_ENV === "production"
      ? "https://"
      : "http://localhost:5173",
    credentials: true,
  })
);

app.use("/auth", authRoutes);
app.use("/api", userRoutes);

app.listen(5000, () => {
  console.log("Server is running at http://localhost:5000");
});