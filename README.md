# 幸存者 - Vampire Survivors 网页版

一个纯前端实现的类 Vampire Survivors 游戏，使用 TypeScript + Vite + Canvas 2D 开发。

## 游戏特性

- 🎮 角色自动攻击，玩家只需控制移动走位
- ⚔️ 5种不同武器：基础枪、环形弹幕、轨道球、闪电链、地刺
- 👾 3种敌人类型：小怪、胖怪、冲刺怪，各有特色AI
- ⬆️ 升级系统：每次升级从3个随机选项中选择强化
- 💎 经验宝石自动吸取，吸取范围可升级
- 📊 空间分区碰撞检测优化，支持同屏几百实体
- 🎨 像素风视觉效果：子弹拖尾、经验闪烁、伤害数字

## 操作方式

| 按键 | 功能 |
|------|------|
| `W` / `↑` | 向上移动 |
| `S` / `↓` | 向下移动 |
| `A` / `←` | 向左移动 |
| `D` / `→` | 向右移动 |
| `1` `2` `3` | 升级时选择对应选项 |
| `空格` | 暂停 / 继续游戏 |
| `R` | 游戏结束后重新开始 |

支持八方向移动（同时按下两个方向键）。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

启动后访问 http://localhost:5173 即可开始游戏。

## 游戏玩法

1. 角色会自动向最近的敌人发射子弹
2. 用 WASD 或方向键控制角色移动，躲避敌人
3. 击杀敌人掉落绿色经验宝石，靠近会自动吸取
4. 经验条满后触发升级，暂停游戏并显示3个随机选项
5. 选择新武器或强化现有武器/被动能力
6. 随着时间推移，敌人会越来越多、越来越强
7. 血量归零游戏结束，存活时间越长分数越高

## 武器配置格式

武器配置位于 `src/config/weapons.json`，修改后可直接改变游戏平衡。

### 通用字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识 |
| `name` | string | 武器名称 |
| `description` | string | 武器描述 |
| `type` | string | 武器类型：`gun` / `ring` / `orb` / `lightning` / `spike` |
| `damage` | number | 基础伤害 |
| `cooldown` | number | 冷却时间（秒） |
| `maxLevel` | number | 最大等级 |
| `upgrades` | array | 各等级升级属性 |

### 各类型特有字段

**枪 (gun)**
- `bulletSpeed`: 子弹速度
- `pierce`: 穿透数量
- `range`: 攻击范围

**环形弹幕 (ring)**
- `bulletSpeed`: 子弹速度
- `pierce`: 穿透数量
- `range`: 攻击范围
- `directions`: 发射方向数量

**轨道球 (orb)**
- `orbCount`: 球体数量
- `orbRadius`: 旋转半径
- `orbSpeed`: 旋转速度

**闪电链 (lightning)**
- `chainCount`: 跳跃次数
- `range`: 初始攻击范围
- `jumpRange`: 跳跃范围

**地刺 (spike)**
- `radius`: 伤害半径

### 升级配置示例

```json
{
  "upgrades": [
    { "level": 2, "damage": 15, "cooldown": 0.45 },
    { "level": 3, "damage": 20, "pierce": 2 }
  ]
}
```

每个升级项只需指定变化的属性。

## 敌人配置格式

敌人配置位于 `src/config/enemies.json`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识 |
| `name` | string | 敌人名称 |
| `color` | string | 颜色（HEX格式） |
| `size` | number | 半径大小 |
| `health` | number | 基础生命值 |
| `speed` | number | 移动速度 |
| `damage` | number | 碰撞伤害 |
| `expValue` | number | 死亡掉落经验值 |
| `spawnWeight` | number | 生成权重 |
| `startTime` | number | 开始出现的时间（秒） |
| `dashSpeed` | number | 冲刺速度（冲刺怪专用） |
| `dashDuration` | number | 冲刺持续时间（冲刺怪专用） |
| `dashCooldown` | number | 冲刺冷却时间（冲刺怪专用） |

