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

  // Build the aggregation pipeline
  const pipeline = [];
  // The first stage is lookup stage in which we will join the with userId and grab the username(for channel name purpose) to look for the channel
  pipeline.push({
    $lookup: {
      from : "users",
      localField : "owner",
      foreignField : "_id",
      as : "ownerDetails",
    },
  });

  // The lookup will add the details of the owner in a array , so unwind (since there will be only on doc in the array it will simply give that in a object type)
  pipeline.push({
    $unwind : "$ownerDetails",
  })

  // the next stage which is match stage
  const matchStage = {};
  // if a search query is provided then we will search in the title and description field
  if (query) {
    matchStage.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      {"ownerDetails.username" : {$regex : query, $options: "i"}},
    ];
  }

  // Now check if the userID is provided , then we want only those vdos that belong to that user
  if (userId) {
    //firstly that is it a valid userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID format");
    }
    matchStage.owner = new mongoose.Types.ObjectId(userId); // in the match stage we have to provide the owner id in mongoose Object type
  }

  // we only want the vdos which are isPublished
  matchStage.IsPublished = true;

  // add the matchStage to the pipleline only if has something inside it
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  // Now sort stage
  // We default to sorting by 'createdAt' in descending order (newest first).
  const sortStage = {};
  if(sortBy){
    sortStage[sortBy] = sortType === 'asc' ? 1 : -1;
  }
  else{
    // if no information like sortBy or sortType is mentioned , then by default sort in descending order of createdAt (newwest first)
    sortStage.createdAt = -1;
  }
  pipeline.push({$sort : sortStage});

  // Now project
  pipeline.push({
    $project: {
      "ownerDetails.password": 0,
      "ownerDetails.email": 0,
      "ownerDetails.refreshToken": 0,
      "ownerDetails.watchHistory" : 0,
    },
  });

  // Now Next stage,which is pagination stage
  const options = {
    page: parseInt(page, 10), // 10 here  specifies that the number should be parsed in base-10(mtlb ki normal decimal number)
    limit: parseInt(limit, 10), 
  };

  const videoAggregate = Video.aggregate(pipeline);
  const videos = await Video.aggregatePaginate(videoAggregate,options);
  // Now if videoAggreagte is succesfull , simply return the response
  if(!videos || videos.docs.length === 0){
    return res
            .status(200)
            .json(new ApiResponse(200,{docs:[] , totalDocs:0},"OOps! No videos Found"));
  }
  // final response if videos found
  return res
          .status(200)
          .json(new ApiResponse(200,videos,"This are the videos Found"))
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

//TODO: get video by id (Also users can access only those vdos which are published but owner can access published and unpublished vdos also)
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // find the video
  let video;
  try {
    video = await Video.findById(videoId).populate("owner", "username avatar");
    if (!video) {
      throw new ApiError(404, "Video not found");
    }
    //NOTES-> After populating the owner is not only _id , it is now a abject coantining _id , username , avatar 
    const isOwner = (video.owner?._id.toString() === req.user?._id.toString());  
    if(!video.IsPublished && !isOwner){
      return res.status(403).json(new ApiResponse(403,null,"You are not authorized to access this vdo"));
    }
    return res
            .status(200)
            .json(new ApiResponse(200,video,"Video fetched succesfully"));
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
  // Grab the Video 
  const video = await Video.findById(videoId);
  if(!video){
    console.log("Video is Not found");
    throw new ApiError(404,"Video is not found"); 
  }
  if(req.user?._id.toString() !== video.owner.toString()){
    console.log("You cant do this");
    throw new ApiError(403,"You are not authorized to do this");
  }
  try {
    video.IsPublished = !video.IsPublished; 
    await video.save({validateBeforeSave : false});
    return res
            .status(200)
            .json(new ApiResponse(200,video,"Succesfully toggled the isPublished status"));
  } catch (error) {
    console.log("Failed to toggle the Published status",error);
    throw new ApiError(400,"Failed to toggle Published status"); 
  }
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
