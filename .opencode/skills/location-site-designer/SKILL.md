---
name: location-site-designer
description: >-
  把开放世界 TRPG 的城镇、建筑、遗迹、地城、据点与探索区域做成可反复运行的可玩地点。用于地点 key、非线性探索、多个入口、环路、捷径、垂直层、环境互动、地点派系、再访变化与 room/site design。触发词：地点、城市、地城、遗迹、据点、房间、探索地图、location、dungeon、site design。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "scenario"
---

# Location & Site Designer

地点不是风景描写，而是“玩家可以在里面做决定的机器”。

## 三种尺度

### Hub
城镇、太空站、港口、学院、营地。重点是重复访问、NPC/派系、服务、资源与变化。

### Adventure Site
遗迹、庄园、工厂、洞穴、神殿、地城。重点是空间拓扑、多个路线、交互与危险。

### Micro Location
单个房间、店铺、路口、营地。重点是一眼可用。

## Location Card

```markdown
Identity: 一句话
Active Function: 这里在“做”什么（吸引/保护/隐藏/消耗/转化/分配……）
Current Unstable Condition:
Controller / Inhabitants:
What Players Can Gain:
What Can Go Wrong:
Secrets:
Visible Clues:
Connections / Exits:
If Ignored:
Revisit Change:
```

## Adventure Site 拓扑

尽量避免纯线性“房间 1→2→3→Boss”。重要 Site 优先包含：

- 2+ 入口或进入方式；
- 至少一个环路；
- 至少一个捷径或可解锁连接；
- 不同高度/区域/风险带；
- 可绕过的威胁；
- 可改变路线的机关、谈判、工具或环境动作。

空间布局必须带来选择，而不只是地图看起来复杂。

## Keyed Area 模板

每个关键空间写：

```markdown
Purpose: 这个空间原本/现在为什么存在
Immediate Read: 1–2 句可朗读的具体感官信息
Interactive Elements: 2–4 个可碰、可用、可破坏、可谈判的东西
Occupants & Wants:
Hazard / Pressure:
Clues / Information:
Resources / Rewards:
Exits / Connections:
If Disturbed:
If Revisited:
```

“空房间”也必须有用途：声学、路线、安全点、历史痕迹、观察窗、资源或错误预期。否则删除它。

## Hub 设计

Hub 需要：

- 3–6 个不同功能的可去地点；
- 2–4 个竞争派系/利益群体；
- 常驻 NPC bench；
- 当前压力；
- 服务与稀缺资源；
- 公开传闻；
- 会随 world state 改变的价格、警戒、权力或社会气氛。

## Revisit First

长战役里“回来以后变了什么”往往比第一次描写更重要。每个重要地点维护：

- 控制权；
- 已耗尽/新增资源；
- 已发现/未发现秘密；
- 与玩家关系；
- 建设/破坏；
- faction clock 对它的影响。

## 规则与文风

- 具体数值危险交给 `rules-system-adapter`。
- GM key 用 `trpg-prose-writer` 的参考模式；朗读框用玩家可见模式。
- 不写“你感到害怕/不安”；描述能让玩家自己判断的事实。
