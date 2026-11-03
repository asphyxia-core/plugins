# xif@asphyxia — ポラリスコード (XIF) 本地服务器插件

[English](README.md)

为 `XIF:J:A:A:2025070800`（ポラリスコード / Polaris Chord）提供的 Asphyxia CORE 插件，
让街机端在没有官方服务器的情况下可离线游玩。

> **作者：花散kasan · 制作过程使用了 AI 辅助 · 仅供学习与参考，请于下载后 24 小时内删除。**
> 使用前请完整阅读[《免责声明》](DISCLAIMER.zh-CN.md)。

## 安装

1. 把本仓库克隆 / 下载到 CORE 的插件目录，文件夹名保持 `xif@asphyxia`：

   ```
   <AsphyxiaCORE>/plugins/xif@asphyxia/
   ```

2. （强烈建议）按 [`client-patches/README.zh-CN.md`](client-patches/README.zh-CN.md) 给**游戏本体**打三个补丁——
   不打的话游戏启动会黑屏（见下文「游戏端补丁」）；
3. 启动 CORE，首次读卡登录会自动建档。

## 目录结构

```
xif@asphyxia/           ← 仓库根 = 插件目录
├─ index.ts              只做注册：GameCode / Contributor / Config / WebUIEvent / Route / Unhandled
├─ handlers/             各协议模块的处理器（EPR）
│  ├─ common.ts          常量、日志、配置读取、XRPC 节点取值、路由包装
│  ├─ store.ts           玩家存档读写、设置项构建、持久道具表
│  ├─ playerdata.ts      GetPlayDataResponse 数据体（usr.get 与 gacha 共用）
│  ├─ music.ts           曲库 / 谱面解锁 / mst_patch
│  ├─ character.ts       角色与角色卡实例
│  ├─ mst.ts             mst.get_common
│  ├─ usr.ts             usr.*（登录、存档、成绩）
│  ├─ gacha.ts           gacha.*（三步抽卡）
│  ├─ pcb.ts             pcb.* / local.* / message.get
│  └─ webui.ts           WebUI 控制台事件
├─ webui/                插件 WebUI 自定义页面（xif.pug + js）
├─ data/                 可由外部脚本重新生成的数据文件
├─ client-patches/       游戏本体补丁（可选，作用于游戏文件，不属于插件运行时）
├─ docs/                 协议逆向与排查记录
├─ DISCLAIMER.md         免责声明（英文）
├─ DISCLAIMER.zh-CN.md   免责声明（中文）
└─ README.md             这份说明（CORE WebUI 里也会显示）
```

> `cardmng.*`（读卡）由 **CORE 内建**的 `src/eamuse/Core/CardManager.ts` 处理，
> 插件里再注册也不会被调用，因此不在本插件实现。

## 已实现

| 模块 | 内容 |
|---|---|
| **登录 / 玩家数据** | `usr.get` 全节点下发（档案、play_info、设置、道具、卡、称号、计数、登录奖励、PA 技能） |
| **主数据** | `mst.get_common` 返回本机真实歌单（曲目 + 谱面）、活动、商店；全部谱面解锁 |
| **剧情** | Story 七篇可读，剧情状态由 `usr_count` 的 `Story.CharacterStoryId` 标记驱动 |
| **商店** | 商品列表 + 购买；购买结果通过 `usr.save` 的 `usr_item_change_log` 落库，跨局保留 |
| **Hunt（抽卡）** | 三步协议 `begin_gacha` / `draw_gacha` / `end_gacha`；**抽到的道具与角色卡当场落库**，`player_data` 与 `usr.get` 同构 |
| **成绩** | `usr.save_musicscore` 记录每首曲目各难度的 rate / score，登录时回放 |
| **存档** | `usr.save` 全量落库：档案 / 设置 / 道具变化 / 称号持有 / 角色卡实例 / 角色亲密度 / 登录奖励 / 卡组（含装备的姿势·边框）/ 称号铭牌 / 隐私 / 排序筛选 / 谱面任务 / PA 技能 / action count，下次登录合并回放（静态基线 ∪ 存档，存档优先） |
| **主数据补丁** | `mst_patch` 支持下发 CSV 补丁（`mode = "csv"`），可在游戏导入主表之后补写行 —— 并可用它绕过 `FilterDatabase` 把 `Version > asset_version` 的行救回来 |

