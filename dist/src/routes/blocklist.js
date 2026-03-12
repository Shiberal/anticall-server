"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../db/store");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    const federated = store_1.store.getAllBlocklist();
    const personal = store_1.store.getPersonalBlocklist(req.deviceId);
    const federatedNumbers = new Set(federated.map((e) => e.number));
    const merged = [...federated];
    personal.forEach((p) => {
        if (!federatedNumbers.has(p.number)) {
            merged.push({
                number: p.number,
                type: 'other',
                tier: 'personal',
                weight: 1,
                sourceId: 'personal',
                addedAt: p.added_at,
            });
        }
    });
    res.json(merged);
});
router.post('/personal', (req, res) => {
    const { number } = req.body;
    if (!number || typeof number !== 'string') {
        return res.status(400).json({ error: 'Number is required' });
    }
    const normalized = number.replace(/\D/g, '');
    if (normalized.length < 10) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }
    const fullNumber = normalized.length <= 10 ? `+1${normalized}` : `+${normalized}`;
    store_1.store.addPersonalBlock(req.deviceId, fullNumber);
    res.json({ success: true, number: fullNumber });
});
router.delete('/personal/:number', (req, res) => {
    const raw = req.params.number;
    const number = Array.isArray(raw) ? raw[0] : raw;
    if (!number) {
        return res.status(400).json({ error: 'Number is required' });
    }
    const normalized = number.replace(/\D/g, '');
    const fullNumber = normalized.length <= 10 ? `+1${normalized}` : `+${normalized}`;
    store_1.store.removePersonalBlock(req.deviceId, fullNumber);
    res.json({ success: true });
});
exports.default = router;
