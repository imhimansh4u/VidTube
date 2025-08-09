import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/Cloudinary.js";
import { upload } from "../middlewares/multer.middlewares.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
    if(!title){
        console.log("Title of the video is missing");
        throw new ApiError(400,"Title of the video is required");
    }
    if(!description){
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
        console.log("Video file is uploaded succesfully: ",video);
        
    } catch (error) {
        console.log("Error while uplaoding the video file ",error);
        throw new ApiError(404,"Error while video file on cloudinary");
    }
    //Now upload the Thumbnail on Cloudinary 
    let thumbnail;
    try {
        thumbnail = await uploadOnCloudinary(ThumbnailLocalFile);
        console.log("Thumbnail is uplaoded on cloudinary ",thumbnail);
    } catch (error) {
        console.log("Error while uplaoding the thumbnail: ",error);
        throw new ApiError(404,"Error while uplaoding the thumbnail to the cloudinary"); 
    }
    // Now set the video 
    let VideoUploaded;
    try {
        const newVideo = await Video.create({
          videoFile: video.secure_url,
          thumbnail: thumbnail.secure_url,
          title: title,
          description: description || "",
          owner : req.user?._id,
          duration : Math.floor(video.duration),          // It return the video duration in seconds 
        });
        VideoUploaded = await Video.findById(newVideo?._id);
        if(!VideoUploaded){
            console.log("Video is not setted");
            throw new ApiError(500,"Video is not uploaded or set in the database");
        }
        // if all went good 
        return res
            .status(201)
            .json(new ApiResponse(201,VideoUploaded,"The Video is uploaded succesfully"));

    } catch (error) {
        console.log("Error while setting the video file : ",error);
        // if the video is not set , then delete the video and thumbnail from cloudinary also 
        if(video){
            await deleteFromCloudinary(video.public_id);
        }
        if(thumbnail){
            await deleteFromCloudinary(thumbnail.public_id);
        }
        if (!VideoUploaded) {
          console.log("Video is not setted");
          throw new ApiError(
            500,
            "Video is not uploaded or set in the database"
          );
        }
    }
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
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
