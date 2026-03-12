import { store, Report } from '../db/store';
import { BlockType, BlockTier } from '../../data_template/interfaces';

const VOTE_RATIO_THRESHOLD = parseFloat(process.env.VOTE_RATIO_THRESHOLD || '0.8');
const VOTE_RATIO_DEMOTE_THRESHOLD = parseFloat(process.env.VOTE_RATIO_DEMOTE_THRESHOLD || '0.5');
const MIN_VOTES = parseInt(process.env.MIN_VOTES || '3', 10);
const MIN_VOTES_SPAM = parseInt(process.env.MIN_VOTES_SPAM || process.env.MIN_VOTES || '3', 10);
const MIN_VOTES_TELEMARKETER = parseInt(process.env.MIN_VOTES_TELEMARKETER || process.env.MIN_VOTES || '3', 10);
const MIN_VOTES_HARASSMENT = parseInt(process.env.MIN_VOTES_HARASSMENT || process.env.MIN_VOTES || '3', 10);

export const reportService = {
  createReport: (number: string, type: BlockType, deviceId: string, description?: string | null): { report: Report; isNew: boolean } => {
    const existing = store.getReportByNumberAndType(number, type);
    if (existing) {
      store.upsertVote(existing.id, deviceId, 1);
      if (description != null && description.trim() !== '') {
        store.updateReportDescription(existing.id, description.trim());
      }
      reportService.checkThresholdAndPromote(existing.id);
      return { report: { ...existing, description: description?.trim() || existing.description }, isNew: false };
    }
    const report = store.createReport(number, type, deviceId, description);
    store.upsertVote(report.id, deviceId, 1);
    reportService.checkThresholdAndPromote(report.id);
    return { report, isNew: true };
  },

  vote: (reportId: string, deviceId: string, voteValue: number) => {
    store.upsertVote(reportId, deviceId, voteValue);
    reportService.checkThresholdAndPromote(reportId);
  },

  getMinVotesForType: (type: string): number => {
    switch (type) {
      case 'spam': return MIN_VOTES_SPAM;
      case 'telemarketer': return MIN_VOTES_TELEMARKETER;
      case 'harassment': return MIN_VOTES_HARASSMENT;
      default: return MIN_VOTES;
    }
  },

  deleteReport: (reportId: string, deviceId: string): void => {
    const report = store.getReport(reportId);
    if (!report) return;
    if (report.device_id !== deviceId) {
      throw new Error('Only the report owner can remove it');
    }
    const { number, type } = report;
    store.deleteReport(reportId);
    store.removeBlocklistEntry(number, type);
    const remaining = store.getReportsByNumberAndType(number, type);
    remaining.forEach((r) => reportService.checkThresholdAndPromote(r.id));
  },

  checkThresholdAndPromote: (reportId: string) => {
    const report = store.getReport(reportId);
    if (!report) return;

    const stats = store.getVoteStats(reportId);
    const totalVotes = stats.positive + stats.negative;
    const minVotes = reportService.getMinVotesForType(report.type);

    if (totalVotes >= minVotes) {
      const ratio = stats.positive / totalVotes;
      if (ratio >= VOTE_RATIO_THRESHOLD) {
        // Promote to blocklist with tier based on type
        const tier: BlockTier =
          report.type === 'spam' ? 'surely_spam' :
          report.type === 'scam' ? 'surely_scam' :
          report.type === 'telemarketer' ? 'surely_telemarketer' :
          report.type === 'harassment' ? 'surely_harassment' : 'default';
        store.upsertBlocklistEntry({
          number: report.number,
          type: report.type,
          tier,
          weight: stats.positive,
          addedAt: Date.now(),
          sourceId: 'local'
        });
      } else if (ratio < VOTE_RATIO_DEMOTE_THRESHOLD) {
        // Demote: remove from blocklist when enough thumbs down
        store.removeBlocklistEntry(report.number, report.type);
      }
    }
  }
};
