import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Like } from "../models/like.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Mongoose } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Comment } from "../models/comment.models.js";
import mongoose from "mongoose";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found");
  }
  const allComments = await Comment.aggregate([
    // firstly match only the docs who have videoId in the video section
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    // Now do facet
    {
      $facet: {
        // paginate the comments
        comments: [
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
            },
          },
          {
            $unwind: "$owner",
          },
          {
            $project: {
              content: 1,
              video: 1,
              "owner.name": 1,
              "owner.username": 1,
              "owner.avatar": 1,
            },
          },
        ],
        // b) count the total comments
        totalComments: [{ $count: "count" }],
      },
    },
    // Now a new stage
    {
      $project: {
        comments: 1,
        totalComments: {
          $ifNull: [{ $arrayElemAt: ["$totalComments.count", 0] }, 0],
        }, // This means if no comments are there totalComments value is 0
      },
    },
  ]);

  // Final Response
  const response = {
    comments: allComments[0].comments,
    totalComments: allComments[0].totalComments,
    totalPages: Math.ceil(allComments[0].totalComments / limit),
    currentPage: page,
  };

  if (allComments[0].comments.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "No comments on this Video"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Here are the fetched Comments"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  // To add the comment on a video we should firstly know which Video we are adding the comment to , which we will get from request
  const { videoId } = req.params;
  const { content } = req.body;
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video is not found");
  }

  if(!content || content.trim() === ""){
    throw new ApiError(400,"Please give some content for the comment");
  }

  const comment = await Comment.create({
    video : videoId,
    content : content,
    owner : req.user?._id,
  })

  if(!comment){
    return res
            .status(404)
            .json(new ApiResponse(
                404,
                null,
                "Failed to add the comment"
            ))
  }
  return res
         .status(200)
         .json(new ApiResponse(
            200,
            comment,
            "The comment is added succesfully"
         ))
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  // grab the videoId from params 
  const {commentId} = req.params;
  const {newContent} = req.body;  
   
  // find the comment 
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  // firstly authorize that only the owner of the comment can only update it
  if(req.user?._id.toString() !== comment.owner.toString()){
    throw new ApiError(403,"You are not authorized to update this comment");
  }
  if(!newContent || newContent.trim() === ""){
    throw new ApiError(400,"Give the Updated Comment content");
  }

  const newComment = await Comment.findByIdAndUpdate(
    commentId,
    {content : newContent},
    {new : true}
  )

  if(!newComment){
    return res
           .status(400)
           .json(new ApiResponse(
            400,
            null,
            'The Comment is not updated'
           ))             
  }
  return res
          .status(200)
          .json(new ApiResponse(
            200,
            newComment,
            "The comment is Updated"
          ))
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const {commentId} = req.params; 
  const comment  = await Comment.findById(commentId);
  if(!comment){
    throw new ApiError(404,"Comment Not found");
  }
  if(comment.owner.toString() !== req.user?._id.toString() ){
    throw new ApiError(403,"Not authorized");
  }
  // Now delete 
  await Comment.findByIdAndDelete(commentId);
  return res.
          status(200)
          .json(
            new ApiResponse(
              200,
              null,
              "The comment is Deleted Succesfully"
            )
          )
});


export {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment
}



