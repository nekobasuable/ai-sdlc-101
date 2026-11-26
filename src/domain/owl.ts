import type { Block } from './blocks'

// ふくろう(spec R36 改、plan/021)。上のバーにいて、どのページでも見える。姿は時間帯で決まる。ランダムにはしない
export type OwlPose = 'watch' | 'sleep' | 'read'

/**
 * @param block 今のブロック(ブロックの外の時間帯は null)
 * @param hasPlans 今のブロックに何か置いてあるか
 */
export function owlFor(block: Block | null, hasPlans: boolean): { pose: OwlPose } {
  const pose: OwlPose = !block || block.id === 'night' ? 'sleep' : hasPlans ? 'watch' : 'read'
  return { pose }
}
