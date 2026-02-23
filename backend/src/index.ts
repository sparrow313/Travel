import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { isAuthenticated } from "./helper/helper";
const app = express();

import userRoute from "./routes/usersRoute";
import profileRoute from "./routes/profileRoute";
import placeRoutes from "../src/routes/placeRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import tripRoutes from "./routes/tripRoutes";

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
app.use("/places", isAuthenticated, placeRoutes);
app.use("/reviews", reviewRoutes);
app.use("/trips", tripRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
