import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/versions', (req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM consent_versions ORDER BY effective_date DESC').all()
  res.json({ success: true, data: rows })
})

router.post('/versions', (req: Request, res: Response) => {
  const { version, content, effective_date } = req.body as {
    version: string; content: string; effective_date: string
  }
  if (!version || !content || !effective_date) {
    res.status(400).json({ success: false, error: '版本号、内容和生效日期为必填' })
    return
  }
  db.prepare('UPDATE consent_versions SET is_current = 0').run()
  const result = db.prepare(
    `INSERT INTO consent_versions (version, content, effective_date, is_current) VALUES (?, ?, ?, 1)`
  ).run(version, content, effective_date)
  const row = db.prepare('SELECT * FROM consent_versions WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: row })
})

router.get('/records', (req: Request, res: Response) => {
  const search = req.query.search as string | undefined
  const status = req.query.status as string | undefined
  const versionId = req.query.version_id as string | undefined
  const email = req.query.email as string | undefined

  let sql = `SELECT cr.*, cv.version as consent_version FROM consent_records cr LEFT JOIN consent_versions cv ON cr.consent_version_id = cv.id WHERE 1=1`
  const params: any[] = []

  if (search) {
    sql += ' AND (cr.subject_name LIKE ? OR cr.subject_email LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }
  if (status === 'granted') {
    sql += ' AND cr.withdrawn_at IS NULL'
  } else if (status === 'withdrawn') {
    sql += ' AND cr.withdrawn_at IS NOT NULL'
  }
  if (versionId) {
    sql += ' AND cr.consent_version_id = ?'
    params.push(versionId)
  }
  if (email) {
    sql += ' AND cr.subject_email LIKE ?'
    params.push(`%${email}%`)
  }
  sql += ' ORDER BY cr.granted_at DESC'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.post('/records', (req: Request, res: Response) => {
  const { consent_version_id, subject_name, subject_email } = req.body as {
    consent_version_id: number; subject_name: string; subject_email: string
  }
  if (!consent_version_id || !subject_name || !subject_email) {
    res.status(400).json({ success: false, error: '同意版本ID、主体名称和邮箱为必填' })
    return
  }
  const now = new Date().toISOString()
  const result = db.prepare(
    `INSERT INTO consent_records (consent_version_id, subject_name, subject_email, is_granted, granted_at, withdrawn_at) VALUES (?, ?, ?, 1, ?, NULL)`
  ).run(consent_version_id, subject_name, subject_email, now)
  const row = db.prepare('SELECT * FROM consent_records WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: row })
})

router.post('/records/:id/withdraw', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const record = db.prepare('SELECT * FROM consent_records WHERE id = ?').get(id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '同意记录不存在' })
    return
  }
  if (!record.is_granted || record.withdrawn_at) {
    res.status(400).json({ success: false, error: '该同意已撤回' })
    return
  }
  const now = new Date().toISOString()
  db.prepare('UPDATE consent_records SET is_granted = 0, withdrawn_at = ? WHERE id = ?').run(now, id)

  const existingTasks = db.prepare('SELECT COUNT(*) as count FROM withdrawal_tasks WHERE consent_record_id = ?').get(id) as any
  if (existingTasks.count === 0) {
    const assets = db.prepare('SELECT id FROM data_assets').all() as any[]
    const insertTask = db.prepare(
      `INSERT INTO withdrawal_tasks (consent_record_id, data_asset_id, status, remark, completed_at) VALUES (?, ?, 'pending', NULL, NULL)`
    )
    const insertMany = db.transaction((items: any[]) => {
      for (const item of items) insertTask.run(id, item.id)
    })
    insertMany(assets)
  }

  const row = db.prepare('SELECT * FROM consent_records WHERE id = ?').get(id)
  res.json({ success: true, data: row })
})

router.get('/records/:id/tasks', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const rows = db.prepare(
    `SELECT wt.*, da.system_name, da.data_type FROM withdrawal_tasks wt LEFT JOIN data_assets da ON wt.data_asset_id = da.id WHERE wt.consent_record_id = ? ORDER BY wt.id ASC`
  ).all(id)
  res.json({ success: true, data: rows })
})

router.get('/withdrawal-tasks', (req: Request, res: Response) => {
  const rows = db.prepare(
    `SELECT wt.*, da.system_name, da.data_type, cr.subject_name, cr.subject_email FROM withdrawal_tasks wt LEFT JOIN data_assets da ON wt.data_asset_id = da.id LEFT JOIN consent_records cr ON wt.consent_record_id = cr.id`
  ).all()
  res.json({ success: true, data: rows })
})

router.put('/withdrawal-tasks/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM withdrawal_tasks WHERE id = ?').get(id) as any
  if (!existing) {
    res.status(404).json({ success: false, error: '撤回任务不存在' })
    return
  }
  const { status, remark } = req.body as { status?: string; remark?: string }
  if (status && !['pending', 'processing', 'completed'].includes(status)) {
    res.status(400).json({ success: false, error: '状态必须为 pending/processing/completed' })
    return
  }
  const finalStatus = status ?? existing.status
  const completedAt = finalStatus === 'completed' ? new Date().toISOString() : (status === 'completed' ? new Date().toISOString() : existing.completed_at)
  const finalCompletedAt = finalStatus === 'completed' ? completedAt : existing.completed_at

  if (status !== undefined && remark !== undefined) {
    db.prepare('UPDATE withdrawal_tasks SET status = ?, remark = ?, completed_at = ? WHERE id = ?').run(finalStatus, remark, finalCompletedAt, id)
  } else if (status !== undefined) {
    db.prepare('UPDATE withdrawal_tasks SET status = ?, completed_at = ? WHERE id = ?').run(finalStatus, finalCompletedAt, id)
  } else if (remark !== undefined) {
    db.prepare('UPDATE withdrawal_tasks SET remark = ? WHERE id = ?').run(remark, id)
  }

  const row = db.prepare('SELECT * FROM withdrawal_tasks WHERE id = ?').get(id)
  res.json({ success: true, data: row })
})

export default router
