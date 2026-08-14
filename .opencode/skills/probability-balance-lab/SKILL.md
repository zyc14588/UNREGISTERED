---
name: probability-balance-lab
description: >-
  为自制 TRPG 计算并审查随机机制的精确概率、分布、期望值、方差、成功层级、骰池曲线、优势劣势、爆骰/重掷效果与参数敏感度。用于比较候选判定机制、设定目标成功率、检查数值成长与平衡假设。触发词：概率、成功率、期望值、骰池、2d6、d20、曲线、爆骰、重掷、balance math、probability。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "rules-math"
---

# Probability & Balance Lab

这里负责**算准**，不负责假装数学能替代 playtest。

## 两层结论必须分开

- **Math Fact**：精确概率、期望值、分布、敏感度。
- **Design Target**：你希望这种概率在桌上产生什么体验。

不要把“70% 应该感觉刚好”写成数学事实。

## 工作流

1. 明确随机机制和参数范围。
2. 计算基线分布。
3. 计算角色能力最低/常见/最高水平。
4. 计算常见难度档。
5. 做一阶敏感度：属性 +1、骰池 +1、优势、重掷、资源消费各改变多少？
6. 检查极端与叠加。
7. 给出 playtest 需要验证的体验假设。

## 常用检查

- 成功概率是否在角色成长后迅速触顶？
- 难度 +1 是否比能力 +1 影响大得多？
- crit 是否随着骰池大小产生非线性爆炸？
- 多次攻击/多次检定是否因为独立重复显著提高总成功率？
- 重掷、优势、保底资源是否形成远超表面数值的增益？
- 高防御/高减伤是否导致战斗时间指数式变长？

## Bundled Script

可运行：

```bash
python .opencode/skills/probability-balance-lab/scripts/dice_prob.py --help
```

支持：

- `sum`：NdS + bonus ≥ target；
- `pool`：骰池中至少 K 个骰达到 success-at；
- `highest`：骰池取最高，统计 fail / partial / full。

脚本结果是数学依据；最终数值仍需 `playtest-rules-auditor` 验证。

## 输出

优先给一张小表：参数 → 成功率/期望值 → 设计含义。若用户正在做机制决策，再指出最敏感的 1–3 个参数，避免无意义的几十行数表。
