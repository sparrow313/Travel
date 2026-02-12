import express, { Request, Response } from "express";
import userRoute from "./routes/usersRoute";
import profileRoute from "./routes/profileRoute";
import cors from "cors";
import dotenv from "dotenv";
import { isAuthenticated } from "./helper/helper";
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

app.get("/", isAuthenticated, (req: Request, res: Response) => {
  res.send("Hello, TypeScript Node Express!");
});

app.use("/", userRoute);
app.use("/profile", isAuthenticated, profileRoute);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
