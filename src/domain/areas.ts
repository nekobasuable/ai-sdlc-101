/** 人生の領域(spec R4) */
export const AREAS = [
  { id: 'work', label: '仕事' },
  { id: 'skill', label: 'スキル強化' },
  { id: 'school', label: '学校' },
  { id: 'private', label: 'プライベート' },
  { id: 'business', label: '新規ビジネス' },
] as const

export type Area = (typeof AREAS)[number]['id']
