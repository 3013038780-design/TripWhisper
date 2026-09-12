import { estimate, type Journey, type Stop } from './journey';

export type ReplanConditions = {
  delayMinutes: number;
  reduceWalking: boolean;
};

export type ReplanChange = {
  action: 'shifted' | 'shortened' | 'replaced' | 'removed';
  id: string;
  name: string;
  fromTime: string;
  fromEnd: string;
  toTime?: string;
  toEnd?: string;
  toName?: string;
  minutes?: number;
  reason: string;
};

export type ReplanLock = {
  name: string;
  time: string;
  end: string;
  reason: string;
};

export type ReplanPreview = {
  next: Journey;
  day: number;
  baseVersion: number;
  conditions: ReplanConditions;
  locked: ReplanLock[];
  changes: ReplanChange[];
  tradeoffs: string[];
  budgetFrom: number;
  budgetTo: number;
};

const BUFFER = 15;
const MIN_SPAN = 30;
const DAY_END = 21 * 60;

export function toMinutes(value: string) {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}

export function fromMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return (
    String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0')
  );
}

export function isFixedStop(stop: Stop) {
  return !!(stop.locked || stop.kind === '交通');
}

export function isWalkHeavy(stop: Stop) {
  return !!(
    stop.outdoor ||
    ['艺术', '街区', '自然', '游船', '历史'].includes(stop.kind)
  );
}

function nearbyRest(source: Stop): Stop {
  return {
    id: source.id + '-rest',
    time: source.time,
    end: source.end,
    name: '减少步行，原地休息',
    local: 'Caffè · near your current stop',
    address: source.address,
    kind: '休息',
    transport: '在上一站附近选择室内场所，具体店铺请现场确认',
    cost: 10,
    story: '把一段空白留给窗外的城市，也留给自己的感受。',
    tip: '这是休息建议，不是已核实的特定店铺或预订。',
  };
}

function nextFixed(stops: Stop[], from: number) {
  return stops.slice(from + 1).find(isFixedStop);
}

function describeConditions(c: ReplanConditions) {
  const parts: string[] = [];
  if (c.delayMinutes > 0) parts.push(`晚出门 ${c.delayMinutes} 分钟`);
  if (c.reduceWalking) parts.push('减少步行');
  return parts.join(' · ');
}

