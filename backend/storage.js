import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// default directory for storing event files
const defaultDirPath = '../../../media/ankush/ce408218-7b15-42dd-aef8-86f40a02c432/uploads/';


// upload directory creation for storing purpose
const uploadDir = path.join(__dirname, defaultDirPath);
if(!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {recursive: true});
}


// Storage Configuration for uploaded files
const storage = multer.diskStorage ({
    destination: (req, file, callback) => {
        callback(null, defaultDirPath);
    },
    filename: (req, file, callback) => {
        //callback(null, `${Date.now()}-${file.originalname}`);
        callback(null, `${file.originalname}`);
    }
})

const upload = multer({ storage });

export { __dirname, upload, defaultDirPath };