const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.warn(`[AUTH_FAIL] IP: ${req.ip} | ${error.name}: ${error.message}`);
        const isExpired = error.name === 'TokenExpiredError';
        res.status(401).json({ error: isExpired ? 'Token expired.' : 'Invalid token.' });
    }
};
