// api/remux.js - Production Vercel Serverless Function
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path; 

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4.5mb'
        }
    }
};

export default async function handler(req, res) {
    // Enable CORS to allow your local browser extension to send requests safely
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST requests.' });
    }

    try {
        const { fileData } = req.body;
        if (!fileData) {
            return res.status(400).json({ error: 'Missing raw chunk payload parameters.' });
        }

        const inputBuffer = Buffer.from(fileData);
        
        const inputPath = path.join('/tmp', `input_${Date.now()}.webm`);
        const outputPath = path.join('/tmp', `output_${Date.now()}.mp4`);

        fs.writeFileSync(inputPath, inputBuffer);

        // Executes the track alignment pass to output an authentic MP4 container block
        execSync(`"${ffmpegPath}" -i ${inputPath} -c copy -movflags faststart ${outputPath}`);

        const outputBuffer = fs.readFileSync(outputPath);

        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', 'attachment; filename=video.mp4');
        return res.status(200).send(outputBuffer);

    } catch (err) {
        console.error('❌ Server transcoding error:', err);
        return res.status(500).json({ error: 'Transcoding process failed inside server container.' });
    }
}
