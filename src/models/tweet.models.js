import mongoose,{Schema} from "mongoose";

const tweetsSchema = new Schema({
    content:{
        type: String,
        trim : true,
        required : true,
    },
    owner : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
},{timestamps:true}
)

export const Tweet = mongoose.model("Tweet",tweetsSchema)