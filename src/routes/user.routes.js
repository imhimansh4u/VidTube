import { Router } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  updateAvatar,
  updateCoverImage,
  updateAccountDetails,
  updatePassword,
  refreshAccessToken,
  currentUser,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = new Router();

router.route("/register").post(
  upload.fields([
    // //So multer processes the incoming form-data files and attaches them to req.files, before your actual function runs.(simply a middleware always)
    { name: "avatar", maxCount: 1 },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

// Route for the login part
router.route("/login").post(loginUser);

// Route for the logout purpose
router.route("/logout").post(verifyJWT, logoutUser); // Here verifyJWT is a middleware which firstly do its operation and then pass the control to logoutUser through the help of next()..

// route to update the avatar image
router
  .route("/updateavatar")
  .patch(verifyJWT,upload.single("newavatar"), updateAvatar); // You can also use here upload.single() as we are uploading only single file here

//Route to update the new Cover Image
router
  .route("/updateCoverImage")
  .patch(verifyJWT, upload.single("newCoverImage"), updateCoverImage);

// Router to update the password
router.route("/update-Password").patch(verifyJWT,updatePassword);
// Route to update the Account Details
router.route("/update-Account-Details").patch(verifyJWT,updateAccountDetails);
// Route to refresh the access token
router.route("/refresh-token").post(refreshAccessToken); 

// Route to get the current user 
router.route("/current-user").get(verifyJWT,currentUser);
//Route to get the user channel details
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
//Route to get the watch history
router.route("/Watch-History").get(verifyJWT,getWatchHistory); 
export default router;