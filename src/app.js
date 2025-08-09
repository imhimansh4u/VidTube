import express from "express";
import cors from "cors"; // CORS (Cross-Origin Resource Sharing) is a security feature built into web browsers that controls how a web page from one origin can request resources from another origin. (mainly decide which frontends should access this backend {{For understanding}})
import cookieParser from "cookie-parser";
import multer from "multer"; // the express doesnt gives us any way for file handlind (i/o) , so we use here multer which is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files.

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // this means that which frontend should be allowed to access or restrict the backend , will get from .env file
    credentials: true, //This means: "Allow cookies, sessions, or authentication headers to be sent in requests."
  })
);
// common middlewares
app.use(express.json({ limit: "16kb" })); //“When the frontend sends data in JSON format (like with POST/PUT), read and parse that JSON — but don’t accept more than 16 kilobytes of data.”
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //It parses data sent with the application/x-www-form-urlencoded content type (the default for HTML forms) and adds it to req.body so you can access it in your route handlers.
app.use(express.static("public")); //This tells Express to serve static files (like images, CSS, JS, HTML) from the public folder.
app.use(cookieParser()); // Helps to read the cookies from the websites

//import routes
import healthcheckRouter from "./routes/healthcheck.routes.js";
import userRoutes from "./routes/user.routes.js";
import videoRoutes from "./routes/video.routes.js";
import { errorHandler } from "./middlewares/error.middlewares.js";

//routes
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/video",videoRoutes);
app.use(errorHandler);

export { app };

//Note ->
/**
 Middleware is a function that runs before your route handler (app.get, app.post, etc.). 
 */
