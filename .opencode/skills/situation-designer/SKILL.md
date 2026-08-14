---
name: situation-designer
description: >-
  用“局势而非剧情线”构建开放式 TRPG 的基本叙事单元：压力、演员目标、触发条件、钟表、可观察信号、多入口、多结果与 If-Ignored。用于阴谋、冲突、灾害、政治事件、个人麻烦、地区危机和长期线程。触发词：局势、剧情怎么开放、冲突、事件线、活跃线程、situation、pressure、sandbox scenario。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "scenario"
---

# Situation Designer

Situation 是开放世界战役的“基本剧情单位”。它不是场景，不是章节，也不是预先写好的故事摘要。

它回答：**现在什么是真的？谁想要什么？什么正在变化？玩家能从哪里介入？如果没人管会怎样？**

## Situation 模板

```markdown
# [Situation Name]
Lifecycle: active | dormant | resolved
Core Tension: 一句话
Actors & Wants:
Current State:
Pressure / Clock:
Trigger Conditions:
Visible Signals:
Entry Points: 3+ 个不同入口
Player-Relevant Stakes: 玩家为什么可能在乎；不假定一定在乎
If Ignored:
Possible Outcomes: 3+ 个
Links: factions / NPCs / locations / mysteries / quests
```

## Lifecycle

- `active`：压力已经在推进；
- `dormant`：等待明确触发器；
- `resolved`：主要压力已结算，但后果可继续存在。

不要把“暂时没人关注”误判为 resolved。

## Clock

除非第一次接触就会立刻解决，否则给长期 situation 一个 4 或 6 格 clock。Clock 必须写：

- advance trigger；
- 中间阈值的可观察变化；
- fill consequence。

Clock 只表示世界进程，不表示“玩家还有 X 回合必须接任务”。

## Entry Points

一个重要 situation 至少准备三种发现/介入入口，例如：

- faction 主动接触；
- 现场可观察异常；
- rumor；
- NPC 私人请求；
- 价格/法律/交通发生变化；
- 玩家自己的目标碰到这个压力。

入口应分布在不同节点，不要三条线索都藏在同一间房。

## Possible Outcomes

写 3+ 个可成立结果，且**任何结果都不能要求玩家必须先做某个指定动作**。

结果可以来自：

- 玩家站队；
- 玩家拖延；
- 派系自己胜负；
- 第三方介入；
- 资源被破坏/转移；
- 真相公开；
- situation 变形为另一个问题。

不要写“成功结局 / 失败结局”二分法。沙盒结果更像世界状态变更。

## Hidden Conclusion

如果 situation 有一个玩家必须理解的隐藏真相，加载 `mystery-clue-engine`，为关键 revelation 建冗余线索。

## If-Ignored 测试

差：`紧张局势升级。`

好：`第 7 日，码头工会封锁北港；粮价翻倍，王室把两队士兵调入旧城区。`

必须能在桌上“看见”。

## 反铁路检查

完成前检查：

- 把 PC 从文档里删掉，世界是否仍会动？
- 玩家拒绝第一个入口，是否还有别的入口？
- 玩家直接杀掉/拉拢一个关键 NPC，situation 是否仍有状态逻辑？
- 玩家提前猜到真相，是否仍能推进而不是强行否认？
- 所有结果是否都写成“玩家去某处然后……”？如果是，重写。
