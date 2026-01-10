/**
 * Database operations wrapper
 * Supports SQLite (development) dan Vercel Postgres (production)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use /tmp for Vercel serverless (ephemeral but writable)
const isVercel = process.env.VERCEL || process.env.NOW_REGION;
const DB_DIR = isVercel ? '/tmp/database' : path.join(__dirname, '..', 'database');
const DB_PATH = path.join(DB_DIR, 'app.db');

let db = null;
let dbInitialized = false;

/**
 * Lazy initialize database (called on first use)
 */
function initDB() {
    if (dbInitialized) return db;

    try {
        // Ensure database directory exists
        if (!fs.existsSync(DB_DIR)) {
            fs.mkdirSync(DB_DIR, { recursive: true });
        }

        // Initialize database
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Gagal buka database:', err);
                // In serverless, database errors are non-fatal
            }
        });

        // Create tables
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS downloads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        url TEXT NOT NULL,
        title TEXT,
        platform TEXT,
        filename TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

            db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )`);
        });

        dbInitialized = true;
    } catch (error) {
        console.error('Database init error:', error);
    }

    return db;
}

/**
 * Get database instance (lazy init)
 */
function getDB() {
    if (!db) initDB();
    return db;
}

/**
 * User operations
 */
function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        const database = getDB();
        if (!database) return resolve(null);

        database.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getUserById(id) {
    return new Promise((resolve, reject) => {
        const database = getDB();
        if (!database) return resolve(null);

        database.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function createUser(username, password) {
    return new Promise((resolve, reject) => {
        const database = getDB();
        if (!database) return reject(new Error('Database not available'));

        database.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, username });
        });
    });
}

function authenticateUser(username, password) {
    return new Promise((resolve, reject) => {
        const database = getDB();
        if (!database) return resolve(null);

        database.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
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
        const database = getDB();
        if (!database) return resolve({ id: null });

        database.run(
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
        const database = getDB();
        if (!database) return resolve([]);

        database.all(
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
        const database = getDB();
        if (!database) return resolve({ changes: 0 });

        database.run(`DELETE FROM downloads WHERE filename = ?`, [filename], function (err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
}

function updateDownloadFilename(oldFilename, newFilename) {
    return new Promise((resolve, reject) => {
        const database = getDB();
        if (!database) return resolve({ changes: 0 });

        database.run(`UPDATE downloads SET filename = ? WHERE filename = ?`, [newFilename, oldFilename], function (err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
}

module.exports = {
    getDB,
    getUserByUsername,
    getUserById,
    createUser,
    authenticateUser,
    saveDownload,
    getDownloadHistory,
    deleteDownloadRecord,
    updateDownloadFilename
};
