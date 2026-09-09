'use client';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, Download } from 'lucide-react';
import { sources, type Journey } from '@/lib/journey';
const phrases = [
  ['Buongiorno', '你好 / 早上好'],
  ['Un biglietto per Como, per favore.', '请给我一张去科莫的票。'],
  ['Il conto, per favore.', '请结账。'],
  ['Parla inglese?', '您说英语吗？'],
  ['Dov’è la stazione?', '火车站在哪里？'],
];
export function Handbook({
  journey,
  checks,
  onCheck,
}: {
  journey: Journey;
  checks: string[];
  onCheck: (c: string[]) => void;
}) {
  const [chapter, setChapter] = useState('准备出发');
  const stories = Array.from(
    new Map(
      journey.days
        .flatMap((d) => d.stops)
        .filter((s) => s.kind !== '我的预订')
        .map((s) => [s.name, s]),
    ).values(),
  );
  return (
    <div className="grid">
      <section className="panel">
        <div className="row spread">
          <div>
            <p className="eyebrow">A LITTLE CONTEXT GOES A LONG WAY</p>
            <h2>你的随身背景手册</h2>
          </div>
          <button className="secondary" onClick={() => window.print()}>
            <Download size={16} /> 打印这一章
          </button>
        </div>
        <div className="chips">
          {['准备出发', '看懂目的地', '交通与订票', '当地常用语'].map((c) => (
            <button
              className={'chip ' + (c === chapter ? 'active' : '')}
              aria-pressed={c === chapter}
              onClick={() => setChapter(c)}
              key={c}
            >
              {c}
            </button>
          ))}
        </div>
        {chapter === '准备出发' && (
          <>
            <p className="note">
              这份清单帮助你准备当前旅程；签证、入境及证件要求请向适用的官方机构核实。
            </p>
            {[
              '保存证件与票券的离线副本',
              '确认首晚住宿与入住方式',
              '提前查到机场至住宿的完整路线',
              '确认通信、漫游或当地流量方案',
              '准备支付方式并了解发卡行费用',
              '核实景点开放、预约时间和末班交通',
              '检查出发前天气与行李寄存安排',
            ].map((item, i) => (
              <label className="prep-check" key={item}>
                <Checkbox
                  checked={checks.includes(item)}
                  onCheckedChange={(v) =>
                    onCheck(
                      v ? [...checks, item] : checks.filter((x) => x !== item),
                    )
                  }
                />
                <span>
                  <small>0{i + 1}</small>
                  {item}
                </span>
              </label>
            ))}
            <div className="callout">
              抵达计划还需要你的航班机场与落地时间。当前版本不会凭空填写机场交通，请在官网查询后把固定安排录入「我的预订」。
            </div>
          </>
        )}
        {chapter === '看懂目的地' && (
          <>
            {stories.map((s, i) => (
              <article className="story-chapter" key={s.name}>
                <span className="eyebrow">
                  CHAPTER {String(i + 1).padStart(2, '0')} · {s.kind}
                </span>
                <h3>{s.name}</h3>
                <p>{s.story}</p>
                <blockquote>{s.tip}</blockquote>
                {s.url && (
                  <a
                    className="small-link"
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    官方资料与到访信息 ↗
                  </a>
                )}
              </article>
            ))}
          </>
        )}
        {chapter === '交通与订票' && (
          <>
            <article className="story-chapter">
              <h3>先确定站名，再选车票</h3>
              <p>
                米兰市内交通查看 ATM；前往科莫的区域火车查看
                Trenord。把出发站、到达站、日期和返程计划放在一起确认，不要只凭目的地名称买票。
              </p>
              <div className="row">
                <a href={sources.metro} target="_blank" rel="noreferrer">
                  ATM 市内交通 ↗
                </a>
                <a href={sources.train} target="_blank" rel="noreferrer">
                  Trenord 火车 ↗
                </a>
              </div>
            </article>
            <article className="story-chapter">
              <h3>游船不是随到随走的地铁</h3>
              <p>
                在官方时刻表确认码头、船型、方向及当天末班船。没有合适往返时段时，保留湖边散步，不必为了打卡赶船。
              </p>
              <a href={sources.ferry} target="_blank" rel="noreferrer">
                科莫湖游船官网 ↗
              </a>
            </article>
            <article className="story-chapter">
              <h3>预订前看三件事</h3>
              <p>
                日期与入场时段、票种包含的内容、改退规则。付款完成后保管确认邮件或票券；本网站的“锁定”只保护行程安排，不是购买确认。
              </p>
            </article>
          </>
        )}
        {chapter === '当地常用语' && (
          <>
            <p className="note">
              意大利语简短表达，可直接展示给对方。本页不是实时翻译工具。
            </p>
            {phrases.map(([local, cn]) => (
              <div className="phrase" key={local}>
                <strong>{local}</strong>
                <p>{cn}</p>
              </div>
            ))}
          </>
        )}
      </section>
      <aside>
        <section className="panel handbook-cover">
          <BookOpen size={32} />
          <p className="eyebrow">TRIPWHISPER / FIELD NOTES</p>
          <h2>
            出发之前，
            <br />
            多懂一点。
          </h2>
          <p>米兰 · 科莫湖</p>
          <div className="cover-line" />
          <p className="note">
            {journey.profile.date}
            <br />
            {journey.days.length} 天 · 按当前行程整理
          </p>
        </section>
        <section className="panel">
          <h3>准备进度</h3>
          <p className="preparation-count">
            {checks.length}
            <span> / 7</span>
          </p>
          <p className="note">打勾只是你的准备记录，不代表系统已经核验。</p>
        </section>
      </aside>
    </div>
  );
}
