import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  getPublicIdFromUrl,
  uploadOnCloudinary,
} from "../utils/Cloudinary.js";
import { upload } from "../middlewares/multer.middlewares.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    console.log("Title of the video is missing");
    throw new ApiError(400, "Title of the video is required");
  }
  if (!description) {
    console.log("Description is missing");
  }
  // firstly get the localFIle of video
  const videoLocalFile = req?.files?.videoFile?.[0]?.path;
  //Now for Thumbnail
  const ThumbnailLocalFile = req?.files?.Thumbnail?.[0]?.path;

  // Now uplaod the video on cloudinary
  let video;
  try {
    video = await uploadOnCloudinary(videoLocalFile);
    console.log("Video file is uploaded succesfully: ", video);
  } catch (error) {
    console.log("Error while uplaoding the video file ", error);
    throw new ApiError(404, "Error while video file on cloudinary");
  }
  //Now upload the Thumbnail on Cloudinary
  let thumbnail;
  try {
    thumbnail = await uploadOnCloudinary(ThumbnailLocalFile);
    console.log("Thumbnail is uplaoded on cloudinary ", thumbnail);
  } catch (error) {
    console.log("Error while uplaoding the thumbnail: ", error);
    throw new ApiError(
      404,
      "Error while uplaoding the thumbnail to the cloudinary"
    );
  }
  // Now set the video
  let VideoUploaded;
  try {
    const newVideo = await Video.create({
      videoFile: video.secure_url,
      thumbnail: thumbnail.secure_url,
      title: title,
      description: description || "",
      owner: req.user?._id,
      duration: Math.floor(video.duration), // It return the video duration in seconds
    });
    VideoUploaded = await Video.findById(newVideo?._id);
    if (!VideoUploaded) {
      console.log("Video is not setted");
      throw new ApiError(500, "Video is not uploaded or set in the database");
    }
    // if all went good
    return res
      .status(201)
      .json(
        new ApiResponse(201, VideoUploaded, "The Video is uploaded succesfully")
      );
  } catch (error) {
    console.log("Error while setting the video file : ", error);
    // if the video is not set , then delete the video and thumbnail from cloudinary also
    if (video) {
      await deleteFromCloudinary(video.public_id);
    }
    if (thumbnail) {
      await deleteFromCloudinary(thumbnail.public_id);
    }
    if (!VideoUploaded) {
      console.log("Video is not setted");
      throw new ApiError(500, "Video is not uploaded or set in the database");
    }
  }
});

//TODO: get video by id
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // find the video
  let video;
  try {
    video = await Video.findById(videoId).populate("owner", "username avatar");
    if (!video) {
      throw new ApiError(404, "Video not found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, video, "Video is fetched Succesfully"));
  } catch (error) {
    console.log("Video not Found ", error);
    throw new ApiError(404, "Video file is not Found ");
  }
});

//TODO: update video details like title, description, thumbnail 
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { NewTitle, NewDescription } = req.body;
  // Firstly grab the video
  const video = await Video.findById(videoId); 
  if (!video) {
    console.log("Video Not found");
    throw new ApiError(400, `video with _id ${videoId} is Not found`);
  }
  // public_id of current thumbnail
  const oldThumbnail = video.thumbnail;
  // also grab the New thumbnail from the multer file
  const NewThumbnailLocalPath = req?.file?.path;
  //Firstly check that the user who is trying to update the video details must be the owner of the video
  const user = req.user._id;
  if (video.owner.toString() !== user.toString()) {
    console.log("You are Not the Owner");
    throw new ApiError(403, "You have not permission to Update this Video:");
  }
  if (NewTitle) {
    video.title = NewTitle;
  }
  if (NewDescription) {
    video.description = NewDescription;
  }
  let newThumbnail;
  if (NewThumbnailLocalPath) {
    try {
      newThumbnail = await uploadOnCloudinary(NewThumbnailLocalPath);
      console.log("New Thumbnail Image uplaoded on cloudinary succesfully");
    } catch (error) {
      console.log("Error while uploading The newThubnail to Cloudinary");
      throw new ApiError(
        400,
        "Error while uploading The newThubnail to Cloudinary"
      );
    }
  }
  if (newThumbnail) {
    video.thumbnail = newThumbnail.secure_url;
  }
  await video.save({ validateBeforeSave: false });

  //Now delete the old thumbnail from cloudinary
  try {
    if (oldThumbnail) {
      const toBeDeleted = getPublicIdFromUrl(oldThumbnail);
      await deleteFromCloudinary(toBeDeleted);
      console.log("Old thumbnail is deleted from Cloudinary");
    }
  } catch (error) {
    console.log(
      "Error while deleting the old thumbnail from the Cloudinary ",
      error
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(201, video, "All details Updated"));
});


//TODO: delete video 
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  
  const video = await Video.findById(videoId);
  if(!video){
    console.log(`Video with videoId ${videoId} is not found`);
    throw new ApiError(404 , "No such Video Found");
  }
  const videoFile = video.videoFile;
  const thumbnail = video.thumbnail;
  const owner = video.owner;
  // Only give permission to delete the video if he is the owner of that video 
  if(req.user?._id.toString() !== owner.toString()){
    console.log("You are not authorized to delete this video");
    throw new ApiError(403,"You are not the owner of this video,You cant delete it");
  } 
  let isDeleted;
  try {
    isDeleted = await Video.deleteOne({ _id: videoId }); // deleteOne returns object containing { acknowledged: true, deletedCount: 1 }
    if (isDeleted.deletedCount === 1) {
      console.log("Video Deleted Succesfully");
    }
    else{
      console.log("Failed to delete the Video");
      throw new ApiError(400,"Failed to delete the Video");
    }
  } catch (error) {
    console.log("Failed to delete the video details from database", error);
    throw new ApiError(400,"Failed to delete the Video: ");
    
  }
  // Now if the Video is deleted Succesfully delete the old video and its thumbnail
  try {
    const toBeDeleted = getPublicIdFromUrl(videoFile);
    const isDeleted = await deleteFromCloudinary(toBeDeleted);
    if(isDeleted){
      console.log("Video file is succesfully deleted: ");
    }
    else{
      console.log("Failed to delete:");
    }
  } catch (error) {
    console.log("Failed to delete the video from Cloudinary ",error);
  }
  // Now similarly delete the Video Thumbmnail  
  try {
    const toBeDeleted = getPublicIdFromUrl(thumbnail);   // extract the Public Id from the URL 
    const isDeleted = await deleteFromCloudinary(toBeDeleted);
    if(isDeleted){
      console.log("Thumbnail is deleted Succesfully : ");
    }
    else{
      console.log("Failed to delete thumbnail from CLoudinary");
      
    }
  } catch (error) {
      console.log("Failed to delete Video Thumbnail from Cloudinary");
  }
  return res
        .status(200)
        .json(new ApiResponse(200,null,"Video is deleted Succesfully from database"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
