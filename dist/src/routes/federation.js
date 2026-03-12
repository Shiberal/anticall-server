"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../db/store");
const router = (0, express_1.Router)();
// Simple shared secret for federation auth (can be improved with API keys)
const FEDERATION_SECRET = process.env.FEDERATION_SECRET || 'default_secret';
const federationAuth = (req, res, next) => {
    const secret = req.header('X-Federation-Secret');
    if (secret !== FEDERATION_SECRET) {
        return res.status(403).json({ error: 'Invalid federation secret' });
    }
    next();
};
router.post('/pull', federationAuth, (req, res) => {
    const entries = store_1.store.getAllBlocklist();
    const response = {
        entries,
        hasMore: false
    };
    res.json(response);
});
router.post('/push', federationAuth, (req, res) => {
    const payload = req.body;
    if (!payload.entries || !Array.isArray(payload.entries)) {
        return res.status(400).json({ error: 'Invalid push payload' });
    }
    payload.entries.forEach(entry => {
        store_1.store.upsertBlocklistEntry({
            ...entry,
            sourceId: payload.from
        });
    });
    res.json({ success: true });
});
exports.default = router;
