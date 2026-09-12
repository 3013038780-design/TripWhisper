'use client';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { type Journey } from '@/lib/journey';
import { previewReplan, type ReplanPreview } from '@/lib/replan';
import { Clock3, Footprints, ArrowRight } from 'lucide-react';

const actionLabel = {
  shifted: '顺延',
  shortened: '压缩',
  replaced: '替代',
  removed: '移除',
};

export function ReplanPanel({
  journey,
  day,
  onApply,
}: {
  journey: Journey;
  day: number;
  onApply: (next: Journey) => void;
}) {
  const [delayMinutes, setDelayMinutes] = useState(60);
  const [reduceWalking, setReduceWalking] = useState(false);
  const [preview, setPreview] = useState<ReplanPreview | null>(null);
  const [error, setError] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preview) previewRef.current?.scrollIntoView({ block: 'nearest' });
  }, [preview]);

  function runPreview() {
    try {
      setPreview(
        previewReplan(journey, day, {
          delayMinutes: Number(delayMinutes),
          reduceWalking,
        }),
      );
      setError('');
    } catch (e) {
      setPreview(null);
      setError((e as Error).message);
    }
  }

  const budgetDiff = preview ? preview.budgetTo - preview.budgetFrom : 0;

  return (
    <section className="panel">
      <h3>条件变了，先重排再确认</h3>
      <p className="note">
        输入晚出门分钟或减少步行。锁定的预订与交通不会被移动；确认前不会改行程。
      </p>
      <label htmlFor="replan-delay">
        晚出门（分钟，0—180）
        <Input
          id="replan-delay"
          type="number"
          min={0}
          max={180}
          step={15}
          value={delayMinutes}
          onChange={(e) => {
            setDelayMinutes(Number(e.target.value));
            setPreview(null);
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
          }}
        />
        减少步行，改为附近休息
      </label>
      <button className="secondary" onClick={runPreview}>
        <Clock3 size={16} /> 生成重排预览
      </button>
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
      <p className="muted" style={{ marginTop: 12 }}>
        <Footprints size={14} style={{ display: 'inline' }} />{' '}
        减少步行只替换未锁定的步行向活动；室内替代地点需现场选择。
      </p>
    </section>
  );
}
