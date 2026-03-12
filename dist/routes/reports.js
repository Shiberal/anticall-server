"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../db/store");
const reportService_1 = require("../services/reportService");
const router = (0, express_1.Router)();
router.post('/', (req, res) => {
    const { number, type } = req.body;
    if (!number || !type) {
        return res.status(400).json({ error: 'Number and type are required' });
    }
    const report = reportService_1.reportService.createReport(number, type, req.deviceId);
    res.status(201).json(report);
});
router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const reports = store_1.store.getPendingReports(limit, offset);
    res.json(reports);
});
router.post('/:id/vote', (req, res) => {
    const { id } = req.params;
    const { vote } = req.body;
    if (vote !== 1 && vote !== -1) {
        return res.status(400).json({ error: 'Vote must be 1 or -1' });
    }
    reportService_1.reportService.vote(id, req.deviceId, vote);
    res.json({ success: true });
});
exports.default = router;
