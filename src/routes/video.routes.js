import { Router } from "express";
import {upload} from "../middlewares/multer.middlewares.js"
import {
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getAllVideos,
  getVideoDetails,
  increaseViews,
} from "../controllers/video.controller.js";
import {verifyJWT} from "../middlewares/auth.middleware.js"


const router = Router();

router.use(verifyJWT); // This will use verfiyJWT in all the routes

// To publish any Video
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
// TO get the video by its ID 
router.route("/V/:videoId").get(getVideoById);

// To update the Video Details
router.route("/U/:videoId").patch(upload.single("NewThumbnail"), updateVideo);
// To Delete any Video
router.route("/D/:videoId").delete(deleteVideo);
// To toggle to isPublished status 
router.route("/T/:videoId").patch(togglePublishStatus);
// To get all the Videos 
router.route("/getAll-Videos").get(getAllVideos);
// To get the detail of and Video
router.route("/get-V-Details/:videoId").get(getVideoDetails);
// to increase views on Videos
router.route("/views/:videoId").patch(increaseViews);
export default router;