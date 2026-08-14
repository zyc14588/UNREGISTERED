---
name: campaign-state-keeper
description: >-
  维护长战役 TRPG 的单一事实源、世界时间、session 变更、派系钟表、NPC/地点状态、未决线程与连续性。用于赛后写回、canon 审核、时间线整理、矛盾检查、即兴内容转正、世界状态快照。触发词：更新战役状态、canon、连续性、时间线、世界状态、session 后更新、state keeper。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "persistence"
---

# Campaign State Keeper

你负责“什么已经真的发生”。这是长战役最重要的基础设施之一。

## Canon 边界

将信息分成三类：

- **CANON**：桌上已经发生、GM 明确确认、或现有资料明确规定的事实。
- **PROPOSAL**：为未来准备的候选设计，尚未发生。
- **UNKNOWN**：资料不足或存在冲突，不能擅自补完。

脑暴、预演、概率推测都不是 canon。只有明确发生/确认后才能写入世界状态。

## 单一事实源

默认使用：`campaign/state/world-state.yaml`。

它只保存“当前状态与关键索引”，详细历史进入 `campaign/state/timeline.md` 和实体文件，避免 YAML 无限膨胀。

推荐字段：

```yaml
campaign_time:
  current_date: ""
  current_time: ""
  calendar: ""
party:
  current_location: ""
  known_leads: []
  obligations: []
active_situations: []
faction_clocks: []
changed_locations: []
npc_status: []
open_threads: []
recent_world_events: []
provisional_table_canon: []
continuity_flags: []
```

## 赛后写回流程

1. **摄取事实**：读取最近 recap / GM notes，只提取实际发生的选择、发现、损失、获得、承诺、关系变化与时间消耗。
2. **计算时间**：明确推进了多少游戏内时间；没有证据时不要猜。
3. **状态差分**：只更新被触及的 location / NPC / faction / situation。
4. **派系推进**：让 `faction-simulator` 判断哪些行动与 clock advance 有充分触发依据；本 Skill 负责把确认结果写成 canon。
5. **处理 situation 生命周期**：active / dormant / resolved 迁移。
6. **记录时间线**：在 `timeline.md` 追加事件，不重写历史。
7. **即兴转正**：桌上临时出现且被使用的名字、NPC、地点或事实，从 provisional 提升为 canon。
8. **连续性审查**：扫描同名实体、死亡 NPC 再出现、旅行时间矛盾、知识泄漏、重复物品、冲突日期等。

## 事件记录格式

每个重要改变至少记录：

```yaml
- date: "游戏内日期"
  source: "session-XX"
  trigger: "什么实际发生"
  change: "具体状态变化"
  affected: ["NPC/Faction/Location/Situation"]
```

不要只写“局势恶化”。要写谁做了什么、什么变得可观察。

## 连续性冲突处理

发现两个来源互相冲突时：

1. 不悄悄选择其中一个；
2. 列出冲突的两个事实及其来源；
3. 能根据更晚的 canon 明确解析时，写出解析依据；
4. 不能确定时加入 `continuity_flags`，让 GM 决定。

## Provisional Table Canon

临场由 `improv-oracle` 生成的内容先记入：

```yaml
provisional_table_canon:
  - fact: ""
    introduced_in: "session-XX"
    used_by_players: true
    needs_detail: true
```

玩家已经与其互动的事实不能在下次准备时无声改掉。可以深化，但不能偷换。

## 长战役压缩

当状态文件太长：

- 已结算线程移出 active index；
- 旧事件保留在 timeline，不重复塞进当前状态；
- NPC 只在 state 中保留当前状态摘要，历史写回 NPC Activity Log；
- 地点只记录最近一次永久变化；
- 每 5–10 个 session 生成一次 checkpoint 摘要。

## 硬约束

- 不通过“修 continuity”篡改玩家已经知道的事实。
- 不把未发生的 prep 写成已发生事件。
- 不自行推进没有触发依据的 clock。
- 不以文学叙述代替状态变化。
