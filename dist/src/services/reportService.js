"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportService = void 0;
const store_1 = require("../db/store");
const VOTE_RATIO_THRESHOLD = parseFloat(process.env.VOTE_RATIO_THRESHOLD || '0.8');
const VOTE_RATIO_DEMOTE_THRESHOLD = parseFloat(process.env.VOTE_RATIO_DEMOTE_THRESHOLD || '0.5');
const MIN_VOTES = parseInt(process.env.MIN_VOTES || '3', 10);
const MIN_VOTES_SPAM = parseInt(process.env.MIN_VOTES_SPAM || process.env.MIN_VOTES || '3', 10);
const MIN_VOTES_TELEMARKETER = parseInt(process.env.MIN_VOTES_TELEMARKETER || process.env.MIN_VOTES || '3', 10);
const MIN_VOTES_HARASSMENT = parseInt(process.env.MIN_VOTES_HARASSMENT || process.env.MIN_VOTES || '3', 10);
exports.reportService = {
    createReport: (number, type, deviceId, description) => {
        const existing = store_1.store.getReportByNumberAndType(number, type);
        if (existing) {
            store_1.store.upsertVote(existing.id, deviceId, 1);
            if (description != null && description.trim() !== '') {
                store_1.store.updateReportDescription(existing.id, description.trim());
            }
            exports.reportService.checkThresholdAndPromote(existing.id);
            return { report: { ...existing, description: description?.trim() || existing.description }, isNew: false };
        }
        const report = store_1.store.createReport(number, type, deviceId, description);
        store_1.store.upsertVote(report.id, deviceId, 1);
        exports.reportService.checkThresholdAndPromote(report.id);
        return { report, isNew: true };
    },
    vote: (reportId, deviceId, voteValue) => {
        store_1.store.upsertVote(reportId, deviceId, voteValue);
        exports.reportService.checkThresholdAndPromote(reportId);
    },
    getMinVotesForType: (type) => {
        switch (type) {
            case 'spam': return MIN_VOTES_SPAM;
            case 'telemarketer': return MIN_VOTES_TELEMARKETER;
            case 'harassment': return MIN_VOTES_HARASSMENT;
            default: return MIN_VOTES;
        }
    },
    deleteReport: (reportId, deviceId) => {
        const report = store_1.store.getReport(reportId);
        if (!report)
            return;
        if (report.device_id !== deviceId) {
            throw new Error('Only the report owner can remove it');
        }
        const { number, type } = report;
        store_1.store.deleteReport(reportId);
        store_1.store.removeBlocklistEntry(number, type);
        const remaining = store_1.store.getReportsByNumberAndType(number, type);
        remaining.forEach((r) => exports.reportService.checkThresholdAndPromote(r.id));
    },
    checkThresholdAndPromote: (reportId) => {
        const report = store_1.store.getReport(reportId);
        if (!report)
            return;
        const stats = store_1.store.getVoteStats(reportId);
        const totalVotes = stats.positive + stats.negative;
        const minVotes = exports.reportService.getMinVotesForType(report.type);
        if (totalVotes >= minVotes) {
            const ratio = stats.positive / totalVotes;
            if (ratio >= VOTE_RATIO_THRESHOLD) {
                // Promote to blocklist with tier based on type
                const tier = report.type === 'spam' ? 'surely_spam' :
                    report.type === 'scam' ? 'surely_scam' :
                        report.type === 'telemarketer' ? 'surely_telemarketer' :
                            report.type === 'harassment' ? 'surely_harassment' : 'default';
                store_1.store.upsertBlocklistEntry({
                    number: report.number,
                    type: report.type,
                    tier,
                    weight: stats.positive,
                    addedAt: Date.now(),
                    sourceId: 'local'
                });
            }
            else if (ratio < VOTE_RATIO_DEMOTE_THRESHOLD) {
                // Demote: remove from blocklist when enough thumbs down
                store_1.store.removeBlocklistEntry(report.number, report.type);
            }
        }
    }
};
