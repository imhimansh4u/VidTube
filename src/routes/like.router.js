import { Router } from "express";
import {
  toggleVideoLike,
  toggleCommentLike,
} from "../controllers/like.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = new Router();

router.use(verifyJWT);

// Now route to toggle the like on any video
router.route("/V/toggle-Like/:videoId").patch(toggleVideoLike);

// Route to toggle like on any comment
router.route("/C/toggle-Like/:commentId").patch(toggleCommentLike);

export default router;

