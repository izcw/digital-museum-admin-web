import { ref } from 'vue'

export type NoticeType = 'system' | 'announcement' | 'warning' | 'update'
export type NoticeStatus = 'draft' | 'published' | 'withdrawn'
export interface NoticeItem {
  id: number
  title: string
  summary: string
  content: string
  type: NoticeType
  scope: string
  status: NoticeStatus
  recipients: number
  readers: number
  creator: string
  publishTime: string
  updateTime: string
  unread?: boolean
  sender: string
  relatedRoute?: string
}

export const notices = ref<NoticeItem[]>([
  {
    id: 1,
    title: '设备离线告警待处理',
    summary: '文化长廊展示终端已离线，请及时检查设备供电',
    content:
      '文化长廊展示终端已离线超过 20 分钟。请学校管理员检查设备总电源、供电线路及网络连接，恢复后系统会自动关闭该告警。',
    type: 'warning',
    scope: '实验小学管理员',
    status: 'published',
    recipients: 3,
    readers: 1,
    creator: '系统管理员',
    publishTime: '2026-09-09 10:10:00',
    updateTime: '2026-09-09 10:10:00',
    unread: true,
    sender: '设备监控中心',
    relatedRoute: 'DeviceAlert'
  },
  {
    id: 2,
    title: '奖励出货机库存补充提醒',
    summary: 'A4 货道已缺货，A3 货道库存偏低',
    content:
      '一楼展厅互动终端的 A4 货道已经缺货，A3 货道剩余 4 件。请核对实物库存后完成补货，并执行一次测试出货。',
    type: 'warning',
    scope: '第一小学管理员',
    status: 'published',
    recipients: 4,
    readers: 2,
    creator: '系统管理员',
    publishTime: '2026-09-09 09:45:00',
    updateTime: '2026-09-09 09:45:00',
    unread: true,
    sender: '设备监控中心',
    relatedRoute: 'DeviceAlert'
  },
  {
    id: 3,
    title: '文物资源包更新完成',
    summary: '基础文物资源包 v1.4 已发布',
    content:
      '基础文物资源包 v1.4 已发布，新增青铜器互动素材并优化离线资源索引。在线设备将在空闲时自动更新。',
    type: 'update',
    scope: '全部学校',
    status: 'published',
    recipients: 36,
    readers: 28,
    creator: '内容管理员',
    publishTime: '2026-09-08 16:30:00',
    updateTime: '2026-09-08 16:30:00',
    sender: '内容中心',
    relatedRoute: 'DeviceVersion'
  },
  {
    id: 4,
    title: '3D 打印安全巡检通知',
    summary: '请在本周完成打印机门禁与急停检查',
    content:
      '请各学校在本周完成 3D 打印机门禁联锁、急停按钮、散热风扇及耗材进料检测，并在维护记录中登记结果。',
    type: 'announcement',
    scope: '全部学校',
    status: 'published',
    recipients: 36,
    readers: 21,
    creator: '运维管理员',
    publishTime: '2026-09-08 09:00:00',
    updateTime: '2026-09-08 09:00:00',
    unread: true,
    sender: '运维中心',
    relatedRoute: 'DeviceAlert'
  },
  {
    id: 5,
    title: '教师培训安排',
    summary: '数字人和文物互动课程培训安排',
    content:
      '本周五 15:00 举行数字人问答调优和文物互动课程线上培训，欢迎学校管理员和负责教师参加。',
    type: 'system',
    scope: '指定学校（6）',
    status: 'draft',
    recipients: 0,
    readers: 0,
    creator: '培训管理员',
    publishTime: '—',
    updateTime: '2026-09-09 08:30:00',
    sender: '培训中心'
  }
])

export const typeMeta = {
  system: { label: '系统通知', type: 'primary' as const },
  announcement: { label: '公告通知', type: 'success' as const },
  warning: { label: '预警通知', type: 'danger' as const },
  update: { label: '更新通知', type: 'warning' as const }
}
export const statusMeta = {
  draft: { label: '草稿', type: 'info' as const },
  published: { label: '已发布', type: 'success' as const },
  withdrawn: { label: '已撤回', type: 'warning' as const }
}
