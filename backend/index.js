import fs from 'fs';
import express from 'express';
import path from 'path';

import { defaultDirPath, __dirname, upload } from './storage.js';
import { insertIntoDB } from './db.js';

const hashmap = new Map();
const app = express();
const PORT = 8080;

let file_path;

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/list', (req, res) => {
    fs.readdir(defaultDirPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read directory' });
        }

        const results = []; // Store files and folders

        let pending = files.length;
        if (!pending) {
            // If the directory is empty, send an empty response
            return res.json({ items: results });
        }

        //console.log(pending);

        files.forEach(file => {
            const filePath = path.join(defaultDirPath, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    results.push({ error: `Failed to get status for ${file}` });
                } else if (stats.isFile()) {
                    results.push({ file });
                } else if (stats.isDirectory()) {
                    results.push({ folder: file });
                }

                pending -= 1;
                if (pending === 0) {
                    res.json({ items: results });
                }
            });
        });
    });
});



// Endpoint to handle file uploads
// Here the upload MIDDLEWARE checks the 'file' tag in html
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    
    if(hashmap.has(req.file.filename)) {
        return res.status(400).json({ error: 'File with the same name already exists.' });
    }

    hashmap.set(req.file.filename, true);

    res.json({success: `File uploaded successfully: ${req.file.filename}`});
    file_path = defaultDirPath + req.file.filename;

    fs.stat(file_path, (error, stats) =>  {
        if(error) {
        console.log(`Error in opening file metadata: ${error}`)
        }

        const fileSize = stats.size;
        const fileExt = path.extname(req.file.filename);
        const creationDate = stats.birthtime;
        const lastModified = stats.mtime;

        insertIntoDB(req.file.filename, fileSize, fileExt, creationDate, lastModified);

        /*
        Data to be inserted into the database
        
        console.log('File Metadata:');
        console.log('Size (bytes):', stats.size);
        console.log('Created At:', stats.birthtime);
        console.log('Modified At:', stats.mtime);
        console.log('Is File:', stats.isFile());
        console.log('Is Directory:', stats.isDirectory());
        */
    })
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});