> 存档节点清单以「游戏真正上报的字段」为准（把 `usr.save` 的请求体打出来数顶层节点即可）。
> **存与回放要成对**：只写进 `REPLAY_KEYS` 而没进 `RAW_KEYS` 的节点，等于「每次都想回放，
> 但从来没存过」；反过来只落库不回放，等于「存了但游戏永远看不到」——
> 前者坑了称号/登录奖励，后者坑了铭牌/隐私/排序/谱面任务（「更换的东西下一局被重置」）。

## 重要：存档只在「Continue」时发生

游戏的存档请求（`usr.save`）**只在打完一首歌、进入结算后的 Continue 场景（以及退店）时发出**
（`game.scene.continue` 的 `SavePlayDataStepRunner`，在 Continue 界面显示前就已执行）。

> **在结算画面直接 Alt+F4 / 关窗口 = 这一局的购买与获得全部丢失。**
> 想保存，就必须走到 Continue 画面（或正常退店）。

## 配置项（WebUI → 本插件设置）

| 键 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `debug_trace` | boolean | `true` | 是否把每个 XRPC 请求/响应写入 `xrpc.log`，排查协议问题用 |
| `ticket_count` | integer | `999` | 每次登录发放的 `ticket.event.*` 数量（联动商店货币），999 ≈ 无限 |
| `log_limit_kb` | integer | `1024` | `xrpc.log` 大小上限（KB），0 = 不限；需重启 CORE |

## 数据文件（`data/`）

| 文件 | 作用 |
|---|---|
| `musics.json` | 曲库（由本机 chart 资源生成） |
| `music.json` | 选曲列表开关 `{ "enabled": bool, "limit": n }` |
| `unlock.json` | 谱面解锁范围，`limit>0` 只给前 N 个谱面 |
| `patch.json` | `mst_patch` 形态。默认 `{"mode":"omit"}`；改成 `{"mode":"csv"}` 会下发 `mst_patch.csv` |
| `mst_patch.csv` | 主数据补丁（`py tools/gen_mst_patch.py` 生成，默认含 `CharacterCardMaster` 113 行） |
| `gacha.json` | 扭蛋活动与卡池 |
| `characters.json` | 角色与**静态基线**角色卡实例（存档里的卡会与它合并，存档优先） |
| `login_bonus.json` | 登录奖励进度的**基线**（有存档时用存档） |
| `name_titles.json` | 称号的**基线**持有列表（与存档取并集） |

## 已知限制

1. **卡一览少 2 张（已修，`mst_patch` 已在用）**
   `CharacterCardMaster` 里 113 行**本来都在**（不是此前以为的「只导入 1 行」——那是个错误的
   探针结论）。少的是 `00080001` / `00080004` 两张：它们的 `Version=9999999`，超过
   `assetVersion=37`，被 `ContentsRepository` 的 `FilterDatabase` 用
   `DELETE FROM 'CharacterCardMaster' WHERE Version > 37` 删掉了。
   客户端查不到卡定义就把这两张卡的实例和道具静默丢弃，抽到它们还会弹 301。
   **修法**：`mst_patch` 在 `FilterDatabase` **之前**执行，把这两行的 `Version` 压到 37
   就能让它们活下来（`tools/gen_mst_patch.py` 默认这么做，`--version-cap` 可调）。

2. **抽卡基本都抽到重复卡**
   `data/characters.json` 是静态基线，一次把 113 张卡全发给玩家，而 `gacha.json` 的池子
   也是这 113 张 —— 所以抽到的基本都是已拥有的卡（会在存档里多出一个卡实例，卡一览里显示
   为重复）。想要「收集感」，把 `characters.json` 的 `cards` 缩成起始卡组即可，但
   **必须至少保留 1 张 Contenter + 4 张 SupportSnap**，否则游戏端 `RepairCharacterDeck`
   会抛 `ArgumentException: least 1 contenter required` → 登录直接失败。

3. **融合卡（Contenter）扭蛋可能 301**
   转换结果时强制要求 `CharacterModelMaster` 数据。这张表是否也缺行还没验证；
   `py tools\gen_mst_patch.py --tables CharacterCardMaster CharacterModelMaster`
   可以把两张表塞进同一个补丁再试。

