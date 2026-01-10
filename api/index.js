/**
 * Vercel Serverless Function Entry Point
 * This file is required for Vercel to recognize the project
 */

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv="refresh" content="0; url=/public/index.html">
        </head>
        <body>
            Redirecting...
        </body>
        </html>
    `);
};
