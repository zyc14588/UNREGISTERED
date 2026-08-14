---
name: sandbox-world-engine
description: >-
  为开放世界长战役 TRPG 构建可运行的沙盒：地区、旅行网络、聚落、资源、危险、派系压力、传闻和可重入内容。用于世界地图结构、hex/point crawl、区域扩展、开放世界准备、旅行与世界层次设计。触发词：开放世界、沙盒、地区、世界地图、旅行、hex crawl、point crawl、区域设计、world engine。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "world"
---

# Sandbox World Engine

世界不是背景百科，而是一组相互连接、会变化、能被玩家利用的空间与压力。

## 基础原则

- 地理影响选择：距离、通路、边界、资源、季节和危险都应改变“去哪里”的意义。
- 每个区域至少有一个独立运转的压力。
- 地点允许重复进入，并在访问之间发生变化。
- 远处只需要轮廓；细节随玩家靠近再生成。
- 世界不应处处只为 PC 服务。让经济、宗教、生态、政治、犯罪和战争有自己的因果。

## 五层世界结构

1. **Campaign Map**：大尺度势力与地理关系。
2. **Region**：可形成数个 session 的活动区。
3. **Hub**：城镇、港口、营地、据点等反复回访地点。
4. **Site**：遗迹、庄园、矿坑、神殿、地城等具体冒险空间。
5. **Route/Edge**：连接节点的道路、河流、航线、山口、传送网络。

不要把地图只做成“点”。边本身也可以有成本、风险和机会。

## Region Card

每个地区至少记录：

```markdown
# Region: [Name]
Identity: 一句话说明这里为何不同
Current Pressure: 当前正在改变什么
Major Factions: 2–4 个
Resources/Leverage: 玩家为什么会想来
Dangers: 具体危险，不写纯氛围
Secrets: GM 真相
Visible Signals: 玩家现在能观察到什么
Leads: 3+ 条通向不同内容的线索/委托/传闻
Neighbors: 相邻地区与旅行条件
If Ignored: 经过一个明确时间单位后会出现的变化
Revisit Change: 玩家离开再回来时，什么最可能不同
```

## Travel Edge

连接两个节点时至少考虑：

- 时间成本；
- 资源/费用；
- 风险类型；
- 谁控制通路；
- 可以绕行的替代路线；
- 路上能观察到的世界变化；
- 季节或 clock 是否改变可达性。

旅行遭遇优先承担“展示世界状态 / 提供机会 / 施加代价 / 暴露线索”的功能，而不是随机填时间。

## 同心圆准备

对当前位置以外的世界使用三档细节：

- **Near**：可以今晚跑，包含人物、地点、压力、线索；
- **Next**：一页摘要 + 关键节点；
- **Far**：一段身份描述 + 一个压力 + 一个传闻。

只有玩家真的向 Far 区域移动，才继续扩展。

## 可重入设计

Hub / Site 不应“一次清空后永久无用”。为重要地点维护：

- 当前控制者；
- 空缺资源；
- 未解决秘密；
- 可建立关系；
- 可升级或被破坏的基础设施；
- 派系争夺；
- 再访时的变更触发器。

## 世界扩展时的防膨胀规则

新增地区前先问：

1. 它是否提供新的选择类型，而不只是换皮？
2. 它是否连接现有派系/资源/压力？
3. 玩家是否有至少一个可理解的理由前往？
4. 如果永远不去，它是否仍会影响世界？

如果四项都是否，先不要扩展。

## 与其他 Skill 协作

- 宏观地点结构 → 本 Skill；详细可探索 Site → `location-site-designer`。
- 地区内派系行动 → `faction-simulator`。
- 活跃冲突 → `situation-designer`。
- 旅行或地点中的即时遭遇 → `encounter-situation-designer`。
- 任何永久变化 → `campaign-state-keeper`。
