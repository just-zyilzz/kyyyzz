/**
 * Session/JWT management untuk serverless
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rahasia-jwt-secret-123';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate JWT token
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

/**
 * Extract token from request headers or cookies
 */
function extractToken(req) {
    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Try cookie
    const cookies = parseCookies(req.headers.cookie || '');
    if (cookies.token) {
        return cookies.token;
    }

    return null;
}

/**
 * Parse cookies from cookie header
 */
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;

    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.trim().split('=');
        const name = parts[0];
        const value = parts.slice(1).join('=');
        cookies[name] = decodeURIComponent(value);
    });

    return cookies;
}

/**
 * Get user from request (JWT)
 */
function getUserFromRequest(req) {
    const token = extractToken(req);
    if (!token) return null;

    const decoded = verifyToken(token);
    return decoded;
}

/**
 * Create cookie header
 */
function createCookieHeader(name, value, options = {}) {
    const {
        maxAge = 7 * 24 * 60 * 60, // 7 days in seconds
        httpOnly = true,
        secure = process.env.NODE_ENV === 'production',
        sameSite = 'lax',
        path = '/'
    } = options;

    let cookie = `${name}=${encodeURIComponent(value)}`;

    if (maxAge) cookie += `; Max-Age=${maxAge}`;
    if (httpOnly) cookie += '; HttpOnly';
    if (secure) cookie += '; Secure';
    if (sameSite) cookie += `; SameSite=${sameSite}`;
    if (path) cookie += `; Path=${path}`;

    return cookie;
}

/**
 * Create delete cookie header
 */
function deleteCookieHeader(name) {
    return `${name}=; Max-Age=0; Path=/`;
}

module.exports = {
    generateToken,
    verifyToken,
    extractToken,
    getUserFromRequest,
    parseCookies,
    createCookieHeader,
    deleteCookieHeader
};
