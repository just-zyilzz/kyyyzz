/**
 * API Endpoint: /api/auth/register
 * User registration
 */

const { createUser, getUserByUsername } = require('../../lib/db');
const { generateToken, createCookieHeader } = require('../../lib/session');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, error: 'Username dan password wajib diisi' });
    }

    try {
        // Check if user already exists
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return res.json({ success: false, error: 'Username sudah terdaftar' });
        }

        // Create new user (Note: In production, hash the password with bcrypt!)
        const newUser = await createUser(username, password);

        // Generate JWT token
        const token = generateToken(newUser);

        // Set cookie
        res.setHeader('Set-Cookie', createCookieHeader('token', token));

        res.json({ success: true, token });
    } catch (error) {
        console.error('Register error:', error);
        res.json({ success: false, error: 'Gagal daftar' });
    }
};
