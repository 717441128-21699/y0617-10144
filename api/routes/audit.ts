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

router.get('/summary', (req: Request, res: Response) => {
  const now = new Date()
  const dateStr = now.toLocaleDateString('zh-CN')
  const timeStr = now.toLocaleTimeString('zh-CN')

  const totalAssets = (db.prepare('SELECT COUNT(*) as count FROM data_assets').get() as any).count
  const totalConsents = (db.prepare('SELECT COUNT(*) as count FROM consent_records').get() as any).count
  const grantedConsents = (db.prepare('SELECT COUNT(*) as count FROM consent_records WHERE withdrawn_at IS NULL').get() as any).count
  const withdrawnConsents = (db.prepare('SELECT COUNT(*) as count FROM consent_records WHERE withdrawn_at IS NOT NULL').get() as any).count

  const totalRequests = (db.prepare('SELECT COUNT(*) as count FROM subject_requests').get() as any).count
  const completedRequests = (db.prepare('SELECT COUNT(*) as count FROM subject_requests WHERE status = ?').get('completed') as any).count
  const pendingRequests = (db.prepare('SELECT COUNT(*) as count FROM subject_requests WHERE status IN (?, ?, ?, ?)').get('pending', 'assigned', 'processing', 'overdue') as any).count

  const completedRows = db.prepare(
    `SELECT sr.*, (
       SELECT GROUP_CONCAT(action || ' | ' || performed_by || ' | ' || performed_at, '\n  ')
       FROM request_timeline rt WHERE rt.subject_request_id = sr.id ORDER BY rt.performed_at ASC
     ) as timeline_text
     FROM subject_requests sr WHERE sr.status = 'completed' ORDER BY sr.completed_at DESC`
  ).all() as any[]

  const withdrawalSummary = db.prepare(
    `SELECT cr.id as record_id, cr.subject_name, cr.subject_email, cr.withdrawn_at,
      COUNT(wt.id) as total_tasks,
      SUM(CASE WHEN wt.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN wt.status IN ('pending', 'processing') THEN 1 ELSE 0 END) as pending_tasks
    FROM consent_records cr
    LEFT JOIN withdrawal_tasks wt ON wt.consent_record_id = cr.id
    WHERE cr.withdrawn_at IS NOT NULL
    GROUP BY cr.id
    ORDER BY cr.withdrawn_at DESC`
  ).all() as any[]

  const requestTypeMap: Record<string, string> = { access: '访问请求', deletion: '删除请求', export: '导出请求' }
  const statusMap: Record<string, string> = {
    pending: '待处理', assigned: '已分配', processing: '处理中',
    completed: '已完成', overdue: '已逾期',
  }

  let summary = ''
  summary += '='.repeat(60) + '\n'
  summary += '          PrivacyGuard 隐私合规审计摘要\n'
  summary += `          生成时间：${dateStr} ${timeStr}\n`
  summary += '='.repeat(60) + '\n\n'

  summary += '【一、整体合规概览】\n'
  summary += '  · 数据资产总数：' + totalAssets + ' 个系统\n'
  summary += '  · 同意记录总数：' + totalConsents + ' 条\n'
  summary += '  ·   - 有效同意：' + grantedConsents + ' 条\n'
  summary += '  ·   - 已撤回同意：' + withdrawnConsents + ' 条\n'
  summary += '  · 数据主体请求总数：' + totalRequests + ' 条\n'
  summary += '  ·   - 已完成：' + completedRequests + ' 条\n'
  summary += '  ·   - 处理中：' + pendingRequests + ' 条\n\n'

  summary += '【二、已完成数据主体请求明细】\n'
  if (completedRows.length === 0) {
    summary += '  暂无已完成请求记录\n'
  }
  completedRows.forEach((r: any, idx: number) => {
    summary += `\n  (${idx + 1}) ${requestTypeMap[r.request_type] || r.request_type} - ${r.subject_name}\n`
    summary += `      邮箱：${r.subject_email}\n`
    summary += `      创建时间：${new Date(r.created_at).toLocaleString('zh-CN')}\n`
    summary += `      完成时间：${r.completed_at ? new Date(r.completed_at).toLocaleString('zh-CN') : '-'}\n`
    if (r.assigned_team) summary += `      处理团队：${r.assigned_team}\n`
    summary += '      处理时间线：\n'
    if (r.timeline_text) {
      const timelineItems = (r.timeline_text as string).split('\n  ')
      timelineItems.forEach((line: string, i: number) => {
        const [action, performer, time] = line.split(' | ')
        if (action && performer && time) {
          summary += `        ${i + 1}. [${new Date(time).toLocaleString('zh-CN')}] ${action} (${performer})\n`
        }
      })
    }
    if (r.description) summary += `      请求说明：${r.description}\n`
  })

  summary += '\n\n【三、同意撤回及系统停用情况】\n'
  if (withdrawalSummary.length === 0) {
    summary += '  暂无已撤回同意记录\n'
  }
  withdrawalSummary.forEach((w: any, idx: number) => {
    const allDone = w.completed_tasks > 0 && w.completed_tasks === w.total_tasks
    summary += `\n  (${idx + 1}) ${w.subject_name} <${w.subject_email}>\n`
    summary += `      撤回时间：${new Date(w.withdrawn_at).toLocaleString('zh-CN')}\n`
    summary += `      系统停用进度：${w.completed_tasks || 0}/${w.total_tasks || 0} 个系统已停止处理${allDone ? ' ✅ 全部完成' : ''}\n`

    const tasks = db.prepare(
      `SELECT wt.*, da.system_name FROM withdrawal_tasks wt LEFT JOIN data_assets da ON wt.data_asset_id = da.id WHERE wt.consent_record_id = ? ORDER BY wt.id`
    ).all(w.record_id) as any[]
    const taskStatusMap: Record<string, string> = { pending: '待处理', processing: '处理中', completed: '已完成' }
    tasks.forEach((t: any, ti: number) => {
      const tStatus = taskStatusMap[t.status] || t.status
      const tDone = t.completed_at ? new Date(t.completed_at).toLocaleString('zh-CN') : '-'
      summary += `        ${ti + 1}. [${tStatus}] ${t.system_name}${t.remark ? ' - ' + t.remark : ''}  完成时间：${tDone}\n`
    })
  })

  summary += '\n' + '='.repeat(60) + '\n'
  summary += '本摘要由 PrivacyGuard 自动生成，可复制用于合规审计报告。\n'
  summary += '='.repeat(60) + '\n'

  res.json({ success: true, data: { text: summary, generated_at: now.toISOString() } })
})

export default router
