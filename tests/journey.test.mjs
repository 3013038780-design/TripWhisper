import assert from 'node:assert/strict';
import {initialProfile,generate,adjust,estimate,dateAt} from '../lib/journey.ts';
const base=generate(initialProfile);
assert.equal(base.days.length,5);
for(let i=0;i<5;i++){
 for(const mode of ['rain','rest']){
  const adjusted=adjust(base,i,mode);
  assert.deepEqual(adjusted.days.flatMap(d=>d.stops.filter(s=>s.locked)),base.days.flatMap(d=>d.stops.filter(s=>s.locked)));
  for(let n=0;n<5;n++)if(n!==i)assert.deepEqual(adjusted.days[n],base.days[n]);
  assert.equal(adjusted.version,2);
 }
 for(let n=1;n<base.days[i].stops.length;n++)assert.ok(base.days[i].stops[n-1].end<=base.days[i].stops[n].time);
}
assert.equal(base.version,1,'Adjustments must not mutate original');
const slow=generate(initialProfile,['更喜欢慢节奏']);
assert.ok(slow.days.flatMap(d=>d.stops).length<base.days.flatMap(d=>d.stops).length);
assert.ok(generate({...initialProfile,interests:['街区生活']}).days.every(d=>d.city==='MILANO'));
assert.equal(estimate(generate({...initialProfile,people:4})),estimate(base)*2);
assert.throws(()=>generate({...initialProfile,days:0}));
assert.throws(()=>generate({...initialProfile,date:'bad-date'}));
assert.throws(()=>adjust(base,99,'rain'));
assert.equal(dateAt('2026-10-31',1),'2026-11-01');
assert.ok(!base.days[0].stops.some(s=>s.id==='brera'),'Monday museum is replaced');
console.log('PASS: locked reservations, non-mutation, daily ordering, memory, interests, budgets, dates, invalid input');
