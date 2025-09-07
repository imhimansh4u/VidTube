import { Playlist } from "../models/playlists.models.js";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";


// To get all Playlist based on users Query 
const getAllPlaylists = asyncHandler(async (req,res)=>{
  const { page = 1, limit = 10, query, sortType } = req.query;
  const numPage = parseInt(page) || 1;
  const numlimit = parseInt(limit) || 10;
  const playlists = await Playlist.aggregate([
    // first stage is to add owner details
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "owner",
        as: "ownerDetails",
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    // Lookup for the video detals (for Views Information
    {
      $lookup: {
        from: "videos",
        foreignField: "_id",
        localField: "videos",
        as: "videoDetails",
      },
    },
    // calculate average views per Videos
    {
      $addFields: {
        avgViews: {
          $cond: {
            if: { $gt: [{ $size: "$videoDetails" }, 0] }, // check if total videos >0
            then: { $avg: "$videoDetails.views" }, // average views
            else: 0,
          },
        },
      },
    },
    //Now match stage
    {
      $match: {
        visibility: "public",
        $or: [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { "ownerDetails.username": { $regex: query, $options: "i" } },
        ],
      },
    },

    { $sort: { avgViews: -1 } },
    {
      $project : {
        name : 1,
        description : 1,
        "ownerDetails.username" : 1,
        "ownerDetails._id" : 1,
        "ownerDetails.avatar" : 1,
        "ownerDetails.fullname" : 1,
      }
    },
    // Now do pagination
    { $skip: (numPage - 1) * numlimit },
    { $limit: numlimit},
  ]);

  return res
          .status(200)
          .json(new ApiResponse(
            200,
            playlists,
            "Here are the fetched Playlists"
          ))
})
// To Create a new Playlist
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description , visibility} = req.body;

  if (!name || name.trim() === "" || !visibility  || visibility.trim() === "") {
    throw new ApiError(400, "Please enter a valid Playlist credentials");
  }

  const playlist = await Playlist.create({
    name: name,
    description: description || "",
    owner: req.user?._id,
    videos: [],
    visibility : visibility,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist Created"));
});

// get users Playlist (public)
const getUserPublicPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId).select(
    "-password -refreshToken -watchHistory"
  );
  if(!user){
    throw new ApiError(404,"Enter a valid UserId");
  }

  const allPlaylists = await Playlist.find({
    owner: userId,
    visibility: "public",
  }).sort({ createdAt: -1 }).populate("videos", "title views thumbnail description");
  
  return res
        .status(200)
        .json(new ApiResponse(
            200,
            allPlaylists || [],
            "Here are all the Playlists"
        ))

});

// get users Private Playlists 
const getUserPrivatePlaylists = asyncHandler(async (req,res)=>{
    const { userId } = req.params;
    const user = await User.findById(userId).select(
      "-password -refreshToken -watchHistory"
    );
    if (!user) {
      throw new ApiError(404, "Enter a valid UserId");
    }

    if(userId.trim() !== req.user?._id.toString()){
        throw new ApiError(403,"Authorization error");
    }
    const allPlaylists = await Playlist.find({
      owner: userId,
      visibility: "private",
    })
      .sort({ createdAt: -1 })
      .populate("videos", "title views thumbnail description");


    return res
      .status(200)
      .json(
        new ApiResponse(200, allPlaylists || [], "Here are all the Playlists")
      );
});

// Get Playlist by id
const getPlaylistById = asyncHandler(async (req,res)=>{
    const {playlistId} = req.params;
    const playlist = await Playlist.findById(playlistId).populate(
      "videos",
      "title views thumbnail description"
    );

    if (!playlist) {
      throw new ApiError(404, "Playlist not found");
    }
    const owner = playlist?.owner;         // this will give mongoose Object id
  
    if(playlist.visibility === "private"){
      if(owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403,"auth issue");
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "fetched Playlist"));
})


// To add a Video in any Playlist
const addVideo = asyncHandler(async (req, res) => {
  const {playlistId , videoId} = req.params;

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "This playlist Doesnt Exists");
  }
  const video = await Video.findById(videoId);
  if(!video){
    throw new ApiError(404,"This Video doesnt exists");
  }
  
   // for duplicate check
  const exists = await Playlist.exists({ _id: playlistId, videos: videoId });
  if (exists) {
    throw new ApiError(400, "This video already exist in this playlist");
  }

  
  await playlist.videos.push(new mongoose.Types.ObjectId(videoId));
  await playlist.save();

  await playlist.populate("videos", "title views thumbnail description");

  return res
         .status(200)
         .json(new ApiResponse(
          200,
          playlist,
          "Video added to the playlist"
         ))


});


// To remove any Video from any Playlist
const removeVideo = asyncHandler(async (req,res)=>{
  const {playlistId,videoId} = req.params;

  const playlist = await Playlist.findById(playlistId);
  if(!playlist){
    throw new ApiError(400,"Playlist not found");
  }
  const video = await Video.findById(videoId);
  if(!video){
    throw new ApiError(400,"This Video is not found");
  }

  // check if the video to be removed from the playlist even exists in the playlist or not
  const exists = await Playlist.exists({ _id: playlistId, videos: videoId });
  if (!exists) {
    throw new ApiError(400, "This video doesn't exist in this playlist");
  }

  const returnPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true } // return updated playlist
  ).populate("videos", "title views thumbnail description");

  return res
          .status(200)
          .json(new ApiResponse(
            200,
            returnPlaylist,
            "Video deleted from the playlist"
          ))
})

// To delete any Playlist 
const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  // check if playlist exists
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }


  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this playlist");
  }

  await Playlist.findByIdAndDelete(playlistId);

  return res.status(200).json(
    new ApiResponse(200, {}, "Playlist deleted successfully")
  );
});


// TO update playlist details
const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  // check if playlist exists
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }


  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this playlist");
  }

  // update fields
  if (name) playlist.name = name;
  if (description) playlist.description = description;

  await playlist.save();

  return res.status(200).json(
    new ApiResponse(200, playlist, "Playlist updated successfully")
  );
});

export {
  createPlaylist,
  getUserPublicPlaylists,
  getUserPrivatePlaylists,
  getPlaylistById,
  addVideo,
  removeVideo,
  deletePlaylist,
  updatePlaylist,
  getAllPlaylists,
};





// NOTE -> In aggregation, MongoDB runs the pipeline directly.