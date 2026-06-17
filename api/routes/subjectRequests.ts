import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const status = req.query.status as string | undefined
  const type = req.query.type as string | undefined

  const now = new Date().toISOString()
  db.prepare(
    `UPDATE subject_requests SET status = 'overdue' WHERE status IN ('pending', 'assigned', 'processing') AND deadline < ?`
  ).run(now)

  let rows: any[]
  let sql = 'SELECT * FROM subject_requests WHERE 1=1'
  const params: any[] = []

  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (type) {
    sql += ' AND request_type = ?'
    params.push(type)
  }
  sql += ' ORDER BY created_at DESC'

  rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.post('/', (req: Request, res: Response) => {
  const { request_type, subject_name, subject_email, description, assigned_team } = req.body as {
    request_type: string; subject_name: string; subject_email: string; description?: string; assigned_team?: string
  }
  if (!request_type || !subject_name || !subject_email) {
    res.status(400).json({ success: false, error: '请求类型、主体名称和邮箱为必填' })
    return
  }
  const now = new Date()
  const createdAt = now.toISOString()
  const deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const initialStatus = assigned_team ? 'assigned' : 'pending'

  const result = db.prepare(
    `INSERT INTO subject_requests (request_type, subject_name, subject_email, description, status, assigned_team, deadline, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`
  ).run(request_type, subject_name, subject_email, description ?? null, initialStatus, assigned_team ?? null, deadline, createdAt)

  db.prepare(
    `INSERT INTO request_timeline (subject_request_id, action, performed_by, performed_at) VALUES (?, ?, ?, ?)`
  ).run(Number(result.lastInsertRowid), '创建请求', subject_name, createdAt)

  if (assigned_team) {
    db.prepare(
      `INSERT INTO request_timeline (subject_request_id, action, performed_by, performed_at) VALUES (?, ?, ?, ?)`
    ).run(Number(result.lastInsertRowid), `分配至${assigned_team}`, '系统', createdAt)
  }

  const row = db.prepare('SELECT * FROM subject_requests WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: row })
})

router.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM subject_requests WHERE id = ?').get(id) as any
  if (!existing) {
    res.status(404).json({ success: false, error: '请求不存在' })
    return
  }
  const { status, assigned_team, description, completed_at } = req.body as {
    status?: string; assigned_team?: string; description?: string; completed_at?: string
  }
  const newStatus = status ?? existing.status
  const completedAt = newStatus === 'completed' ? (completed_at ?? new Date().toISOString()) : (completed_at ?? existing.completed_at)

  db.prepare(
    `UPDATE subject_requests SET status = COALESCE(?, status), assigned_team = COALESCE(?, assigned_team), description = COALESCE(?, description), completed_at = ? WHERE id = ?`
  ).run(status ?? null, assigned_team ?? null, description ?? null, completedAt, id)

  const row = db.prepare('SELECT * FROM subject_requests WHERE id = ?').get(id)
  res.json({ success: true, data: row })
})

router.post('/:id/assign', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM subject_requests WHERE id = ?').get(id) as any
  if (!existing) {
    res.status(404).json({ success: false, error: '请求不存在' })
    return
  }
  const { team } = req.body as { team: string }
  if (!team) {
    res.status(400).json({ success: false, error: '团队名称为必填' })
    return
  }
  const now = new Date().toISOString()
  db.prepare('UPDATE subject_requests SET assigned_team = ?, status = CASE WHEN status = ? THEN ? ELSE status END WHERE id = ?')
    .run(team, 'pending', 'assigned', id)

  db.prepare(
    `INSERT INTO request_timeline (subject_request_id, action, performed_by, performed_at) VALUES (?, ?, ?, ?)`
  ).run(id, `分配至${team}`, '系统管理员', now)

  const row = db.prepare('SELECT * FROM subject_requests WHERE id = ?').get(id)
  res.json({ success: true, data: row })
})

router.get('/:id/timeline', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM subject_requests WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ success: false, error: '请求不存在' })
    return
  }
  const rows = db.prepare(
    `SELECT * FROM request_timeline WHERE subject_request_id = ? ORDER BY performed_at ASC`
  ).all(id)
  res.json({ success: true, data: rows })
})

export default router
