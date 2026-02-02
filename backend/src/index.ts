import express, { Request, Response } from "express";
import userRoute from "./routes/usersRoute.js";
import cors from "cors";
import dotenv from "dotenv";
const app = express();
const port = process.env.PORT || 5000;

// Cors
app.use(cors());
//configure env;
dotenv.config();
// Middleware to parse JSON request bodies
app.use(express.json());
// Middleware to parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript Node Express!");
});

app.use("/", userRoute);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
