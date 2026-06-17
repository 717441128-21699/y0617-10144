import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const severity = req.query.severity as string | undefined
  const status = req.query.status as string | undefined

  let sql = 'SELECT * FROM breach_events WHERE 1=1'
  const params: any[] = []

  if (severity) {
    sql += ' AND severity = ?'
    params.push(severity)
  }
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  sql += ' ORDER BY discovered_at DESC'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.post('/', (req: Request, res: Response) => {
  const { title, description, severity, discovered_at, contained_at, affected_count, status } = req.body as {
    title: string; description?: string; severity: string; discovered_at: string; contained_at?: string; affected_count?: number; status?: string
  }
  if (!title || !severity || !discovered_at) {
    res.status(400).json({ success: false, error: '标题、严重程度和发现时间为必填' })
    return
  }
  const result = db.prepare(
    `INSERT INTO breach_events (title, description, severity, discovered_at, contained_at, affected_count, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(title, description ?? null, severity, discovered_at, contained_at ?? null, affected_count ?? 0, status ?? 'investigating')
  const row = db.prepare('SELECT * FROM breach_events WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: row })
})

router.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM breach_events WHERE id = ?').get(id) as any
  if (!existing) {
    res.status(404).json({ success: false, error: '违规事件不存在' })
    return
  }
  const { title, description, severity, discovered_at, contained_at, affected_count, status } = req.body as {
    title?: string; description?: string; severity?: string; discovered_at?: string; contained_at?: string; affected_count?: number; status?: string
  }
  db.prepare(
    `UPDATE breach_events SET title = COALESCE(?, title), description = COALESCE(?, description), severity = COALESCE(?, severity), discovered_at = COALESCE(?, discovered_at), contained_at = COALESCE(?, contained_at), affected_count = COALESCE(?, affected_count), status = COALESCE(?, status) WHERE id = ?`
  ).run(title ?? null, description ?? null, severity ?? null, discovered_at ?? null, contained_at ?? null, affected_count ?? null, status ?? null, id)
  const row = db.prepare('SELECT * FROM breach_events WHERE id = ?').get(id)
  res.json({ success: true, data: row })
})

router.post('/:id/notify', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM breach_events WHERE id = ?').get(id) as any
  if (!existing) {
    res.status(404).json({ success: false, error: '违规事件不存在' })
    return
  }
  const { notify_type, recipient, content } = req.body as {
    notify_type: string; recipient: string; content?: string
  }
  if (!notify_type || !recipient) {
    res.status(400).json({ success: false, error: '通知类型和接收人为必填' })
    return
  }
  const now = new Date().toISOString()
  const result = db.prepare(
    `INSERT INTO breach_notifications (breach_event_id, notify_type, recipient, notified_at, content) VALUES (?, ?, ?, ?, ?)`
  ).run(id, notify_type, recipient, now, content ?? null)
  const row = db.prepare('SELECT * FROM breach_notifications WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: row })
})

router.get('/:id/notifications', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM breach_events WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ success: false, error: '违规事件不存在' })
    return
  }
  const rows = db.prepare('SELECT * FROM breach_notifications WHERE breach_event_id = ?').all(id)
  res.json({ success: true, data: rows })
})

router.get('/:id/report', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const event = db.prepare('SELECT * FROM breach_events WHERE id = ?').get(id) as any
  if (!event) {
    res.status(404).json({ success: false, error: '违规事件不存在' })
    return
  }
  const notifications = db.prepare('SELECT * FROM breach_notifications WHERE breach_event_id = ?').all(id) as any[]

  const report = `========================================
  数据安全违规事件监管报告
========================================

一、事件基本信息
----------------------------------------
事件标题：${event.title}
严重等级：${event.severity}
当前状态：${event.status}

二、事件详情
----------------------------------------
${event.description ?? '无'}

三、时间线
----------------------------------------
发现时间：${event.discovered_at}
${event.contained_at ? `控制时间：${event.contained_at}` : '尚未控制'}

四、影响范围
----------------------------------------
受影响人数：${event.affected_count}

五、通知记录
----------------------------------------
${notifications.length > 0 ? notifications.map((n, i) => `${i + 1}. [${n.notify_type}] 通知对象：${n.recipient}\n   通知时间：${n.notified_at}\n   内容：${n.content ?? '无'}`).join('\n') : '暂无通知记录'}

六、后续措施
----------------------------------------
[请补充后续整改措施和防范计划]

========================================
报告生成时间：${new Date().toISOString()}
========================================`

  res.json({ success: true, data: { report } })
})

export default router
