/**
 * Database operations wrapper
 * Supports SQLite (development) dan Vercel Postgres (production)
        db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getUserById(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function createUser(username, password) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, username });
        });
    });
}

function authenticateUser(username, password) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * Download history operations
 */
function saveDownload(userId, url, title, platform, filename) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO downloads (user_id, url, title, platform, filename) VALUES (?, ?, ?, ?, ?)`,
            [userId, url, title, platform, filename],
            function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            }
        );
    });
}

function getDownloadHistory(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM downloads WHERE user_id = ? ORDER BY timestamp DESC`,
            [userId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

function deleteDownloadRecord(filename) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM downloads WHERE filename = ?`, [filename], function (err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
}

function updateDownloadFilename(oldFilename, newFilename) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE downloads SET filename = ? WHERE filename = ?`, [newFilename, oldFilename], function (err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
}

module.exports = {
    db,
    getUserByUsername,
    getUserById,
    createUser,
    authenticateUser,
    saveDownload,
    getDownloadHistory,
    deleteDownloadRecord,
    updateDownloadFilename
};
