/**
 * GitHub Gist storage for download history
 * Stores user download history in a private JSON Gist
 */

const axios = require('axios');

const GIST_DESCRIPTION = 'Media Downloader History';
const GIST_FILENAME = 'history.json';

/**
 * Find existing history Gist or create a new one
 * @param {string} accessToken - GitHub access token
 * @param {string} username - GitHub username
 * @returns {Promise<string>} Gist ID
 */
async function getOrCreateHistoryGist(accessToken, username) {
    try {
        // List user's gists
        const listResponse = await axios.get(`https://api.github.com/users/${username}/gists`, {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        // Find existing history gist
        const existingGist = listResponse.data.find(gist =>
            gist.description === GIST_DESCRIPTION &&
            gist.files[GIST_FILENAME]
        );

        if (existingGist) {
            return existingGist.id;
        }

        // Create new gist if not found
        const createResponse = await axios.post('https://api.github.com/gists', {
            description: GIST_DESCRIPTION,
            public: false,
            files: {
                [GIST_FILENAME]: {
                    content: JSON.stringify([])
                }
            }
        }, {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        return createResponse.data.id;
    } catch (error) {
        console.error('Error getting/creating gist:', error.response?.data || error.message);
        throw new Error('Failed to access GitHub Gist storage');
    }
}

/**
 * Save complete history to Gist
 * @param {string} accessToken - GitHub access token
 * @param {string} gistId - Gist ID
 * @param {Array} historyData - Array of download objects
 * @returns {Promise<void>}
 */
async function saveToGist(accessToken, gistId, historyData) {
    try {
        await axios.patch(`https://api.github.com/gists/${gistId}`, {
            files: {
                [GIST_FILENAME]: {
                    content: JSON.stringify(historyData, null, 2)
                }
            }
        }, {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
    } catch (error) {
        console.error('Error saving to gist:', error.response?.data || error.message);
        throw new Error('Failed to save to GitHub Gist');
    }
}

/**
 * Read history from Gist
 * @param {string} accessToken - GitHub access token
 * @param {string} gistId - Gist ID
 * @returns {Promise<Array>} Array of download objects
 */
async function getFromGist(accessToken, gistId) {
    try {
        const response = await axios.get(`https://api.github.com/gists/${gistId}`, {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        const content = response.data.files[GIST_FILENAME]?.content || '[]';
        return JSON.parse(content);
    } catch (error) {
        console.error('Error reading from gist:', error.response?.data || error.message);
        return [];
    }
}

/**
 * Add a new download to history
 * @param {string} accessToken - GitHub access token
 * @param {string} username - GitHub username
 * @param {Object} downloadItem - Download object {url, title, platform, filename, thumbnail, timestamp}
 * @returns {Promise<void>}
 */
async function addDownloadToGist(accessToken, username, downloadItem) {
    try {
        // Get or create gist
        const gistId = await getOrCreateHistoryGist(accessToken, username);

        // Get current history
        const history = await getFromGist(accessToken, gistId);

        // Add new item at the beginning (most recent first)
        history.unshift({
            url: downloadItem.url,
            title: downloadItem.title,
            platform: downloadItem.platform,
            filename: downloadItem.filename,
            thumbnail: downloadItem.thumbnail || null,
            timestamp: downloadItem.timestamp || new Date().toISOString()
        });

        // Limit history to 100 items
        const trimmedHistory = history.slice(0, 100);

        // Save updated history
        await saveToGist(accessToken, gistId, trimmedHistory);
    } catch (error) {
        console.error('Error adding download to gist:', error.message);
        throw error;
    }
}

/**
 * Get history from Gist by username
 * @param {string} accessToken - GitHub access token
 * @param {string} username - GitHub username
 * @returns {Promise<Array>} Array of download objects
 */
async function getHistoryFromGist(accessToken, username) {
    try {
        const gistId = await getOrCreateHistoryGist(accessToken, username);
        return await getFromGist(accessToken, gistId);
    } catch (error) {
        console.error('Error getting history from gist:', error.message);
        return [];
    }
}

/**
 * Clear all history in Gist
 * @param {string} accessToken - GitHub access token
 * @param {string} username - GitHub username
 * @returns {Promise<void>}
 */
async function clearGistHistory(accessToken, username) {
    try {
        const gistId = await getOrCreateHistoryGist(accessToken, username);
        await saveToGist(accessToken, gistId, []);
    } catch (error) {
        console.error('Error clearing gist history:', error.message);
        throw error;
    }
}

module.exports = {
    getOrCreateHistoryGist,
    saveToGist,
    getFromGist,
    addDownloadToGist,
    getHistoryFromGist,
    clearGistHistory
};
