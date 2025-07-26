import express from "express";
import cors from "cors";
import employeeRouter from "./routes/create-employee";
import addResourceRouter from "./routes/add-resource";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use("/employee", employeeRouter);
app.use("/add-resource", addResourceRouter);

const port = parseInt(process.env.PORT || "8080");

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
  console.log(`PORT env var: ${process.env.PORT}`);
});