export function previewReplan(
  journey: Journey,
  dayIndex: number,
  conditions: ReplanConditions,
): ReplanPreview {
  if (!journey.days[dayIndex]) throw new Error('找不到这一天');
  if (
    !Number.isInteger(conditions.delayMinutes) ||
    conditions.delayMinutes < 0 ||
    conditions.delayMinutes > 180
  )
    throw new Error('延后分钟须为 0—180 的整数。');
  if (!conditions.reduceWalking && conditions.delayMinutes === 0)
    throw new Error('请填写延后分钟，或勾选减少步行。');

  const original = journey.days[dayIndex].stops;
  const next = structuredClone(journey);
  const locked: ReplanLock[] = [];
  const changes: ReplanChange[] = [];
  const tradeoffs: string[] = [];
  const kept: Stop[] = [];

  for (const stop of original) {
    if (!isFixedStop(stop)) continue;
    locked.push({
      name: stop.name,
      time: stop.time,
      end: stop.end,
      reason: stop.locked ? '已订项目，时间保留' : '交通时段，时间保留',
    });
    if (conditions.delayMinutes > 0) {
      tradeoffs.push(
        `${stop.name} 为${stop.locked ? '已订项目' : '交通'}，仍为 ${stop.time}–${stop.end}，不会随晚出门移动。`,
      );
    }
  }

  original.forEach((stop, index) => {
    if (isFixedStop(stop)) {
      kept.push({ ...stop });
      return;
    }

    const duration = toMinutes(stop.end) - toMinutes(stop.time);
    let start = toMinutes(stop.time) + conditions.delayMinutes;
    let end = start + duration;
    let shortened = false;

    const previous = kept[kept.length - 1];
    if (previous) {
      const earliest = toMinutes(previous.end) + BUFFER;
      if (start < earliest) {
        start = earliest;
        end = start + duration;
      }
    }

    if (start >= DAY_END || start >= 24 * 60) {
      changes.push({
        action: 'removed',
        id: stop.id,
        name: stop.name,
        fromTime: stop.time,
        fromEnd: stop.end,
        reason: '顺延后已超过可安排时段，已移除。',
      });
      tradeoffs.push(`${stop.name} 顺延后过晚，已从当天移除。`);
      return;
    }

    const fixedAfter = nextFixed(original, index);
    if (fixedAfter) {
      const deadline = toMinutes(fixedAfter.time) - BUFFER;
      if (end > deadline) {
        if (deadline - start >= MIN_SPAN) {
          end = deadline;
          shortened = true;
          tradeoffs.push(
            `为衔接锁定的 ${fixedAfter.name}（${fixedAfter.time}），已压缩 ${stop.name}。`,
          );
        } else {
          changes.push({
            action: 'removed',
            id: stop.id,
            name: stop.name,
            fromTime: stop.time,
            fromEnd: stop.end,
            reason: `顺延后会碰到锁定的 ${fixedAfter.name}，已移除。`,
          });
          tradeoffs.push(
            `${stop.name} 无法在 ${fixedAfter.name} 前保留至少 ${MIN_SPAN} 分钟，已移除。`,
          );
          return;
        }
      }
    }

    if (end > DAY_END) {
      if (DAY_END - start >= MIN_SPAN) {
        end = DAY_END;
        shortened = true;
        tradeoffs.push(`${stop.name} 已压缩，以免拖到晚上 21:00 之后。`);
      } else {
        changes.push({
          action: 'removed',
          id: stop.id,
          name: stop.name,
          fromTime: stop.time,
          fromEnd: stop.end,
          reason: '顺延后过晚，已移除。',
        });
        tradeoffs.push(`${stop.name} 顺延后过晚，已从当天移除。`);
        return;
      }
    }

    let updated: Stop = {
      ...stop,
      time: fromMinutes(start),
      end: fromMinutes(end),
    };

    if (conditions.reduceWalking && isWalkHeavy(updated)) {
      const rest = nearbyRest(updated);
      changes.push({
        action: 'replaced',
        id: stop.id,
        name: stop.name,
        fromTime: stop.time,
        fromEnd: stop.end,
        toTime: rest.time,
        toEnd: rest.end,
        toName: rest.name,
        minutes: start - toMinutes(stop.time),
        reason: shortened
          ? '减少步行，并压缩时长以衔接锁定时段。'
          : '减少步行，改为附近室内休息。',
      });
      updated = rest;
    } else if (shortened) {
      changes.push({
        action: 'shortened',
        id: stop.id,
        name: stop.name,
        fromTime: stop.time,
        fromEnd: stop.end,
        toTime: updated.time,
        toEnd: updated.end,
        minutes: start - toMinutes(stop.time),
        reason: '为衔接锁定预订或交通，已压缩停留时间。',
      });
    } else if (updated.time !== stop.time || updated.end !== stop.end) {
      changes.push({
        action: 'shifted',
        id: stop.id,
        name: stop.name,
        fromTime: stop.time,
        fromEnd: stop.end,
        toTime: updated.time,
        toEnd: updated.end,
        minutes: start - toMinutes(stop.time),
        reason: `随晚出门顺延 ${conditions.delayMinutes} 分钟。`,
      });
    }

    kept.push(updated);
  });

  kept.sort((a, b) => a.time.localeCompare(b.time));
  next.days[dayIndex].stops = kept;
  next.days[dayIndex].reason =
    `${describeConditions(conditions)}后的受约束重排。` +
    (locked.length
      ? '已保留锁定预订与交通时段。'
      : '当天没有锁定预订或交通。') +
    (tradeoffs.length ? '部分条件无法完全满足，请查看取舍说明。' : '');
  next.version += 1;

  if (!changes.length && !locked.length) {
    tradeoffs.push('当前条件没有改动可执行的活动。');
  } else if (!changes.length && conditions.delayMinutes > 0) {
    tradeoffs.push(
      '晚出门无法移动当天仅有的锁定预订或交通；行程时间表保持原样。',
    );
  }

  return {
    next,
    day: dayIndex,
    baseVersion: journey.version,
    conditions,
    locked,
    changes,
    tradeoffs: [...new Set(tradeoffs)],
    budgetFrom: estimate(journey),
    budgetTo: estimate(next),
  };
}
