"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../db/store");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    const entries = store_1.store.getAllBlocklist();
    res.json(entries);
});
exports.default = router;
