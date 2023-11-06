const mongoose=require("mongoose");
const Schema=mongoose.Schema;

const userSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    rollno:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        default:"user"
    },
    qrsrc:{
        type:String,
        required:true
    },
    orders:[{
        day:{
            type:Number
        },
        time:{
            type:Number
        },
        state:{
            type:String,
        }}
    ],

},{timestamps:true})

module.exports=mongoose.model("User",userSchema)