import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const search = req.query.search as string | undefined
  let rows: any[]
  if (search) {
    rows = db.prepare(
      `SELECT * FROM data_assets WHERE system_name LIKE ? OR data_type LIKE ? OR processing_purpose LIKE ? OR subject_type LIKE ? OR legal_basis LIKE ?`
    ).all(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  } else {
    rows = db.prepare('SELECT * FROM data_assets').all()
  }
  res.json({ success: true, data: rows })
})

router.post('/', (req: Request, res: Response) => {
  const { system_name, data_type, processing_purpose, subject_type, retention_period, legal_basis } = req.body as {
    system_name: string; data_type: string; processing_purpose: string; subject_type: string; retention_period: string; legal_basis: string
  }
  if (!system_name || !data_type || !processing_purpose || !subject_type || !retention_period || !legal_basis) {
    res.status(400).json({ success: false, error: '所有字段均为必填' })
    return
  }
  const result = db.prepare(
    `INSERT INTO data_assets (system_name, data_type, processing_purpose, subject_type, retention_period, legal_basis) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(system_name, data_type, processing_purpose, subject_type, retention_period, legal_basis)
  const row = db.prepare('SELECT * FROM data_assets WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: row })
})

router.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM data_assets WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ success: false, error: '数据资产不存在' })
    return
  }
  const { system_name, data_type, processing_purpose, subject_type, retention_period, legal_basis } = req.body as {
    system_name?: string; data_type?: string; processing_purpose?: string; subject_type?: string; retention_period?: string; legal_basis?: string
  }
  db.prepare(
    `UPDATE data_assets SET system_name = COALESCE(?, system_name), data_type = COALESCE(?, data_type), processing_purpose = COALESCE(?, processing_purpose), subject_type = COALESCE(?, subject_type), retention_period = COALESCE(?, retention_period), legal_basis = COALESCE(?, legal_basis) WHERE id = ?`
  ).run(system_name ?? null, data_type ?? null, processing_purpose ?? null, subject_type ?? null, retention_period ?? null, legal_basis ?? null, id)
  const row = db.prepare('SELECT * FROM data_assets WHERE id = ?').get(id)
  res.json({ success: true, data: row })
})

router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM data_assets WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ success: false, error: '数据资产不存在' })
    return
  }
  db.prepare('DELETE FROM data_assets WHERE id = ?').run(id)
  res.json({ success: true, data: { id } })
})

export default router
