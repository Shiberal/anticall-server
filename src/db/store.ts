import db from './schema';
import { BlocklistEntry, BlockType, BlockTier } from '../../data_template/interfaces';
import { v4 as uuidv4 } from 'uuid';

export interface Report {
  id: string;
  number: string;
  type: BlockType;
  description?: string | null;
  device_id: string;
  created_at: number;
}

export interface Vote {
  id: string;
  report_id: string;
  device_id: string;
  vote: number;
  created_at: number;
}

export const store = {
  // Reports
  createReport: (number: string, type: BlockType, deviceId: string, description?: string | null): Report => {
    const report: Report = {
      id: uuidv4(),
      number,
      type,
      description: (description && description.trim()) || null,
      device_id: deviceId,
      created_at: Date.now(),
    };
    db.prepare('INSERT INTO reports (id, number, type, description, device_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(report.id, report.number, report.type, report.description, report.device_id, report.created_at);
    return report;
  },

  updateReportDescription: (reportId: string, description: string | null): void => {
    db.prepare('UPDATE reports SET description = ? WHERE id = ?').run(description, reportId);
  },

  getReport: (id: string): Report | undefined => {
    return db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as Report | undefined;
  },

  getReportByNumberAndType: (number: string, type: BlockType): Report | undefined => {
    return db.prepare('SELECT * FROM reports WHERE number = ? AND type = ? ORDER BY created_at DESC LIMIT 1')
      .get(number, type) as Report | undefined;
  },

  getReportsByNumberAndType: (number: string, type: BlockType): Report[] => {
    return db.prepare('SELECT * FROM reports WHERE number = ? AND type = ? ORDER BY created_at DESC')
      .all(number, type) as Report[];
  },

  deleteReport: (id: string): void => {
    db.prepare('DELETE FROM votes WHERE report_id = ?').run(id);
    db.prepare('DELETE FROM reports WHERE id = ?').run(id);
  },

  getAllReportIds: (): string[] => {
    const rows = db.prepare('SELECT id FROM reports').all() as { id: string }[];
    return rows.map((r) => r.id);
  },

  getPendingReports: (limit = 50, offset = 0): Report[] => {
    return db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as Report[];
  },

  searchReports: (query: string, limit = 100): Report[] => {
    if (!query || query.replace(/\D/g, '').length < 3) {
      return db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT ?')
        .all(limit) as Report[];
    }
    const digits = `%${query.replace(/\D/g, '')}%`;
    return db.prepare('SELECT * FROM reports WHERE number LIKE ? ORDER BY created_at DESC LIMIT ?')
      .all(digits, limit) as Report[];
  },

  // Votes
  upsertVote: (reportId: string, deviceId: string, voteValue: number): void => {
    const now = Date.now();
    db.prepare(`
      INSERT INTO votes (id, report_id, device_id, vote, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(report_id, device_id) DO UPDATE SET
        vote = excluded.vote,
        created_at = excluded.created_at
    `).run(uuidv4(), reportId, deviceId, voteValue, now);
  },

  getVoteStats: (reportId: string): { positive: number; negative: number } => {
    const result = db.prepare(`
      SELECT 
        SUM(CASE WHEN vote > 0 THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN vote < 0 THEN 1 ELSE 0 END) as negative
      FROM votes WHERE report_id = ?
    `).get(reportId) as { positive: number; negative: number };
    
    return {
      positive: result.positive || 0,
      negative: result.negative || 0
    };
  },

  // Blocklist
  upsertBlocklistEntry: (entry: BlocklistEntry): void => {
    const tier = (entry as BlocklistEntry & { tier?: BlockTier }).tier || 'default';
    db.prepare(`
      INSERT INTO blocklist (number, type, tier, weight, source_id, added_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(number, type) DO UPDATE SET
        tier = excluded.tier,
        weight = excluded.weight,
        added_at = excluded.added_at
    `).run(entry.number, entry.type, tier, entry.weight || 0, entry.sourceId || null, entry.addedAt || Date.now());
  },

  removeBlocklistEntry: (number: string, type: BlockType): void => {
    db.prepare('DELETE FROM blocklist WHERE number = ? AND type = ? AND source_id = ?')
      .run(number, type, 'local');
  },

  getBlocklistEntry: (number: string): BlocklistEntry[] => {
    return db.prepare('SELECT * FROM blocklist WHERE number = ?').all(number) as BlocklistEntry[];
  },

  getAllBlocklist: (): BlocklistEntry[] => {
    return db.prepare('SELECT * FROM blocklist').all() as BlocklistEntry[];
  },

  // Personal blocklist (per device)
  getPersonalBlocklist: (deviceId: string): { number: string; added_at: number }[] => {
    return db.prepare('SELECT number, added_at FROM personal_blocklist WHERE device_id = ?')
      .all(deviceId) as { number: string; added_at: number }[];
  },

  addPersonalBlock: (deviceId: string, number: string): void => {
    db.prepare('INSERT OR REPLACE INTO personal_blocklist (device_id, number, added_at) VALUES (?, ?, ?)')
      .run(deviceId, number, Date.now());
  },

  removePersonalBlock: (deviceId: string, number: string): void => {
    db.prepare('DELETE FROM personal_blocklist WHERE device_id = ? AND number = ?')
      .run(deviceId, number);
  },

  // Federation
  getFederationInstances: () => {
    return db.prepare('SELECT * FROM federation_instances').all();
  }
};
