# QA · Issue #3 受约束重排

上游 Issue：[P0：晚出门后的受约束重排 #3](https://github.com/3013038780-design/TripWhisper/issues/3)

- Fork PR：https://github.com/livehighhigh/TripWhisper/pull/1
- 上游 PR：https://github.com/3013038780-design/TripWhisper/pull/8

本目录是手工验收时留下的演示证据，不是产品功能代码。

## 文件说明

| 文件 | 证明什么 |
| --- | --- |
| `replan_daily_card_with_late_departure.png` | 每日卡右侧「计划跟着你走」在「下雨了 / 少走路」下方有「晚出门」分钟输入 |
| `late_departure_field_in_sidebar.mp4` | 同一侧栏可改晚出门分钟并生成预览 |
| `replan_day1_preview_locked_duomo.png` | Day 1 预览：大教堂已订时段保留，后续灵活活动顺延 |
| `replan_overview_unchanged_before_confirm.png` | 生成预览后、确认前，「全程安排」仍是原时间 |
| `replan_preview_then_confirm_overview_sync.mp4` | 预览不写行程 → 确认后总行程同步到 13:00 拱廊 |
| `replan_overview_synced_after_confirm.png` | 确认后「全程安排」已更新，日卡与预算共用同一份行程 |
| `replan_day3_transit_lock_tradeoffs.png` | Day 3 火车/返程锁定，湖边压缩或游船移除，并给出取舍 |

未收入：`tripwhisper-replan-demo-complete.mp4`（约 22MB，较长且夹杂无关操作）。优先保留更短的同步演示视频。

## 如何复现

```sh
npm install
npm run dev
```

打开「每日行动卡」：

1. 看右侧「计划跟着你走」：快捷按钮下方有「晚出门（分钟）」，默认 60。
2. 点「生成晚出门重排预览」：大教堂 09:30–11:30 已订不动，拱廊 12:00→13:00。
3. 先不要确认，打开「全程安排」：Day 01 仍是 `09:30 米兰大教堂〔已订〕 → 12:00 拱廊…`。
4. 回到每日卡确认重排。全程安排变为 `09:30 … → 13:00 拱廊…`，日卡和预算一起更新。
5. Day 03 填 180 分钟：火车 09:00 与返程 17:00 锁定；湖边可能压缩，游船可能移除。
6. Day 02 可勾选「减少步行」：户外项改为附近休息。

示范行程不是实时路况或票务事实。
