import { Router } from "express";
import {
  createPlaylist,
  getUserPublicPlaylists,
  getUserPrivatePlaylists,
  getPlaylistById,
  addVideo,
  removeVideo,
  deletePlaylist,
  updatePlaylist,
  getAllPlaylists,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

//all routes require authentication
router.use(verifyJWT);


// to get all playlists 
router.route("/get").get(getAllPlaylists);
// create a new playlist
router.route("/create").post(createPlaylist);

// get all public playlists of a user
router.route("/public/:userId").get(getUserPublicPlaylists);

// get all private playlists of a user (only owner)
router.route("/private/:userId").get(getUserPrivatePlaylists);

// get a playlist by id 
router.route("/get/:playlistId").get(getPlaylistById);

// update a playlist (name / description)
router.route("/update/:playlistId").patch(updatePlaylist);

// delete a playlist
router.route("/delete/:playlistId").delete(deletePlaylist);

// add a video to playlist
router.route("/P/:playlistId/video/:videoId").post(addVideo);

// remove a video from playlist
router.route("/:playlistId/remove-video/:videoId").delete(removeVideo);

export default router;
