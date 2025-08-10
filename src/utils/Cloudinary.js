import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// configure the cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return; // if localfilepath is not there , simply return
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // Tells Cloudinary to automatically detect the file type (image, video, etc). (optional)
    });
    console.log("File uploaded on cloudinary, File src : " + response.url); //response.url` contains the **link to the file** (e.g., `https://res.cloudinary.com/...`)

    // Now once the file is uploaded , we would like to delete it from out server
    fs.unlinkSync(localFilePath); //unlinkSync() is used to delete the local file from your machine/server.  Because the file is now on Cloudinary, and keeping it locally wastes space.

    return response; // The function **returns the `response` object**, which contains info about the uploaded file (like `url`, `public_id`, etc.).
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

// This function actually helps to delete any file uploaded on cloudinary in case like file uploaded but user is not resgistered .

const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(
      "Succesfully deleted resource from cloudinary with publicId",
      publicId
    );
  } catch (error) {
    console.log("Eroor deleting from cloudinary of the resource", error);
    return null;
  }
};
function getPublicIdFromUrl(url) {
  const parts = url.split("/");
  const fileWithExt = parts[parts.length - 1]; // e.g., "image_name.jpg"
  const fileName = fileWithExt.split(".")[0]; // e.g., "image_name"
  return fileName;
}

export { uploadOnCloudinary , deleteFromCloudinary,getPublicIdFromUrl};
