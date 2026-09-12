import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'tripwhisper-replan-'));
try {
  for (const name of ['journey', 'replan']) {
    const text = readFileSync(
      new URL('../lib/' + name + '.ts', import.meta.url),
      'utf8',
    );
    const out = ts
      .transpileModule(text, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      })
      .outputText.replace(/from ['"]\.\/journey['"]/g, "from './journey.mjs'");
    writeFileSync(join(dir, name + '.mjs'), out);
  }
  const { generate, initialProfile, estimate } = await import(
    pathToFileURL(join(dir, 'journey.mjs'))
  );
  const { previewReplan, isFixedStop, toMinutes } = await import(
    pathToFileURL(join(dir, 'replan.mjs'))
  );

  const base = generate(initialProfile);
  const snapshot = structuredClone(base);

  function byId(day, id) {
    return day.stops.find((s) => s.id === id || s.id.startsWith(id + '-'));
  }

  const day2 = previewReplan(base, 1, {
    delayMinutes: 60,
    reduceWalking: false,
  });
  assert.deepEqual(base, snapshot, 'preview must not write the current itinerary');
  assert.equal(day2.next.version, base.version + 1);
  assert.equal(base.days[1].stops[0].time, '10:00');
  assert.equal(day2.next.days[1].stops[0].time, '11:00');
  assert.equal(day2.next.days[1].stops[0].end, '13:00');
  assert.equal(day2.next.days[1].stops[1].time, '13:30');
  assert.ok(day2.changes.some((c) => c.action === 'shifted' && c.minutes === 60));
  assert.deepEqual(day2.next.days[0], base.days[0], 'other days stay untouched');

  const lateFirst = previewReplan(base, 0, {
    delayMinutes: 60,
    reduceWalking: false,
  });
  const duomo = lateFirst.next.days[0].stops.find((s) => s.id === 'duomo');
  assert.equal(duomo.time, '09:30');
  assert.equal(duomo.end, '11:30');
  assert.equal(duomo.locked, true);
  assert.ok(lateFirst.locked.some((s) => s.name.includes('大教堂')));
  assert.equal(byId(lateFirst.next.days[0], 'gallery').time, '13:00');
  assert.ok(
    lateFirst.tradeoffs.some((t) => t.includes('已订项目') && t.includes('09:30')),
  );

  const como = previewReplan(base, 2, {
    delayMinutes: 60,
    reduceWalking: false,
  });
  const train = como.next.days[2].stops.find((s) => s.id === 'como');
  const back = como.next.days[2].stops.find((s) => s.id === 'return');
  assert.equal(train.time, '09:00');
  assert.equal(back.time, '17:00');
  assert.equal(byId(como.next.days[2], 'lake').time, '13:00');
  const ferry = byId(como.next.days[2], 'ferry');
  assert.ok(ferry);
  assert.ok(toMinutes(ferry.end) <= toMinutes(back.time) - 15);
  assert.ok(
    como.changes.some((c) => c.id === 'ferry' && c.action === 'shortened'),
  );

  const squeezed = previewReplan(base, 2, {
    delayMinutes: 180,
    reduceWalking: false,
  });
  assert.ok(
    squeezed.changes.some((c) => c.id === 'ferry' && c.action === 'removed'),
  );
  assert.ok(squeezed.next.days[2].stops.every((s) => s.id !== 'ferry'));
  assert.equal(
    squeezed.next.days[2].stops.find((s) => s.id === 'return').time,
    '17:00',
  );
  assert.ok(squeezed.tradeoffs.length > 0);

  const rest = previewReplan(base, 1, { delayMinutes: 0, reduceWalking: true });
  assert.ok(rest.changes.every((c) => c.action === 'replaced'));
  assert.ok(rest.next.days[1].stops.some((s) => s.name.includes('原地休息')));
  assert.ok(!rest.next.days[1].stops.some((s) => s.id === 'park'));
  assert.equal(rest.budgetFrom, estimate(base));
  assert.equal(rest.budgetTo, estimate(rest.next));

  const both = previewReplan(base, 1, { delayMinutes: 45, reduceWalking: true });
  assert.ok(both.changes.some((c) => c.action === 'replaced'));
  assert.equal(both.next.days[1].stops[0].time, '10:45');
  assert.ok(both.next.days[1].stops[0].name.includes('休息'));

  const unlocked = generate({ ...initialProfile, booked: false });
  const movedMorning = previewReplan(unlocked, 0, {
    delayMinutes: 30,
    reduceWalking: false,
  });
  assert.equal(movedMorning.next.days[0].stops[0].time, '10:00');
  assert.ok(!movedMorning.locked.some((s) => s.name.includes('大教堂')));

  assert.throws(() =>
    previewReplan(base, 99, { delayMinutes: 30, reduceWalking: false }),
  );
  assert.throws(() =>
    previewReplan(base, 0, { delayMinutes: 0, reduceWalking: false }),
  );
  assert.throws(() =>
    previewReplan(base, 0, { delayMinutes: -15, reduceWalking: false }),
  );
  assert.throws(() =>
    previewReplan(base, 0, { delayMinutes: 200, reduceWalking: false }),
  );

  const applied = previewReplan(base, 1, {
    delayMinutes: 60,
    reduceWalking: true,
  });
  assert.ok(
    applied.next.days[1].stops.every((s, i, arr) => !i || arr[i - 1].end <= s.time),
  );
  assert.ok(
    applied.next.days
      .flatMap((d) => d.stops)
      .filter(isFixedStop)
      .every((s) => {
        const before = base.days.flatMap((d) => d.stops).find((x) => x.id === s.id);
        return !before || (before.time === s.time && before.end === s.end);
      }),
  );
  assert.deepEqual(base, snapshot);
  console.log(
    'PASS: constrained replan preview/confirm isolation, locked transit, delay shifts, removals, walking swaps, budgets, validation',
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
