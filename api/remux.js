// api/remux.js - Vercel Serverless Function
// Receives WebM data streams and outputs structurally valid, native MP4 containers.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('fs');

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4.5mb' // Locks request boundaries to satisfy Vercel free tier constraints
        }
    }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST requests.' });
    }

    try {
        const { fileData } = req.body;
        if (!fileData) {
            return res.status(400).json({ error: 'Missing raw chunk payload parameters.' });
        }

        // Convert the incoming array back into a raw file buffer
        const inputBuffer = Buffer.from(fileData);
        
        // Define isolated workspace paths inside Vercel's temporary directory
        const inputPath = '/tmp/input_' + Date.now() + '.webm';
        const outputPath = '/tmp/output_' + Date.now() + '.mp4';

        // Write the incoming WebM bytes to disk
        fs.writeFileSync(inputPath, inputBuffer);

        // STITCH FIX: Run an optimized, fast container remuxing command.
        // '-c copy' copies the original perfect audio/video tracks instantly without re-encoding, 
        // while rewriting the container into an authentic, native MP4.
        execSync(`ffmpeg -i ${inputPath} -c copy -movflags faststart ${outputPath}`);

        // Read the newly constructed, non-corrupt MP4 bytes
        const outputBuffer = fs.readFileSync(outputPath);

        // Clean up temporary server files immediately
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);

        // Stream the perfect MP4 file binary straight back to the extension
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', 'attachment; filename=video.mp4');
        return res.status(200).send(outputBuffer);

    } catch (err) {
        console.error('❌ Server transcoding error:', err);
        return res.status(500).json({ error: 'Transcoding process failed inside server container.' });
    }
}
