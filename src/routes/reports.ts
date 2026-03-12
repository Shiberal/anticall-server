import { Router, Response } from 'express';
import { store } from '../db/store';
import { reportService } from '../services/reportService';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const VOTE_RATIO_THRESHOLD = parseFloat(process.env.VOTE_RATIO_THRESHOLD || '0.8');
const VOTE_RATIO_DEMOTE_THRESHOLD = parseFloat(process.env.VOTE_RATIO_DEMOTE_THRESHOLD || '0.5');

router.post('/', (req: AuthRequest, res: Response) => {
  const { number, type, description } = req.body;
  if (!number || !type) {
    return res.status(400).json({ error: 'Number and type are required' });
  }

  const { report, isNew } = reportService.createReport(number, type, req.deviceId!, description);
  res.status(isNew ? 201 : 200).json(report);
});

router.patch('/:id', (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { description } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing report id' });
  }
  const report = store.getReport(id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  store.updateReportDescription(id, description ?? null);
  const updated = store.getReport(id);
  res.json(updated);
});

function getScoreStatus(ratio: number | null, totalVotes: number, type: string): 'promoted' | 'removed' | 'pending' {
  const minVotes = reportService.getMinVotesForType(type);
  if (totalVotes < minVotes || ratio === null) return 'pending';
  if (ratio >= VOTE_RATIO_THRESHOLD) return 'promoted';
  if (ratio < VOTE_RATIO_DEMOTE_THRESHOLD) return 'removed';
  return 'pending';
}

function enrichReportsWithVotes(reports: { id: string; type: string; device_id?: string }[], deviceId?: string) {
  return reports.map((r) => {
    const stats = store.getVoteStats(r.id);
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

router.get('/', (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const q = (req.query.q as string) || '';
  const reports = q
    ? store.searchReports(q, Math.min(limit, 200))
    : store.getPendingReports(limit, offset);
  res.json(enrichReportsWithVotes(reports, req.deviceId));
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) {
    return res.status(400).json({ error: 'Missing report id' });
  }
  const report = store.getReport(id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  if (report.device_id !== req.deviceId) {
    return res.status(403).json({ error: 'Only the report owner can remove it' });
  }
  try {
    reportService.deleteReport(id, req.deviceId!);
    res.json({ success: true });
  } catch (err) {
    res.status(403).json({ error: (err as Error).message });
  }
});

router.post('/:id/vote', (req: AuthRequest, res: Response) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { vote } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Missing report id' });
  }
  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ error: 'Vote must be 1 or -1' });
  }

  reportService.vote(id, req.deviceId!, vote);
  res.json({ success: true });
});

export default router;
