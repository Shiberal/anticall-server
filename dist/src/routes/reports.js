"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../db/store");
const reportService_1 = require("../services/reportService");
const router = (0, express_1.Router)();
const VOTE_RATIO_THRESHOLD = parseFloat(process.env.VOTE_RATIO_THRESHOLD || '0.8');
const VOTE_RATIO_DEMOTE_THRESHOLD = parseFloat(process.env.VOTE_RATIO_DEMOTE_THRESHOLD || '0.5');
router.post('/', (req, res) => {
    const { number, type, description } = req.body;
    if (!number || !type) {
        return res.status(400).json({ error: 'Number and type are required' });
    }
    const { report, isNew } = reportService_1.reportService.createReport(number, type, req.deviceId, description);
    res.status(isNew ? 201 : 200).json(report);
});
router.patch('/:id', (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { description } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'Missing report id' });
    }
    const report = store_1.store.getReport(id);
    if (!report) {
        return res.status(404).json({ error: 'Report not found' });
    }
    store_1.store.updateReportDescription(id, description ?? null);
    const updated = store_1.store.getReport(id);
    res.json(updated);
});
function getScoreStatus(ratio, totalVotes, type) {
    const minVotes = reportService_1.reportService.getMinVotesForType(type);
    if (totalVotes < minVotes || ratio === null)
        return 'pending';
    if (ratio >= VOTE_RATIO_THRESHOLD)
        return 'promoted';
    if (ratio < VOTE_RATIO_DEMOTE_THRESHOLD)
        return 'removed';
    return 'pending';
}
function enrichReportsWithVotes(reports, deviceId) {
    return reports.map((r) => {
        const stats = store_1.store.getVoteStats(r.id);
        const total = stats.positive + stats.negative;
        const ratio = total > 0 ? stats.positive / total : null;
        const scoreStatus = getScoreStatus(ratio, total, r.type);
        return {
            ...r,
            isMine: !!deviceId && r.device_id === deviceId,
            votes: stats.positive - stats.negative,
            votesUp: stats.positive,
            votesDown: stats.negative,
            scoreRatio: ratio,
            scoreStatus,
        };
    });
}
router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const q = req.query.q || '';
    const reports = q
        ? store_1.store.searchReports(q, Math.min(limit, 200))
        : store_1.store.getPendingReports(limit, offset);
    res.json(enrichReportsWithVotes(reports, req.deviceId));
});
router.delete('/:id', (req, res) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
        return res.status(400).json({ error: 'Missing report id' });
    }
    const report = store_1.store.getReport(id);
    if (!report) {
        return res.status(404).json({ error: 'Report not found' });
    }
    if (report.device_id !== req.deviceId) {
        return res.status(403).json({ error: 'Only the report owner can remove it' });
    }
    try {
        reportService_1.reportService.deleteReport(id, req.deviceId);
        res.json({ success: true });
    }
    catch (err) {
        res.status(403).json({ error: err.message });
    }
});
router.post('/:id/vote', (req, res) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { vote } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'Missing report id' });
    }
    if (vote !== 1 && vote !== -1) {
        return res.status(400).json({ error: 'Vote must be 1 or -1' });
    }
    reportService_1.reportService.vote(id, req.deviceId, vote);
    res.json({ success: true });
});
exports.default = router;
