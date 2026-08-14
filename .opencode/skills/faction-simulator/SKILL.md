---
name: faction-simulator
description: >-
  设计并模拟开放世界 TRPG 中会独立行动的派系、组织、反派势力与政治集团。用于派系目标、资源、方法、关系、4/6/8 格钟表、幕后行动、离屏推进、势力碰撞和 session 间世界演化。触发词：派系、阵营、组织、势力、幕后行动、clock、front、advance factions、faction simulation。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "world"
---

# Faction Simulator

派系不是给玩家触发的任务发布器，而是拥有资源、目标与行动能力的世界演员。

## 派系最小模型

```markdown
Name:
Current Agenda: 正在追求什么，必须是“向量”而不是形容词
Long Goal:
Resources: 人、钱、地盘、情报、合法性、魔法、物流等
Methods: 通常怎样做事
Constraints: 什么做不到/不愿做
Public Face: 普通人如何理解它
Private Reality: GM 真相
Leadership / Internal Split:
Allies / Rivals / Dependents:
Current Clock:
Visible Signals:
If Ignored:
```

“野心勃勃”不是 Agenda；“在冬至前控制北港的粮仓”才是。

## Clock 设计

按节奏选择 4 / 6 / 8 格：

```yaml
name: ""
segments: 6
filled: 0
advance_when: "明确触发条件"
threshold_signals:
  2: "玩家可观察变化"
  4: "更明显变化"
consequence_at_fill: "具体、可见、难以撤回的世界变化"
```

Clock 不是“每次 session 自动 +1”。只有触发条件发生才推进。

## Off-screen 推进流程

当经过显著游戏内时间、完成 session、或用户问“他们这段时间做了什么”时：

1. 读取当前 Agenda、资源、限制与相关 situation。
2. 判断过去这段时间是否满足 clock 触发条件。
3. 即使不推进 clock，也让派系做一件符合 Agenda 的小行动。
4. 如果玩家最近干预，先写派系对该干预的合理反应。
5. 若两个派系竞争同一资源，模拟碰撞，而不是各自独立增长。
6. 生成一个**可观察 ripple**：新闻、价格、难民、警戒、失踪、换旗、谣言、封锁、招聘等。
7. 把确认后的变化交给 `campaign-state-keeper` 写入 canon。

## 势力关系不是静态标签

除了 ally/enemy，记录“关系为什么存在”和“什么能改变它”。例如：

```yaml
relationship:
  faction_a: ""
  faction_b: ""
  state: "uneasy-alliance"
  dependency: "A 需要 B 的港口"
  fracture_trigger: "B 与王室签约"
```

## 玩家介入原则

- 玩家可以改变派系手段、速度、资源、领导层和盟友，但不自动成为世界唯一中心。
- 不把所有派系的下一步都写成“报复玩家”。
- 玩家解决一名领导者后，要处理继任、权力真空、分裂或吞并。
- 如果玩家与派系结盟，派系仍有自己的 Agenda，不变成无条件工具。

## 派系碰撞表

当多个派系同时行动时优先寻找：

- 同一资源；
- 同一地点；
- 相反公众叙事；
- 互斥政治目标；
- 争抢同一 NPC / 遗物 / 路线；
- 一方行动意外帮助另一方。

碰撞比单纯“威胁等级上升”更容易产生沙盒剧情。

## 不要做

- 不按“剧情需要”让派系突然变蠢。
- 不无依据推进 Clock。
- 不把秘密派系写成永远不可侦测；至少留下可观察信号。
- 不让所有 Clock 同速增长，造成世界像任务计时器面板。
