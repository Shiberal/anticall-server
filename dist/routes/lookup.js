"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../db/store");
const router = (0, express_1.Router)();
router.get('/:number', (req, res) => {
    const { number } = req.params;
    const entries = store_1.store.getBlocklistEntry(number);
    const result = {
        blocked: entries.length > 0,
        number,
        types: entries.length > 0 ? entries.map(e => e.type) : undefined,
        confidence: entries.length > 0 ? Math.max(...entries.map(e => e.weight || 0)) : undefined
    };
    res.json(result);
});
exports.default = router;
