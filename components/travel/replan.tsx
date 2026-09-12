'use client';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { adjust, type Journey } from '@/lib/journey';
import { previewReplan, type ReplanPreview } from '@/lib/replan';
import {
  Clock3,
  CloudRain,
  Footprints,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

const actionLabel = {
  shifted: '顺延',
  shortened: '压缩',
  replaced: '替代',
  removed: '移除',
};

export function ReplanPanel({
  journey,
  day,
  previous,
  onApply,
  onRestore,
}: {
  journey: Journey;
  day: number;
  previous: Journey | null;
  onApply: (next: Journey) => void;
  onRestore: () => void;
}) {
  const [delayMinutes, setDelayMinutes] = useState(60);
  const [reduceWalking, setReduceWalking] = useState(false);
  const [preview, setPreview] = useState<ReplanPreview | null>(null);
  const [rainPending, setRainPending] = useState<Journey | null>(null);
  const [error, setError] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preview) previewRef.current?.scrollIntoView({ block: 'nearest' });
  }, [preview]);

  function runPreview(next = { delayMinutes, reduceWalking }) {
    try {
      setRainPending(null);
      setPreview(
        previewReplan(journey, day, {
          delayMinutes: Number(next.delayMinutes),
          reduceWalking: next.reduceWalking,
        }),
      );
      setError('');
    } catch (e) {
      setPreview(null);
      setError((e as Error).message);
    }
  }

  const budgetDiff = preview ? preview.budgetTo - preview.budgetFrom : 0;
  const active = journey.days[day];

  return (
    <section className="panel">
      <h3>计划跟着你走</h3>
      <p className="note">今天的情况变了？先输入晚出门，或用快捷方式看替代安排。</p>
      <div className="row">
        <button
          className="secondary"
          onClick={() => {
            setPreview(null);
            setError('');
            setRainPending(adjust(journey, day, 'rain'));
          }}
        >
          <CloudRain size={16} /> 下雨了
        </button>
        <button
          className="secondary"
          onClick={() => {
            setDelayMinutes(0);
            setReduceWalking(true);
            runPreview({ delayMinutes: 0, reduceWalking: true });
          }}
        >
          <Footprints size={16} /> 少走路
        </button>
      </div>
      <div className="replan-delay-box">
        <label htmlFor="replan-delay">
          晚出门（分钟，0—180）
          <Input
            id="replan-delay"
            type="number"
            min={0}
            max={180}
            step={15}
            value={Number.isFinite(delayMinutes) ? delayMinutes : 0}
            onChange={(e) => {
              setDelayMinutes(Number(e.target.value));
              setPreview(null);
              setRainPending(null);
            }}
          />
        </label>
        <label className="check" htmlFor="replan-walk">
          <Checkbox
            id="replan-walk"
            checked={reduceWalking}
            onCheckedChange={(v) => {
              setReduceWalking(!!v);
              setPreview(null);
              setRainPending(null);
            }}
          />
          减少步行，改为附近休息
        </label>
        <button className="secondary" onClick={() => runPreview()}>
          <Clock3 size={16} /> 生成晚出门重排预览
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <div className="review-box replan-preview" ref={previewRef}>
          <h3>待确认的受约束重排</h3>
          <p className="note">
            {preview.conditions.delayMinutes > 0
              ? `晚出门 ${preview.conditions.delayMinutes} 分钟`
              : '不延后出发'}
            {preview.conditions.reduceWalking ? ' · 减少步行' : ''}
            。第 {preview.day + 1} 天。
          </p>
          <p className="note">{preview.next.days[day].reason}</p>
          <h4>锁定保留</h4>
          {preview.locked.length ? (
            preview.locked.map((item) => (
              <p className="note" key={item.name + item.time}>
                {item.time}–{item.end} {item.name} · {item.reason}
              </p>
            ))
          ) : (
            <p className="note">当天没有锁定预订或交通。</p>
          )}
          <h4>受影响项目</h4>
          {preview.changes.length ? (
            preview.changes.map((change) => (
              <p className="note" key={change.id + change.action}>
                <span className="tag">{actionLabel[change.action]}</span>{' '}
                {change.name} {change.fromTime}–{change.fromEnd}
                {change.toTime
                  ? ` → ${change.toName ? change.toName + ' ' : ''}${change.toTime}–${change.toEnd}`
                  : ''}
                {typeof change.minutes === 'number' && change.minutes
                  ? `（${change.minutes > 0 ? '+' : ''}${change.minutes} 分钟）`
                  : ''}
                。{change.reason}
              </p>
            ))
          ) : (
            <p className="note">灵活活动的时间没有变化。</p>
          )}
          <h4>活动预算参考</h4>
          <p className="note">
            €{preview.budgetFrom} → €{preview.budgetTo}
            {budgetDiff
              ? `（${budgetDiff > 0 ? '增加' : '减少'} €${Math.abs(budgetDiff)}）`
              : '（无变化）'}
            。确认为演示估值，不是报价。
          </p>
          <h4>取舍说明</h4>
          {preview.tradeoffs.map((item) => (
            <p className="note" key={item}>
              · {item}
            </p>
          ))}
          <p className="note">
            以上是规则重排预览，不是实时路况或票务结果。确认后才会写入总行程、每日卡和预算。
          </p>
          <div className="row">
            <button
              className="primary"
              onClick={() => {
                if (preview.baseVersion !== journey.version) {
                  setError('行程已经变化，请重新预览。');
                  setPreview(null);
                  return;
                }
                onApply(preview.next);
                setPreview(null);
              }}
            >
              确认重排 <ArrowRight size={15} />
            </button>
            <button className="secondary" onClick={() => setPreview(null)}>
              取消
            </button>
          </div>
        </div>
      )}
      {rainPending && active && (
        <div className="review-box">
          <h3>待确认的调整</h3>
          <p className="note">{rainPending.days[day].reason}</p>
          {rainPending.days[day].stops
            .filter((s, i) => s.name !== active.stops[i]?.name)
            .map((s, i) => (
              <p key={i} className="note">
                {s.time} → {s.name}
              </p>
            ))}
          {!rainPending.days[day].stops.some(
            (s, i) => s.name !== active.stops[i]?.name,
          ) && <p className="note">当天没有适合替换的活动，原安排可保留。</p>}
          <p className="note">
            已订项目与交通时段保持原样。室内替代地点需现场选择。
          </p>
          <div className="row">
            <button
              className="primary"
              onClick={() => {
                onApply(rainPending);
                setRainPending(null);
              }}
            >
              确认调整
            </button>
            <button className="secondary" onClick={() => setRainPending(null)}>
              取消
            </button>
          </div>
        </div>
      )}
      {previous && (
        <button
          className="small-link"
          style={{ border: 0, background: 'none', marginTop: 16 }}
          onClick={onRestore}
        >
          <RotateCcw size={14} style={{ display: 'inline' }} /> 恢复上一版
        </button>
      )}
    </section>
  );
}
