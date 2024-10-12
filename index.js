import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import googleRoutes from "./routes/calendar.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api", googleRoutes);

app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