## 升级选项池配置

升级选项配置位于 `src/config/upgrades.json`。

### 被动升级字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识 |
| `name` | string | 名称 |
| `description` | string | 描述 |
| `effect` | string | 效果类型 |
| `value` | number | 数值 |
| `maxLevel` | number | 最大等级 |

### 支持的被动效果

| 效果类型 | 说明 | 叠加方式 |
|----------|------|----------|
| `moveSpeed` | 移动速度 | 百分比加成 |
| `maxHealth` | 最大生命值 | 固定值加成 |
| `pickupRange` | 经验吸取范围 | 固定值加成 |
| `healRate` | 自然回血 | 固定值加成 |
| `damageBonus` | 伤害加成 | 百分比加成 |
| `cooldownReduction` | 冷却缩减 | 百分比加成 |

## 添加新武器

1. 在 `src/config/weapons.json` 添加武器配置
2. 在 `src/types.ts` 的 `WeaponConfig` 中添加需要的新字段（如果有）
3. 在 `src/weaponSystem.ts` 的 `updateWeapon` 中添加新的 `case` 处理
4. 在 `src/weaponSystem.ts` 中实现对应的 `fireXxx` 方法
5. 在 `src/renderer.ts` 中添加对应的渲染逻辑（如果需要新的特效）
6. 在 `src/config/upgrades.json` 的 `weapons` 数组中添加武器ID

## 添加新敌人类型

1. 在 `src/config/enemies.json` 添加敌人配置
2. 如果有特殊AI逻辑，在 `src/enemySystem.ts` 的 `updateEnemy` 中添加处理
3. 如果需要新的渲染效果，在 `src/renderer.ts` 的 `drawEnemies` 中添加

## 项目结构

```
src/
├── config/
│   ├── weapons.json      # 武器配置
│   ├── enemies.json      # 敌人配置
│   └── upgrades.json     # 升级选项池
├── types.ts              # TypeScript 类型定义
├── utils.ts              # 工具函数
├── input.ts              # 输入系统
├── camera.ts             # 相机系统
├── spatialGrid.ts        # 空间分区网格
├── entityFactory.ts      # 实体工厂
├── weaponSystem.ts       # 武器系统
├── enemySystem.ts        # 敌人生成与AI
├── upgradeSystem.ts      # 升级系统
├── collisionSystem.ts    # 碰撞检测系统
├── renderer.ts           # 渲染系统
├── Game.ts               # 主游戏类
└── main.ts               # 入口文件
```

## 性能优化

- **空间分区**：使用 100x100 的网格进行空间分区，碰撞检测只查询相邻格子，避免 O(n²) 暴力检测
- **实体限制**：最多同时存在 1000 个实体，超出时自动清理最远的敌人
- **可见性裁剪**：只渲染相机视野内的实体
- **对象复用**：尽量避免频繁创建销毁对象，使用 Set 跟踪已命中目标

## 核心机制说明

### 升级暂停

当经验条满触发升级时，`gameState.levelUp` 和 `gameState.paused` 同时设为 `true`，此时 `update` 函数会直接返回，只处理升级选择输入，确保游戏逻辑完全冻结。

### 碰撞检测

使用圆形碰撞检测，所有实体都有 `radius` 字段。碰撞检测包括：
- 子弹 vs 敌人（考虑穿透）
- 轨道球 vs 敌人（有冷却防止连续伤害）
- 地刺 vs 敌人（只命中一次）
- 敌人 vs 玩家（无敌时间防止连续掉血）
- 经验宝石 vs 玩家（圆形范围检测）

### 难度曲线

- 生成间隔：从 2 秒逐渐减少到 0.3 秒
- 每次生成数量：从 1 个逐渐增加到 5 个
- 敌人血量：随时间线性增加 `1 + time/60` 倍
- 敌人类型：0秒出现小怪，15秒出现胖怪，30秒出现冲刺怪

## License

MIT
