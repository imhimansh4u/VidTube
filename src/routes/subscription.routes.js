import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import {
    toggleSubscription,
    getUserChannelSubscribers, 
    getSubscribedChannels,
} from "../controllers/subscription.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = new Router();
router.use(verifyJWT)     // verifyJWT will now be used in all Routes
 
// Route to Toggle subscribed status 
router.route("/toggle-subscription/:channelId").patch(toggleSubscription);
// Now to get the Subscribers list
router.route("/get-subscribers-list/:channelId").get(getUserChannelSubscribers);
// Now to get the subscribed Channels 
router
  .route("/get-subscribed-channels/:subscriberId")
  .get(getSubscribedChannels);
    
export default router;
