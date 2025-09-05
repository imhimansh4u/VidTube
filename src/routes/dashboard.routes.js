import { Router } from "express";
import {
    displayChannelDetails,
    allVideosOfChannel
} from "../controllers/dashboard.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = new Router();

router.use(verifyJWT);

router.route("/C/profile/:channelName").get(displayChannelDetails);

router.route("/C/Videos/:channelname").get(allVideosOfChannel);

export default router;