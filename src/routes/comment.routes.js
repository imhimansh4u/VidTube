import { Router } from "express";
import {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
} from "../controllers/comment.controller.js";

import {verifyJWT} from "../middlewares/auth.middleware.js";


const router = new Router();
router.use(verifyJWT);

// Route to getVideoComments 
router.route("/get-Video-Comments/:videoId").get(getVideoComments);
// Route to add a new COmment 
router.route("/add-Comments/:videoId").post(addComment);
// ROute to update a comment 
router.route("/update-Comments/:commentId").patch(updateComment);
// Route to delete amy comment 
router.route("/delete-Comments/:commentId").delete(deleteComment);

export default router;
