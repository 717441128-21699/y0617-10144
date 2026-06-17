import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/ropa', (req: Request, res: Response) => {
  const assets = db.prepare('SELECT * FROM data_assets').all()
  const ropa = assets.map((asset: any) => ({
    id: asset.id,
    system_name: asset.system_name,
    data_type: asset.data_type,
    processing_purpose: asset.processing_purpose,
    subject_type: asset.subject_type,
    retention_period: asset.retention_period,
    legal_basis: asset.legal_basis,
  }))
  res.json({ success: true, data: ropa })
})

router.get('/ropa/export', (req: Request, res: Response) => {
  const format = req.query.format as string | undefined
  if (format !== 'csv') {
    res.status(400).json({ success: false, error: '仅支持CSV格式导出' })
    return
  }
  const assets = db.prepare('SELECT * FROM data_assets').all() as any[]
  const headers = ['ID', '系统名称', '数据类型', '处理目的', '数据主体类型', '保留期限', '合法依据']
  const csvRows = [headers.join(',')]
  for (const a of assets) {
    const row = [
      a.id,
      `"${a.system_name}"`,
      `"${a.data_type}"`,
      `"${a.processing_purpose}"`,
      `"${a.subject_type}"`,
      `"${a.retention_period}"`,
      `"${a.legal_basis}"`,
    ]
    csvRows.push(row.join(','))
  }
  const csv = '\uFEFF' + csvRows.join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename=ropa_export.csv')
  res.send(csv)
})

router.get('/dashboard', (req: Request, res: Response) => {
  const totalAssets = (db.prepare('SELECT COUNT(*) as count FROM data_assets').get() as any).count

  const now = new Date().toISOString()
  db.prepare(
    `UPDATE subject_requests SET status = 'overdue' WHERE status IN ('pending', 'assigned', 'processing') AND deadline < ?`
  ).run(now)

  const pendingRequests = (db.prepare(
    `SELECT COUNT(*) as count FROM subject_requests WHERE status IN ('pending', 'assigned', 'processing')`
  ).get() as any).count

  const openBreaches = (db.prepare(
    `SELECT COUNT(*) as count FROM breach_events WHERE status IN ('investigating', 'contained')`
  ).get() as any).count

  const totalConsents = (db.prepare('SELECT COUNT(*) as count FROM consent_records').get() as any).count
  const grantedConsents = (db.prepare('SELECT COUNT(*) as count FROM consent_records WHERE is_granted = 1').get() as any).count
  const withdrawnConsents = (db.prepare('SELECT COUNT(*) as count FROM consent_records WHERE is_granted = 0').get() as any).count
  const pendingWithdrawals = (db.prepare(
    `SELECT COUNT(*) as count FROM withdrawal_tasks WHERE status IN ('pending', 'processing')`
  ).get() as any).count

  const overdueRequests = (db.prepare(
    `SELECT COUNT(*) as count FROM subject_requests WHERE status = 'overdue'`
  ).get() as any).count

  const resolvedBreaches = (db.prepare(
    `SELECT COUNT(*) as count FROM breach_events WHERE status = 'resolved'`
  ).get() as any).count

  res.json({
    success: true,
    data: {
      totalAssets,
      pendingRequests,
      openBreaches,
      consentStats: {
        total: totalConsents,
        granted: grantedConsents,
        withdrawn: withdrawnConsents,
        pendingWithdrawals,
      },
      overdueRequests,
      resolvedBreaches,
    },
  })
})

export default router
