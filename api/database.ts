import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new Database(path.join(__dirname, 'privacyguard.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS data_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    processing_purpose TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    retention_period TEXT NOT NULL,
    legal_basis TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS consent_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,
    content TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS consent_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consent_version_id INTEGER NOT NULL,
    subject_name TEXT NOT NULL,
    subject_email TEXT NOT NULL,
    is_granted INTEGER NOT NULL DEFAULT 1,
    granted_at TEXT NOT NULL,
    withdrawn_at TEXT,
    FOREIGN KEY (consent_version_id) REFERENCES consent_versions(id)
  );

  CREATE TABLE IF NOT EXISTS withdrawal_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consent_record_id INTEGER NOT NULL,
    data_asset_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    completed_at TEXT,
    FOREIGN KEY (consent_record_id) REFERENCES consent_records(id),
    FOREIGN KEY (data_asset_id) REFERENCES data_assets(id)
  );

  CREATE TABLE IF NOT EXISTS subject_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_type TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    subject_email TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_team TEXT,
    deadline TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS request_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_request_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    performed_at TEXT NOT NULL,
    FOREIGN KEY (subject_request_id) REFERENCES subject_requests(id)
  );

  CREATE TABLE IF NOT EXISTS breach_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL,
    discovered_at TEXT NOT NULL,
    contained_at TEXT,
    affected_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'investigating'
  );

  CREATE TABLE IF NOT EXISTS breach_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    breach_event_id INTEGER NOT NULL,
    notify_type TEXT NOT NULL,
    recipient TEXT NOT NULL,
    notified_at TEXT NOT NULL,
    content TEXT,
    FOREIGN KEY (breach_event_id) REFERENCES breach_events(id)
  );
