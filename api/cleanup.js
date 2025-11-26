/**
 * API Endpoint: /api/cleanup
 * Delete temporary files
 */

const fs = require('fs');
const path = require('path');
const { deleteDownloadRecord } = require('../lib/db');

const DOWNLOAD_DIR = path.join(__dirname, '..', 'downloads');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { fileName } = req.body || {};

    if (!fileName || typeof fileName !== 'string') {
        return res.json({ success: false, error: 'Missing fileName' });
    }

    // Prevent path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        return res.json({ success: false, error: 'Invalid file name' });
    }

    const filePath = path.join(DOWNLOAD_DIR, fileName);

    if (!fs.existsSync(filePath)) {
        return res.json({ success: false, error: 'File not found' });
    }

    try {
        // Delete file
        fs.unlinkSync(filePath);

        // Remove from database
        try {
            await deleteDownloadRecord(fileName);
        } catch (dbError) {
            console.error('Cleanup DB error:', dbError);
        }

        return res.json({ success: true });
    } catch (e) {
        console.error('Cleanup error:', e);
        return res.json({ success: false, error: 'Failed to delete file' });
    }
};
