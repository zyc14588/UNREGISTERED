---
name: session-prep-recap
description: >-
  为开放世界长战役 TRPG 生成桌上可直接运行的下一次 Session Guide，并在赛后制作事实化 recap 与更新清单。Prep 模式从当前世界状态抽取 5–7 个可独立运行的场景菜单而非剧情顺序；Recap 模式记录选择、发现、资源、关系、时间与未决线程。触发词：下一次团、session prep、今晚跑什么、run guide、recap、战报、赛后整理。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "operations"
---

# Session Prep & Recap

## PREP 模式

Session Guide 是“今晚桌上的操作文档”，不是未来故事梗概。

### 读取顺序

1. `campaign/state/world-state.yaml`
2. 最近 recap
3. 玩家当前位置附近 active situations
4. 相关 faction clocks
5. 会出现的 NPC / locations
6. 规则系统摘要（只在需要数值时）

### 作用域

一次通常只准备 3–5 小时的材料。默认：

- 2–3 条最热线程；
- 最多 5–7 张 scene cards；
- 1 个 strong start；
- 2–4 个 stall / surprise hooks；
- 1 个 spotlight reminder。

超过 7 张卡通常说明正在预写多次 session。

### Dashboard

顶部一屏回答：

- 游戏内日期/时间；
- Party location；
- 当前最热 3 个 pressures；
- 相关 faction clocks；
- 今晚可能出现的 NPC roster；
- 上次 session 留下的硬选择/承诺；
- 哪个 PC 最久没有获得真正有意义的 spotlight。

### Scene Card

每张卡按“线程”组织，不按预定时间顺序：

```markdown
## [Scene / Situation]
Trigger: 玩家什么时候会碰到
What Is True Now:
Actors & Wants:
Immediate Pressure:
Read-Aloud: 可选，2–4 句
Clue / Secret in Play:
Mechanic: 只放今晚需要的最小信息
If Engaged:
If Ignored:
Exits / Leads: 通向哪些不同选择
```

Cards 是菜单，不是“Scene 1, 2, 3 必须依次发生”。

### Strong Start

从当前世界真实压力中开场，直接给动作/变化/选择，不用长 recap。玩家仍然可以离开或改方向。

### Inline-First

桌上会用到的 NPC Want、关键规则、clue、简化 stat、后果尽量直接放在 card 里。链接用于 session 间深入查阅，不让 GM 临场开十个文件找一句信息。

## RECAP 模式

Recap 只写事实：

- 玩家做出的重要决定；
- 学到的事实/线索；
- 得失的资源/物品/身份；
- NPC/派系关系变化；
- 伤亡、承诺、债务；
- 游戏内时间与旅行；
- 新出现的 provisional canon；
- 未解决 hooks。

不要把 GM 原本打算发生但没有发生的内容写进 recap。

## POST-SESSION 交接

Recap 完成后：

1. `campaign-state-keeper` 写世界差分；
2. `faction-simulator` 处理符合触发条件的幕后动作；
3. 再由 state keeper 记录确认后的 clock / situation 更新。

## Spotlight

Spotlight 不是硬塞一幕“让某 PC 发光”。把较少获得关注的 PC 与真实 pressure、NPC 或 choice 连接即可，让玩家自己决定是否抓住。
