import { Router } from "express";
import {
    toggleVideoLike
} from "../controllers/like.controller.js"
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = new Router();

router.use(verifyJWT);

// Now route to toggle the like on any video 
router.route("/toggle-Like").patch(toggleVideoLike);
