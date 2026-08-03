/**
 * 社区演化事件检测模块
 *
 * 基于相邻时间切片的社区匹配结果，检测六类演化事件：
 * birth（新社区出现）、death（社区消失）、split（分裂）、
 * merge（合并）、growth（成长）、shrink（衰退）。
 */
import type { CommunityTimeSlice, EvolutionEvent } from '@sker/sdk';
import type { CommunityMatcher } from './community-evolution.matching';

/**
 * 反向匹配函数类型：currCommunityId -> [prevCommunityIds]
 */
type ReverseMatchFn = (matches: Map<string, string>) => Map<string, string[]>;

/**
 * 检测演化事件
 *
 * @param timeSlices 时间切片序列（按时间升序）
 * @param matchCommunities 社区匹配函数（通过参数注入以便复用/替换）
 * @param reverseMatchFn 反向匹配函数
 */
export function detectEvolutionEvents(
  timeSlices: CommunityTimeSlice[],
  matchCommunities: CommunityMatcher,
  reverseMatchFn: ReverseMatchFn
): EvolutionEvent[] {
  const events: EvolutionEvent[] = [];

  for (let i = 1; i < timeSlices.length; i++) {
    const prevSlice = timeSlices[i - 1]!;
    const currSlice = timeSlices[i]!;
    const matches = matchCommunities(prevSlice, currSlice);

    // Birth: 新社区出现
    for (const currComm of currSlice.communities) {
      if (!Array.from(matches.values()).includes(currComm.id)) {
        events.push({
          type: 'birth',
          timestamp: currSlice.timestamp,
          involvedCommunities: [currComm.id],
          magnitude: currComm.size,
          description: `新社区 ${currComm.name} 出现，包含 ${currComm.size} 个成员`,
        });
      }
    }

    // Death: 社区消失
    for (const prevComm of prevSlice.communities) {
      if (!matches.has(prevComm.id)) {
        events.push({
          type: 'death',
          timestamp: currSlice.timestamp,
          involvedCommunities: [prevComm.id],
          magnitude: prevComm.size,
          description: `社区 ${prevComm.name} 解散，原 ${prevComm.size} 个成员`,
        });
      }
    }

    // Split: 一个社区分裂为多个
    const reverseMatches = reverseMatchFn(matches);
    for (const [currId, prevIds] of reverseMatches) {
      if (prevIds.length > 1) {
        const currComm = currSlice.communities.find((c) => c.id === currId);
        events.push({
          type: 'split',
          timestamp: currSlice.timestamp,
          involvedCommunities: [...prevIds, currId],
          magnitude: currComm?.size || 0,
          description: `${prevIds.length} 个社区合并为 ${currComm?.name}`,
        });
      }
    }

    // Merge: 多个社区合并为一个
    const mergeMap = new Map<string, string[]>();
    for (const [prevId, currId] of matches) {
      if (!mergeMap.has(currId)) {
        mergeMap.set(currId, []);
      }
      mergeMap.get(currId)!.push(prevId);
    }

    for (const [currId, prevIds] of mergeMap) {
      if (prevIds.length > 1) {
        const currComm = currSlice.communities.find((c) => c.id === currId);
        events.push({
          type: 'merge',
          timestamp: currSlice.timestamp,
          involvedCommunities: [...prevIds, currId],
          magnitude: currComm?.size || 0,
          description: `${prevIds.length} 个社区合并为 ${currComm?.name}`,
        });
      }
    }

    // Growth/Shrink: 社区规模变化
    for (const [prevId, currId] of matches) {
      const prevComm = prevSlice.communities.find((c) => c.id === prevId);
      const currComm = currSlice.communities.find((c) => c.id === currId);

      if (prevComm && currComm) {
        const changeRatio = (currComm.size - prevComm.size) / prevComm.size;

        if (changeRatio > 0.2) {
          events.push({
            type: 'growth',
            timestamp: currSlice.timestamp,
            involvedCommunities: [prevId, currId],
            magnitude: changeRatio,
            description: `社区 ${currComm.name} 成长 ${Math.round(changeRatio * 100)}%`,
          });
        } else if (changeRatio < -0.2) {
          events.push({
            type: 'shrink',
            timestamp: currSlice.timestamp,
            involvedCommunities: [prevId, currId],
            magnitude: Math.abs(changeRatio),
            description: `社区 ${currComm.name} 衰退 ${Math.round(Math.abs(changeRatio) * 100)}%`,
          });
        }
      }
    }
  }

  return events;
}
