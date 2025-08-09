import { Router } from "express";
import {upload} from "../middlewares/multer.middlewares.js"
import {publishAVideo} from "../controllers/video.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"


const router = Router();

router.use(verifyJWT); // This will use verfiyJWT in all the routes
router.route("/publish").post(
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "Thumbnail",
      maxCount: 1,
    },
  ]),
  publishAVideo
);

export default router;