"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const uuid_1 = require("uuid");
function toStr(v) {
    return v === undefined ? undefined : Array.isArray(v) ? v[0] : v;
}
const authMiddleware = (req, res, next) => {
    const deviceId = toStr(req.header('X-Device-UUID')) || toStr(req.header('Authorization'))?.replace('Bearer ', '');
    if (!deviceId) {
        return res.status(401).json({ error: 'Missing X-Device-UUID header or Bearer token' });
    }
    if (!(0, uuid_1.validate)(deviceId)) {
        return res.status(400).json({ error: 'Invalid UUID format' });
    }
    req.deviceId = deviceId;
    next();
};
exports.authMiddleware = authMiddleware;
