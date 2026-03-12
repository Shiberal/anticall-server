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
    createReport: (number, type, deviceId, description) => {
        const report = {
            id: (0, uuid_1.v4)(),
            number,
            type,
            description: (description && description.trim()) || null,
            device_id: deviceId,
            created_at: Date.now(),
        };
        schema_1.default.prepare('INSERT INTO reports (id, number, type, description, device_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(report.id, report.number, report.type, report.description, report.device_id, report.created_at);
        return report;
    },
    updateReportDescription: (reportId, description) => {
        schema_1.default.prepare('UPDATE reports SET description = ? WHERE id = ?').run(description, reportId);
    },
    getReport: (id) => {
        return schema_1.default.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    },
    getReportByNumberAndType: (number, type) => {
        return schema_1.default.prepare('SELECT * FROM reports WHERE number = ? AND type = ? ORDER BY created_at DESC LIMIT 1')
            .get(number, type);
    },
    getReportsByNumberAndType: (number, type) => {
        return schema_1.default.prepare('SELECT * FROM reports WHERE number = ? AND type = ? ORDER BY created_at DESC')
            .all(number, type);
    },
    deleteReport: (id) => {
        schema_1.default.prepare('DELETE FROM votes WHERE report_id = ?').run(id);
        schema_1.default.prepare('DELETE FROM reports WHERE id = ?').run(id);
    },
    getPendingReports: (limit = 50, offset = 0) => {
        return schema_1.default.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT ? OFFSET ?')
            .all(limit, offset);
    },
    searchReports: (query, limit = 100) => {
        if (!query || query.replace(/\D/g, '').length < 3) {
            return schema_1.default.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT ?')
                .all(limit);
        }
        const digits = `%${query.replace(/\D/g, '')}%`;
        return schema_1.default.prepare('SELECT * FROM reports WHERE number LIKE ? ORDER BY created_at DESC LIMIT ?')
            .all(digits, limit);
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
        const tier = entry.tier || 'default';
        schema_1.default.prepare(`
      INSERT INTO blocklist (number, type, tier, weight, source_id, added_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(number, type) DO UPDATE SET
        tier = excluded.tier,
        weight = excluded.weight,
        added_at = excluded.added_at
    `).run(entry.number, entry.type, tier, entry.weight || 0, entry.sourceId || null, entry.addedAt || Date.now());
    },
    removeBlocklistEntry: (number, type) => {
        schema_1.default.prepare('DELETE FROM blocklist WHERE number = ? AND type = ? AND source_id = ?')
            .run(number, type, 'local');
    },
    getBlocklistEntry: (number) => {
        return schema_1.default.prepare('SELECT * FROM blocklist WHERE number = ?').all(number);
    },
    getAllBlocklist: () => {
        return schema_1.default.prepare('SELECT * FROM blocklist').all();
    },
    // Personal blocklist (per device)
    getPersonalBlocklist: (deviceId) => {
        return schema_1.default.prepare('SELECT number, added_at FROM personal_blocklist WHERE device_id = ?')
            .all(deviceId);
    },
    addPersonalBlock: (deviceId, number) => {
        schema_1.default.prepare('INSERT OR REPLACE INTO personal_blocklist (device_id, number, added_at) VALUES (?, ?, ?)')
            .run(deviceId, number, Date.now());
    },
    removePersonalBlock: (deviceId, number) => {
        schema_1.default.prepare('DELETE FROM personal_blocklist WHERE device_id = ? AND number = ?')
            .run(deviceId, number);
    },
    // Federation
    getFederationInstances: () => {
        return schema_1.default.prepare('SELECT * FROM federation_instances').all();
    }
};
