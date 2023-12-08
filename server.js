import express from "express";
import mongoose from "mongoose";
import { S3, GetObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import csv from "csv-parser";
import User from "./User.model";


// Express APP initialisation
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// S3 Configuration
const s3 = new S3({
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
  },
  region: process.env.REGION,
});

const storage = multerS3({
  bucket: process.env.BUCKET,
  s3: s3,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });


// Read and handle Data from S3
async function processDataFromS3(filepath, res) {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.BUCKET,
      Key: filepath,
    });
    const s3Stream = (await s3.send(command)).Body.pipe(csv());

    let records = [];
    let recordsProcessed = 0;
    const batchSize = 1500;

    s3Stream.on("data", async (data) => {
      records.push(data);
      recordsProcessed++;

      if (recordsProcessed == batchSize) {
        records = [];
        recordsProcessed = 0;
        await saveRecordsToDB(records);
      }
    });

    s3Stream.on("end", async () => {
      if (records.length > 0) {
        await saveRecordsToDB(records);
      }
      console.log("Processing the data completed");
      return res.json({
        success: true,
        message: "Data Added to DB successfully",
      });
    });

    s3Stream.on("error", (err) => {
      console.log("Error occurred while processing the data");
      return res
        .status(400)
        .json({
          success: false,
          message: "An error occurred while processing data",
        });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'An unknown error occurred' });
  }
}

async function saveRecordsToDB(records) {
  try {
    await User.insertMany(records);
    console.log("Inserted data");
  } catch (error) {
    console.log("Error occurred while writting db");
    throw Error("Error while inserting to DB");
  }
}


// API Endpoints
app.post("/upload-file", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Please upload a file" });
  }

  res.json({
    success: true,
    message: "File uploaded successfully",
    filename: req.file.filename,
  });
});

app.get("/read-file-content", async (req, res) => {
  const { query } = req;
  return await processDataFromS3(query.fileKey, res);
});


// DB Connections
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("Connection to MongoDB successful");
  app.listen(process.env.PORT, () => {
    console.log(`Server runs on port ${process.env.PORT}...`);
  });
});