`)

const assetCount = (db.prepare('SELECT COUNT(*) as count FROM data_assets').get() as { count: number }).count

if (assetCount === 0) {
  const insertAsset = db.prepare(`
    INSERT INTO data_assets (system_name, data_type, processing_purpose, subject_type, retention_period, legal_basis)
    VALUES (@system_name, @data_type, @processing_purpose, @subject_type, @retention_period, @legal_basis)
  `)

  const assets = [
    { system_name: '客户关系管理系统', data_type: '个人身份信息', processing_purpose: '客户服务与营销', subject_type: '用户', retention_period: '3年', legal_basis: '同意' },
    { system_name: '人力资源管理系统', data_type: '员工个人信息', processing_purpose: '人事管理', subject_type: '员工', retention_period: '劳动合同终止后5年', legal_basis: '合同履行' },
    { system_name: '支付处理平台', data_type: '金融数据', processing_purpose: '交易处理与结算', subject_type: '用户', retention_period: '5年', legal_basis: '法律义务' },
    { system_name: '邮件营销系统', data_type: '联系信息与行为数据', processing_purpose: '营销推广', subject_type: '用户', retention_period: '撤回同意后30天', legal_basis: '同意' },
    { system_name: '供应商管理系统', data_type: '企业联系信息', processing_purpose: '供应商管理', subject_type: '合作方', retention_period: '合作期间及结束后2年', legal_basis: '合法利益' },
    { system_name: '视频监控系统', data_type: '生物特征数据', processing_purpose: '办公场所安全', subject_type: '员工', retention_period: '30天', legal_basis: '合法利益' },
    { system_name: '数据分析平台', data_type: '行为数据与偏好', processing_purpose: '产品优化与用户画像', subject_type: '用户', retention_period: '2年', legal_basis: '同意' },
    { system_name: '招聘管理系统', data_type: '简历与面试记录', processing_purpose: '招聘流程管理', subject_type: '合作方', retention_period: '1年', legal_basis: '合同履行' },
  ]

  const insertMany = db.transaction((items: any[]) => {
    for (const item of items) insertAsset.run(item)
  })
  insertMany(assets)

  const insertVersion = db.prepare(`
    INSERT INTO consent_versions (version, content, effective_date, is_current)
    VALUES (@version, @content, @effective_date, @is_current)
  `)

  const versions = [
    { version: '1.0', content: '本隐私政策说明了我们如何收集、使用和保护您的个人信息。我们将严格遵守《个人信息保护法》的相关规定，确保您的隐私权益得到充分保障。', effective_date: '2024-01-01', is_current: 0 },
    { version: '2.0', content: '更新后的隐私政策增加了关于跨境数据传输的条款，明确了数据主体权利的行使方式，并细化了数据处理的合法依据说明。', effective_date: '2024-07-01', is_current: 0 },
    { version: '3.0', content: '最新隐私政策完善了自动化决策相关条款，增加了数据可携权的说明，并更新了Cookie使用政策以符合最新法规要求。', effective_date: '2025-01-15', is_current: 1 },
  ]

  for (const v of versions) insertVersion.run(v)

  const insertRecord = db.prepare(`
    INSERT INTO consent_records (consent_version_id, subject_name, subject_email, is_granted, granted_at, withdrawn_at)
    VALUES (@consent_version_id, @subject_name, @subject_email, @is_granted, @granted_at, @withdrawn_at)
  `)

  const records = [
    { consent_version_id: 3, subject_name: '张三', subject_email: 'zhangsan@example.com', is_granted: 1, granted_at: '2025-01-20T10:00:00Z', withdrawn_at: null },
    { consent_version_id: 3, subject_name: '李四', subject_email: 'lisi@example.com', is_granted: 1, granted_at: '2025-02-01T14:30:00Z', withdrawn_at: null },
    { consent_version_id: 2, subject_name: '王五', subject_email: 'wangwu@example.com', is_granted: 1, granted_at: '2024-07-15T09:00:00Z', withdrawn_at: '2025-03-10T16:00:00Z' },
    { consent_version_id: 3, subject_name: '赵六', subject_email: 'zhaoliu@example.com', is_granted: 1, granted_at: '2025-01-25T11:20:00Z', withdrawn_at: null },
    { consent_version_id: 1, subject_name: '孙七', subject_email: 'sunqi@example.com', is_granted: 1, granted_at: '2024-02-10T08:00:00Z', withdrawn_at: '2024-12-01T10:00:00Z' },
    { consent_version_id: 3, subject_name: '周八', subject_email: 'zhouba@example.com', is_granted: 1, granted_at: '2025-03-01T13:45:00Z', withdrawn_at: null },
    { consent_version_id: 2, subject_name: '吴九', subject_email: 'wujiu@example.com', is_granted: 1, granted_at: '2024-08-20T15:30:00Z', withdrawn_at: '2025-01-15T09:00:00Z' },
    { consent_version_id: 3, subject_name: '郑十', subject_email: 'zhengshi@example.com', is_granted: 1, granted_at: '2025-02-14T10:00:00Z', withdrawn_at: null },
    { consent_version_id: 3, subject_name: '陈晓明', subject_email: 'chenxm@example.com', is_granted: 1, granted_at: '2025-03-05T16:20:00Z', withdrawn_at: null },
    { consent_version_id: 2, subject_name: '林小红', subject_email: 'linxh@example.com', is_granted: 1, granted_at: '2024-09-01T12:00:00Z', withdrawn_at: '2025-02-28T14:30:00Z' },
  ]

  for (const r of records) insertRecord.run(r)

  const insertWithdrawalTask = db.prepare(`
    INSERT INTO withdrawal_tasks (consent_record_id, data_asset_id, status, completed_at)
    VALUES (@consent_record_id, @data_asset_id, @status, @completed_at)
  `)

  const withdrawalTasks = [
    { consent_record_id: 3, data_asset_id: 1, status: 'completed', completed_at: '2025-03-15T10:00:00Z' },
    { consent_record_id: 3, data_asset_id: 4, status: 'completed', completed_at: '2025-03-15T11:30:00Z' },
    { consent_record_id: 5, data_asset_id: 1, status: 'completed', completed_at: '2024-12-05T09:00:00Z' },
    { consent_record_id: 5, data_asset_id: 4, status: 'processing', completed_at: null },
    { consent_record_id: 7, data_asset_id: 7, status: 'pending', completed_at: null },
  ]

  for (const t of withdrawalTasks) insertWithdrawalTask.run(t)

  const insertRequest = db.prepare(`
    INSERT INTO subject_requests (request_type, subject_name, subject_email, description, status, assigned_team, deadline, created_at, completed_at)
    VALUES (@request_type, @subject_name, @subject_email, @description, @status, @assigned_team, @deadline, @created_at, @completed_at)
  `)

  const requests = [
    { request_type: 'access', subject_name: '张三', subject_email: 'zhangsan@example.com', description: '请求查看我所有的个人数据处理记录', status: 'completed', assigned_team: '数据合规部', deadline: '2025-03-20T10:00:00Z', created_at: '2025-02-18T10:00:00Z', completed_at: '2025-03-10T14:00:00Z' },
    { request_type: 'deletion', subject_name: '王五', subject_email: 'wangwu@example.com', description: '要求删除我在邮件营销系统中的所有数据', status: 'processing', assigned_team: '技术运维部', deadline: '2025-04-10T16:00:00Z', created_at: '2025-03-11T16:00:00Z', completed_at: null },
    { request_type: 'export', subject_name: '赵六', subject_email: 'zhaoliu@example.com', description: '请求导出我的个人数据副本', status: 'assigned', assigned_team: '数据合规部', deadline: '2025-04-01T11:20:00Z', created_at: '2025-03-02T11:20:00Z', completed_at: null },
    { request_type: 'access', subject_name: '孙七', subject_email: 'sunqi@example.com', description: '要求获取我的数据处理详情', status: 'pending', assigned_team: null, deadline: '2025-04-10T09:00:00Z', created_at: '2025-03-11T09:00:00Z', completed_at: null },
    { request_type: 'deletion', subject_name: '周八', subject_email: 'zhouba@example.com', description: '要求删除所有相关个人数据', status: 'processing', assigned_team: '技术运维部', deadline: '2025-04-01T13:45:00Z', created_at: '2025-03-02T13:45:00Z', completed_at: null },
    { request_type: 'export', subject_name: '林小红', subject_email: 'linxh@example.com', description: '请求导出数据可携格式', status: 'completed', assigned_team: '数据合规部', deadline: '2025-04-01T14:30:00Z', created_at: '2025-03-02T14:30:00Z', completed_at: '2025-03-20T09:00:00Z' },
    { request_type: 'access', subject_name: '陈晓明', subject_email: 'chenxm@example.com', description: '查询个人数据是否被跨境传输', status: 'assigned', assigned_team: '法务部', deadline: '2025-04-05T16:20:00Z', created_at: '2025-03-06T16:20:00Z', completed_at: null },
    { request_type: 'deletion', subject_name: '李四', subject_email: 'lisi@example.com', description: '要求在所有系统中删除个人数据', status: 'pending', assigned_team: null, deadline: '2025-04-03T14:30:00Z', created_at: '2025-03-04T14:30:00Z', completed_at: null },
  ]

  for (const r of requests) insertRequest.run(r)

  const insertTimeline = db.prepare(`
    INSERT INTO request_timeline (subject_request_id, action, performed_by, performed_at)
    VALUES (@subject_request_id, @action, @performed_by, @performed_at)
  `)

  const timelines = [
    { subject_request_id: 1, action: '创建请求', performed_by: '张三', performed_at: '2025-02-18T10:00:00Z' },
    { subject_request_id: 1, action: '分配至数据合规部', performed_by: '系统管理员', performed_at: '2025-02-18T11:00:00Z' },
    { subject_request_id: 1, action: '开始处理', performed_by: '数据合规部-刘经理', performed_at: '2025-02-20T09:00:00Z' },
    { subject_request_id: 1, action: '完成处理，已发送数据副本', performed_by: '数据合规部-刘经理', performed_at: '2025-03-10T14:00:00Z' },
    { subject_request_id: 2, action: '创建请求', performed_by: '王五', performed_at: '2025-03-11T16:00:00Z' },
    { subject_request_id: 2, action: '分配至技术运维部', performed_by: '系统管理员', performed_at: '2025-03-12T09:00:00Z' },
    { subject_request_id: 2, action: '开始数据删除流程', performed_by: '技术运维部-张工程师', performed_at: '2025-03-13T10:00:00Z' },
    { subject_request_id: 3, action: '创建请求', performed_by: '赵六', performed_at: '2025-03-02T11:20:00Z' },
    { subject_request_id: 3, action: '分配至数据合规部', performed_by: '系统管理员', performed_at: '2025-03-03T09:00:00Z' },
    { subject_request_id: 6, action: '完成数据导出并发送', performed_by: '数据合规部-刘经理', performed_at: '2025-03-20T09:00:00Z' },
  ]

  for (const t of timelines) insertTimeline.run(t)

  const insertBreach = db.prepare(`
    INSERT INTO breach_events (title, description, severity, discovered_at, contained_at, affected_count, status)
    VALUES (@title, @description, @severity, @discovered_at, @contained_at, @affected_count, @status)
  `)

  const breaches = [
    { title: '客户数据库未授权访问事件', description: '2025年2月10日发现外部攻击者通过SQL注入获取了部分客户数据，包括姓名、邮箱和手机号码。', severity: 'high', discovered_at: '2025-02-10T08:30:00Z', contained_at: '2025-02-11T14:00:00Z', affected_count: 12500, status: 'resolved' },
    { title: '员工薪资数据泄露', description: '人力资源系统配置错误导致员工薪资信息可被内部未授权人员访问，涉及基本工资、绩效奖金等信息。', severity: 'medium', discovered_at: '2025-03-05T16:00:00Z', contained_at: '2025-03-05T18:30:00Z', affected_count: 350, status: 'contained' },
    { title: '营销邮件列表意外共享', description: '由于第三方合作伙伴操作失误，约5000名用户的邮箱地址被意外共享给了未经授权的营销机构。', severity: 'low', discovered_at: '2025-04-01T10:00:00Z', contained_at: null, affected_count: 5000, status: 'investigating' },
  ]

  for (const b of breaches) insertBreach.run(b)

  const insertNotification = db.prepare(`
    INSERT INTO breach_notifications (breach_event_id, notify_type, recipient, notified_at, content)
    VALUES (@breach_event_id, @notify_type, @recipient, @notified_at, @content)
  `)

  const notifications = [
    { breach_event_id: 1, notify_type: 'regulator', recipient: '国家网信办', notified_at: '2025-02-11T09:00:00Z', content: '根据《个人信息保护法》第57条，就客户数据库未授权访问事件向贵机构报告，事件详情及处置措施见附件。' },
    { breach_event_id: 1, notify_type: 'affected_persons', recipient: '受影响用户', notified_at: '2025-02-12T10:00:00Z', content: '尊敬的用户，我们发现您的个人信息可能遭到未授权访问，我们已采取措施控制事件并加强安全防护，建议您及时修改密码。' },
    { breach_event_id: 1, notify_type: 'internal', recipient: '公司管理层', notified_at: '2025-02-10T09:00:00Z', content: '紧急通知：客户数据库发生未授权访问事件，已启动应急响应流程，请相关领导关注。' },
    { breach_event_id: 2, notify_type: 'internal', recipient: '人力资源部', notified_at: '2025-03-05T16:30:00Z', content: '薪资数据访问权限配置错误已修复，请核查数据访问日志并评估影响范围。' },
    { breach_event_id: 2, notify_type: 'regulator', recipient: '国家网信办', notified_at: '2025-03-06T10:00:00Z', content: '就员工薪资数据未授权访问事件向贵机构报告，事件已得到控制，详细报告见附件。' },
  ]

  for (const n of notifications) insertNotification.run(n)
}

export default db
