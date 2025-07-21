import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { diskStorage } from "multer";

export const verifyJWT = asyncHandler(
  async (req, _, next) => {
    // step-1)-> Grab the access token from the request
    const token =
      req.cookies.accessToken ||
      req.body.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

      if(!token){
        throw new ApiError(401,"Unauthorized");
      }
      try {
        // 2)-> the part of decoding the access token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); // VERIFY  that the token getting from the request is valid n?
        //3)-> Now grab the user from the decoded token
        const user = await User.findById(decodedToken?._id).select(
          "-password -refreshToken"
        );
        if (!user) {
          throw new ApiError(401, "Unauthorized");
        }

        req.user = user; // User Context: It attaches the authenticated user's details to the request object (req.user) for use in subsequent middleware or route handlers.
        next();
      } catch (error) {
        throw new ApiError(401, error?.message || "Invalid token");
      }
  }
);

// NOTE-> STUDYING ABOUT HEADERS

/**
 * Headers are just extra information send along with the api , which may contains some basic information like access tokens or some other user information .. 
 * // TO SEND THE ACCESS TOKEN IN THE HEADER WE USE 
 * fetch('/api/data', {
  headers: {
    Authorization: `Bearer <your_token>`          // "Bearer " // this is important and must do thing a format , which cannot be denied 
  }
});

 */
