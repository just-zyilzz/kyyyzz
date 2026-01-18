/**
 * Database operations wrapper
 * Supports SQLite (development) dan Vercel Postgres (production)
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use /tmp for Vercel serverless (ephemeral but writable)
const isVercel = process.env.VERCEL || process.env.NOW_REGION;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = isVercel ? '/tmp/database' : path.join(__dirname, '..', '..', 'database'); // Adjusted path for src/lib
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
        password TEXT,
        github_id TEXT UNIQUE,
        email TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

            // Check if new columns exist (migration for existing users table)
            db.all("PRAGMA table_info(users)", (err, rows) => {
                if (!err && rows) {
                    const columns = rows.map(r => r.name);

                    if (!columns.includes('github_id')) {
                        db.run("ALTER TABLE users ADD COLUMN github_id TEXT UNIQUE", (err) => {
                            if (err) console.error("Migration error adding github_id:", err);
                        });
                    }

                    if (!columns.includes('email')) {
                        db.run("ALTER TABLE users ADD COLUMN email TEXT", (err) => {
                            if (err) console.error("Migration error adding email:", err);
                        });
                    }

                    if (!columns.includes('avatar_url')) {
                        db.run("ALTER TABLE users ADD COLUMN avatar_url TEXT", (err) => {
                            if (err) console.error("Migration error adding avatar_url:", err);
                        });
                    }

                    if (!columns.includes('created_at')) {
                        db.run("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
                            if (err) console.error("Migration error adding created_at:", err);
                        });
                    }

                    if (!columns.includes('updated_at')) {
                        db.run("ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
                            if (err) console.error("Migration error adding updated_at:", err);
                        });
                    }
                }
            });
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

function getUserByGithubId(githubId) {
    return new Promise((resolve, reject) => {
        const database = getDB();
        if (!database) return resolve(null);

        database.get(`SELECT * FROM users WHERE github_id = ?`, [githubId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function createGithubUser(username, githubId, email = null, avatarUrl = null) {
    return new Promise((resolve, reject) => {
        const database = getDB();
        if (!database) return reject(new Error('Database not available'));

        database.run(
            `INSERT INTO users (username, github_id, email, avatar_url) VALUES (?, ?, ?, ?)`,
            [username, githubId, email, avatarUrl],
            function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, username, github_id: githubId, email, avatar_url: avatarUrl });
            }
        );
    });
}

/**
 * Update user profile (email, avatar)
 */
function updateUserProfile(userId, updates = {}) {
    return new Promise((resolve, reject) => {
        const database = getDB();
        if (!database) return reject(new Error('Database not available'));

        const { email, avatar_url } = updates;
        database.run(
            `UPDATE users SET email = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [email, avatar_url, userId],
            function (err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            }
        );
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

function clearUserHistory(userId) {
    return new Promise((resolve, reject) => {
        const database = getDB();
        if (!database) return resolve({ changes: 0 });

        database.run(`DELETE FROM downloads WHERE user_id = ?`, [userId], function (err) {
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

export {
    getDB,
    getUserByUsername,
    getUserById,
    createUser,
    authenticateUser,
    getUserByGithubId,
    createGithubUser,
    updateUserProfile,
    saveDownload,
    getDownloadHistory,
    deleteDownloadRecord,
    clearUserHistory,
    updateDownloadFilename
};
