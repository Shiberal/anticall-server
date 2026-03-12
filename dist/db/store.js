"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const schema_1 = __importDefault(require("./schema"));
const uuid_1 = require("uuid");
exports.store = {
    // Reports
    createReport: (number, type, deviceId) => {
        const report = {
            id: (0, uuid_1.v4)(),
            number,
            type,
            device_id: deviceId,
            created_at: Date.now(),
        };
        schema_1.default.prepare('INSERT INTO reports (id, number, type, device_id, created_at) VALUES (?, ?, ?, ?, ?)')
            .run(report.id, report.number, report.type, report.device_id, report.created_at);
        return report;
    },
    getReport: (id) => {
        return schema_1.default.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    },
    getPendingReports: (limit = 50, offset = 0) => {
        return schema_1.default.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT ? OFFSET ?')
            .all(limit, offset);
    },
    // Votes
    upsertVote: (reportId, deviceId, voteValue) => {
        const now = Date.now();
        schema_1.default.prepare(`
      INSERT INTO votes (id, report_id, device_id, vote, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(report_id, device_id) DO UPDATE SET
        vote = excluded.vote,
        created_at = excluded.created_at
    `).run((0, uuid_1.v4)(), reportId, deviceId, voteValue, now);
    },
    getVoteStats: (reportId) => {
        const result = schema_1.default.prepare(`
      SELECT 
        SUM(CASE WHEN vote > 0 THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN vote < 0 THEN 1 ELSE 0 END) as negative
      FROM votes WHERE report_id = ?
    `).get(reportId);
        return {
            positive: result.positive || 0,
            negative: result.negative || 0
        };
    },
    // Blocklist
    upsertBlocklistEntry: (entry) => {
        schema_1.default.prepare(`
      INSERT INTO blocklist (number, type, weight, source_id, added_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(number, type) DO UPDATE SET
        weight = excluded.weight,
        added_at = excluded.added_at
    `).run(entry.number, entry.type, entry.weight || 0, entry.sourceId || null, entry.addedAt || Date.now());
    },
    getBlocklistEntry: (number) => {
        return schema_1.default.prepare('SELECT * FROM blocklist WHERE number = ?').all(number);
    },
    getAllBlocklist: () => {
        return schema_1.default.prepare('SELECT * FROM blocklist').all();
    },
    // Federation
    getFederationInstances: () => {
        return schema_1.default.prepare('SELECT * FROM federation_instances').all();
    }
};
