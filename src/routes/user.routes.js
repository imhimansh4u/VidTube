import { Router } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  updateAvatar,
  updateCoverImage,
  updateAccountDetails,
  updatePassword,
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
  .put(upload.fields([{ name: "newavatar", maxCount: 1 }]), updateAvatar);

//Route to update the new Cover Image
router
  .route("/updateCoverImage")
  .put(
    upload.fields([{ name: "newCoverImage", maxCount: 1 }]),
    updateCoverImage
  );

// Roouter to update the password
router.route("/updatePassword").put(updatePassword);
// Route to update the Account Details
router.route("/updateAccountDetails").put(updateAccountDetails);
export default router;
