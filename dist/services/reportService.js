"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportService = void 0;
const store_1 = require("../db/store");
const VOTE_RATIO_THRESHOLD = parseFloat(process.env.VOTE_RATIO_THRESHOLD || '0.8');
const MIN_VOTES = parseInt(process.env.MIN_VOTES || '3', 10);
exports.reportService = {
    createReport: (number, type, deviceId) => {
        const report = store_1.store.createReport(number, type, deviceId);
        // Auto-vote +1 for the reporter
        store_1.store.upsertVote(report.id, deviceId, 1);
        // Check if it already passes threshold (unlikely with MIN_VOTES > 1)
        exports.reportService.checkThresholdAndPromote(report.id);
        return report;
    },
    vote: (reportId, deviceId, voteValue) => {
        store_1.store.upsertVote(reportId, deviceId, voteValue);
        exports.reportService.checkThresholdAndPromote(reportId);
    },
    checkThresholdAndPromote: (reportId) => {
        const report = store_1.store.getReport(reportId);
        if (!report)
            return;
        const stats = store_1.store.getVoteStats(reportId);
        const totalVotes = stats.positive + stats.negative;
        if (totalVotes >= MIN_VOTES) {
            const ratio = stats.positive / totalVotes;
            if (ratio >= VOTE_RATIO_THRESHOLD) {
                // Promote to blocklist
                store_1.store.upsertBlocklistEntry({
                    number: report.number,
                    type: report.type,
                    weight: stats.positive,
                    addedAt: Date.now(),
                    sourceId: 'local'
                });
            }
        }
    }
};
