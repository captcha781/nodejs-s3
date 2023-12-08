import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
    userId: {
        type: String,
        default: ''
    },
    firstName: {
        type: String,
        default: ''
    },
    lastName: {
        type: String,
        default: ''
    },
    gender: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    dateOfBirth: {
        type: String,
        default: ''
    },
    jobTitle: {
        type: String,
        default: ''
    }
})

export default mongoose.model('userInfo', UserSchema, 'userInfo')