4. **票券消耗不生效**
   持久道具表回放时只应用正值（`n > 0`），所以 `ticket.event.*` 的消耗被忽略，相当于无限票。

## 主数据补丁（`mst_patch`）

游戏每次启动都会：

```
RestoreDatabase()          ← 从 bundle 的 CSV 重新导入主表
ApplyPatch(csv)            ← 服务端 mst_patch 里下发的 CSV，按主键 UPDATE / INSERT
FilterDatabase(37)         ← DELETE FROM '<表>' WHERE Version > 37   ← 关键
```

补丁是纯文本 CSV，格式：

```
<表名>            ← 必须等于 C# 类型名，如 CharacterCardMaster
<列名,列名,...>    ← 必须是该表的 ColumnName（含继承来的 Version），主键列不能少
<值,值,...>
<空行>            ← 这张表结束
```

**补丁里的 `Version` 必须 <= 37**，否则写入之后立刻被第三步的 `FilterDatabase` 删掉
（`CharacterCardMaster` 里那两张【チアフルコード】的卡就是这样被删的）。
`tools/gen_mst_patch.py` 的 `clamp_version()` 默认把 `Version > 37` 的行压到 37。

启用：`data/patch.json` 改成 `{ "mode": "csv", "version": "2025070800" }`（不用重启 CORE）。
成功与否看游戏目录 `game/dev/raw/log/output_log.txt` 里有没有
`PATCH: Update CharacterCardMaster …Version=37`；失败也只会记一条异常，状态与现在一致，
改回 `omit` 即可。

## 游戏端补丁（`client-patches/`）

游戏本体自身有几个缺陷必须靠客户端补丁修复，**这些补丁无法集成进插件**：

- Asphyxia CORE 是服务端，可以跑在与游戏不同的机器上（一台服务器带多台机框是常见部署），
  插件在架构上接触不到玩家电脑里的游戏文件；
- 官方插件契约（`R.Route` / `R.Config` / WebUI / `IO`）也没有任何改动客户端文件的入口。

| 补丁 | 不加的后果 | 必要性 |
|---|---|---|
| 更新器异常屏蔽 | **启动黑屏**（本地 master 表导入损坏 → 内容更新器必然部分失败 → 原版逻辑抛异常） | 强烈建议 |
| 曲目全解禁 | 选曲列表缺 227 首 Private / 限时曲目 | 建议 |
| 音频共享模式 | 部分声卡 / 蓝牙耳机无声 | 视设备 |

用法（在**游戏所在电脑**上，详见 [`client-patches/README.zh-CN.md`](client-patches/README.zh-CN.md)）：

```
pip install dnfile dncil
py client-patches/patch_all.py          # 幂等，可反复运行
py client-patches/patch_all.py --check  # 查看状态
py client-patches/patch_all.py --revert # 还原（自动生成 .orig 备份）
```

## 协议速查

元素名与类型来自游戏本体 `game/svm_data/managed/game.common.infra.dll` 的
`System.Xml.Serialization` 特性与 `XrpcInt / XrpcString` 字段声明：

| 类型标签 | 含义 |
| --- | --- |
| `s32` / `s16` / `s64` / `u64` | 整数 |
| `str` | 字符串 |
| `bool` | 布尔 |

**注意**：`XmlSerializer` 严格区分大小写，且节点名以游戏端 `[XmlElement]` 特性为准
（例如 `UsrCharacterCard` 的字段是 `index` / `item_id` / `created_at`，不是 PascalCase）。
写错大小写不会报错，只会让数据**静默丢失**。

## 排查

- `xrpc.log`：每个请求的 JSON / XML（由 `debug_trace` 控制）
- 游戏目录 `log.txt`：spice2x 捕获的 Unity 日志，**只有 Warning 级会落盘**（`W:UNITY`）
- 完整的协议逆向与排查记录见 [`docs/`](docs/)：
  - `docs/抽卡机制逆向.md` —— Hunt 三步协议、演出、错误码与全部实战坑
  - `docs/数据不保存排查报告.md` —— 存档链路、触发时机、已修复问题清单
    （**第九章**是第三轮复核，找到了「买了不保存 / 称号不保存 / 抽到的卡不保存」的真正原因；
    **第十章**是 `mst_patch` 这条线）
