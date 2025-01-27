import fs from 'fs';
import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import { google } from 'googleapis';

import { defaultDirPath, __dirname, upload } from './storage.js';
import { insertIntoDB } from './db.js';

const app = express();
const PORT = 8080;

// Google API configuration
const CLIENT_ID = '201515577238-nfuiu0uq944op9h64folmhfeee7hvver.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:8080/callback';
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
let tokens;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve static frontend files

// File listing (local)
app.get('/list', (req, res) => {
    fs.readdir(defaultDirPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read directory' });
        }

        const results = [];
        let pending = files.length;

        if (!pending) return res.json({ items: results });

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
                if (pending === 0) res.json({ items: results });
            });
        });
    });
});

// File upload (local)
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    res.json({ success: `File uploaded successfully: ${req.file.filename}` });
    const filePath = defaultDirPath + req.file.filename;

    fs.stat(filePath, (error, stats) => {
        if (error) return console.log(`Error in opening file metadata: ${error}`);

        const fileSize = stats.size;
        const fileExt = path.extname(req.file.filename);
        const creationDate = stats.birthtime;
        const lastModified = stats.mtime;

        insertIntoDB(req.file.filename, fileSize, fileExt, creationDate, lastModified);
    });
});

// Google Drive Authentication
app.get('/auth', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive'],
    });
    res.redirect(authUrl);
});

// OAuth2 Callback
app.get('/callback', async (req, res) => {
    try {
        const { code } = req.query; 
        const { tokens: authTokens } = await oAuth2Client.getToken(code); 
        oAuth2Client.setCredentials(authTokens); 
        tokens = authTokens; 

        // Serve the callback HTML page
        res.sendFile(path.join(__dirname, '../frontend/callback.html'));
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).send('Authentication failed. Please try again.');
    }
});


// Google Drive: Create Folder
app.post('/create-folder', async (req, res) => {
    if (!tokens) return res.status(401).send('unauthorized. please authenticate first.');

    oAuth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const fileMetadata = {
        name: req.body.name || 'Untitled Folder',
        mimeType: 'application/vnd.google-apps.folder',
    };

    try {
        const response = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        res.json({ id: response.data.id });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.post('/create-file', async (req, res) => {
    if (!tokens) return res.status(401).send('unauthorized. please authenticate first.');

    oAuth2Client.setCredentials(tokens);
    const drive = google.drive({version: 'v3', auth: oAuth2Client });

    const fileMetadata = {
        name: req.body.name || 'Untitled Document',
        mimeType: 'application/octet-stream',
    }

    try {
        const response = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        res.json({ id: response.data.id });
    } catch (error) {
        res.status(500).send(error.message);
    }

});

// Google Drive: List Files
app.get('/drive-list', async (req, res) => {
    if (!tokens) return res.status(401).send('Unauthorized. Please authenticate first.');

    oAuth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    try {
        const response = await drive.files.list({
            pageSize: 100,
            fields: 'nextPageToken, files(id, name, mimeType)',
        });

        const files = response.data.files || [];
        const labeledFiles = files.map(file => ({
            id: file.id,
            name: file.name,
            type: file.mimeType === 'application/vnd.google-apps.folder' ? 'Folder' : 'File',
        }));

        res.json({ files: labeledFiles });
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).send('Error fetching files from Google Drive.');
    }
});

app.get('/drive', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/drive.html'));
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
