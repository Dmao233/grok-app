# Grok App 项目瘦身审计 — 2026-08-24

> 状态:**只读审计完成,未修改任何代码**。等待另一进程交接(最终集成分支 SHA + 工作树 clean + 全量测试结果)后,按本文档实施。
> 本文件暂存于 /tmp,瘦身 worktree(`codex/codebase-slimming-20260824`)建立后作为首个提交落到 `docs/plans/CODEBASE-SLIMMING-20260824.md`。

## 基线

| 项 | 值 |
|---|---|
| 审计基线 | `codex/ui-round2-integration-20260823` @ `e1068f4c`(工作树 clean) |
| 本地 main | `665987ca`,`main...集成分支 = 0/68`,可 fast-forward |
| origin/main | `60195551`(更旧,不使用) |
| 代码规模 | src ≈ 54.1 万行;`src/app/AppWorkbench.tsx` 24,641 行;CSS 60 文件 ≈ 4.1 万行 |
| 质量门禁 | `check-code-quality-gates.py --mode final`:App.tsx ≤6000、≥1k 行文件 ≤80(现 43+)、CSS 最大 ≤10000 等 |

方法:8 个只读探查代理(UI 控件 / 设置 / 主题壁纸 / pane chrome / 聊天输入 / hooks / Rust / 测试资产)+ 主线独立交叉核验。**凡标 [已复核] 的项,调用点结论由主线用 rg 独立复现过**;[抽查] 表示主线抽样验证过代表样本。

## 结论速览

| 类别 | 净变化(估) | 项数 |
|---|---|---|
| 死代码直接删除(执行) | ≈ **−10,900 行 / −40+ 文件 / −5 npm 依赖** | 24 |
| 收敛类(执行,先测后迁) | ≈ −700 ~ −1,200 行 | 8 |
| 暂缓(需产品/视觉拍板或单独立项) | 潜在 −2,000+ | 10 |
| 不应改(有意分层/框架语义强制) | 0 | 9 |

---

## 模块 1:UI 基础控件与全局死组件(依赖清理随批)

### 1.1 [已复核] `src/components/ui/` 8 个 AI-Elements 死文件 ≈ −1,000 行
- 文件/行数:`button.tsx` 55、`collapsible.tsx` 34、`conversation.tsx` 135、`marker.tsx` 83、`message.tsx` 89、`message-response.tsx` 360、`reasoning.tsx` 226、`shimmer.tsx` 18
- 无用内容:未接线的 AI-Elements 脚手架;产品消息路径是 `lobe-chat/`(`ConversationThread` + `MarkdownChat` / `Thinking`);`message-response.tsx:2-4` 自注未接线
- 调用点:`rg "ui/<name>[\"']" src` 全部 0 外部引用;`collapsible` 仅被同样死掉的 `reasoning.tsx` 引用
- 推荐:直接删除 8 文件;保留 `SegmentedControl`(11 文件调用)、`tooltip`(38)、`spinner`(5)
- 风险:低;删前再全局 rg 一次防未入库分支
- 验证:`pnpm typecheck`;`pnpm test -- src/components/ui`
- 结论:**执行**

### 1.2 [已复核] 5 个独占 npm 依赖随 1.1 移除
- `package.json:59,60,76,90,93`:`@radix-ui/react-collapsible`、`@radix-ui/react-slot`、`class-variance-authority`、`streamdown`、`use-stick-to-bottom`
- 调用点:各依赖唯一 import 均在 1.1 死文件内(rg 验证);`hooks/useStickToBottom.ts` 是自研实现,仅注释提到包名
- 验证:`pnpm install` 后 `pnpm build:ui` + `pnpm test -- src/main.bootCss.test.ts`
- 结论:**执行**(与 1.1 同一工作单元)

### 1.3 [已复核] 全局死组件 7 个 ≈ −2,237 行
| 文件 | 行数 | 备注 |
|---|---|---|
| `ComposerShell.tsx` | 19 | 已被 `ComposerDraftChrome` 取代;gates 脚本是 OR 条件(`useComposerController` 在用),删除不破门禁 |
| `LspToolsPanel.tsx` | 484 | 整文件死(推翻"改造其 Toggle 复用 UiCheck"的子建议) |
| `EffortPanel.tsx` | 216 | |
| `ModelAuxPanel.tsx` | 450 | |
| `AgentsPersonasConsolePanel.tsx` | 678 | 配对 `lib/agentsPersonasConsole.ts` 删后复查是否变孤儿 |
| `SkillsTaskPickerPanel.tsx` | 354 | |
| `SidebarSessionBusy.tsx` | 36 | 连带 `useIsSessionBusy`(`useSessionLiveMap.ts:99-108`,唯一消费者即此死组件) |
- 调用点:每个组件名全仓 rg = 仅自身文件(静态/动态 import 均需名字或路径,零命中即死)
- 级联:删除后逐个复查其独占 CSS 类与配对 lib 是否变孤儿,同一工作单元清掉
- 验证:`pnpm typecheck`、`pnpm build:ui`、全量 `pnpm test`
- 结论:**执行**

### 1.4 [已复核] 死 hook 桶与遗留桥接 ≈ −33 行
- `hooks/useSkinCatalog.ts`(5 行 re-export)、`hooks/useSkinPresets.ts`(1 行,把组件伪装成 hook)、`i18n/zh-tw.ts`(2 行,真实目录是 `messages/zh-TW/`)、`components/settings/index.ts`(25 行 barrel,`from "@/components/settings"` 全仓 0;删前再查相对路径拼写)
- 结论:**执行**

### 1.5 [已复核] `icons.tsx` 零调用别名 −2 行
- `icons.tsx:267` `IconShare = wrap(TbLink)`、`:379` `IconCart = wrap(TbBolt)`;全仓仅定义
- 结论:**执行**

### 1.6 [子代理证据/抽查] hooks 死导出 ≈ −80 行
- `useSessionShell.ts:22-28` `useSessionShellMeta`;`useSessionLiveMap.ts:48-55,74-78` `useLiveSessionSnapshot*`;`useSessionRuntimeRefs.ts:47-50` `resetSessionRuntimeStoresForTests`;`useSessionRuntime.ts:147,191-212` 返回但零消费的 `liveMapBusyCount`、`clearStopLatch`(AppWorkbench 解构未取)
- 主线已复核各符号非测试引用 = 仅定义
- 验证:`pnpm test -- src/hooks/useSessionLiveMap.test.ts` 等
- 结论:**执行**

### 1.7 [已复核] lib 孤儿模块第一批(实现+测试成对删)≈ −2,484 行
| 模块 | 行数(实现+测试) | 证据 |
|---|---|---|
| `agentSubagents` | 59+68 | Rust `agent_subagents.rs` 是生产路径,TS 为死镜像 |
| `modelMenuSearch` | 21+65 | 被 `composerModelGroups.filterComposerModelGroups` 取代 |
| `serveRemote` | 121+107 | 被 `serveConnect` 取代(删前 diff mask/URL 函数体) |
| `cliSessionsSearchPro` | 587+416 | 产品用非 Pro 版 `cliSessionsFilter/cliSessionsSearch` |
| `compactApplyHonesty` | 292+332 | 全仓仅 CHANGELOG 提及 |
| `assistantAnswerSplit` | 246+170 | 全仓零引用 |
- 调用点:主线逐个复核 `from "@/lib/<name>"` 非测试引用 = 0
- 风险:可能是有意 spec-first 预埋 → 每个删除 commit 单列,便于回滚
- 结论:**执行**

### 1.8 [已复核] `withAppearanceWrite` 死导出 −8 行
- `lib/appearanceWriteLock.ts:54-61`;生产只用 `acquireAppearanceWrite`(`SettingsPage.tsx:928`、`SkinShareProvider.tsx:217`)
- 验证:`pnpm test -- src/lib/appearanceWriteLock.test.ts`
- 结论:**执行**

---

## 模块 2:设置系统收敛

### 2.1 [子代理证据] `SettingsStackRow` 收敛 143× 手写行结构 ≈ −400~−800 行
- 范式:`GeneralSection.tsx:288-316,418-460` 等;`rg -c 'settings-row--stack'` 合计 143(General 26 / Runtime 18 / RemoteImChannel 17 / LeaderServe 14…)
- shared.tsx 无行容器;新增最小 `SettingsStackRow`(`label/desc?/control/stack?`),分批迁移(先 General+Runtime)
- 风险:中(DOM 层级变化影响 CSS 与设置搜索高亮);不强改 desc→tip
- 验证:相关 section 单测 + 目视 general/runtime
- 结论:**执行**(分批)

### 2.2 [子代理证据] `AccountSection` 复用 `SettingsTabStrip` ≈ −25~−40 行
- `AccountSection.tsx:50-88` 手写与 `shared.tsx:169-203` 同构 tab;扩展 `SettingsTabStrip` 可选 `hint`
- 验证:`#/settings/account` 三 tab + 深链
- 结论:**执行**

### 2.3 [子代理证据] 归档框选/壁纸状态从 SettingsPage 下沉 ≈ 净 −30~−70 行
- 归档:`SettingsPage.tsx:530-535,775,1146-1329` → `ArchivedSection` 或 `useArchivedSelection`
- 壁纸:`SettingsPage.tsx:536-543,907-946` → `AppearanceSection` 或 `useWallpaperSettings`
- 风险:中(指针捕获、`acquireAppearanceWrite` 时序)
- 结论:**执行**

### 2.4 [子代理证据] `SettingsLabelWithTip` 旁路收敛 ≈ −30~−80 行
- 手写 tip:`AppearanceSection.tsx:574-593`、`AccountPanel.tsx:931-941`(与 `shared.tsx:208-237` 同构)
- 结论:**执行**

### 2.5 ProvidersPanel 手写 switch(2 处 role="switch")
- `ProvidersPanel.tsx:1494-1518,1601-1629`;视觉是"标签+轨道"变体,与 `.ext-switch` 不同
- 结论:**暂缓**(先定视觉:复用 UiSwitch 还是保留 labeled 变体;禁止出现第三份)

### 2.6 settings.part5/6.css 域污染(≈1,500 行错域寄存)
- `settings.part6.css` 仅 1 处 `settings-` 前缀,几乎全是 `.md-body/.chat-find/.plan-bar`;part5 有两段 `.main` 拆块
- **删除即炸聊天 UI**,只能搬家 → 单独 CSS 域迁移工作单元,总行数近 0
- 结论:**暂缓**(单独立项,不算瘦身删除)

---

## 模块 3:主题/壁纸 tokens 与重复覆盖

### 3.1 [已复核] `skins.css` 永不匹配的 `.platform-*` 后代选择器 −6 行
- `skins.css:229-231,254-256`:`html[data-wallpaper="1"] .platform-win .settings-page__nav` 等;`platform-*` 类加在 `documentElement` 本身(`AppWorkbench.tsx:3157-3160`),后代形式永不匹配;正确复合写法参照 `skins.css:262-263`
- 首条无 platform 的选择器仍生效,删除无视觉变化(浅/深主题同判)
- 风险:`skins.streamPerf.test.ts` 断言 skins.css 字符串,删行前核对断言目标
- 验证:`pnpm exec vitest run src/styles/skins.streamPerf.test.ts` + 壁纸下看设置导航
- 结论:**执行**

### 3.2 [子代理证据/抽查] tokens.css 无引用变量 ≈ −14~−20 行
- `--sidebar-edge-line`、`--menu-surface`、`--menu-surface-solid`、`--menu-blur`、`--menu-saturate`、`--menu-shadow`、`--menu-min-width`(dark/light 双份定义,全仓 var() 消费 0)
- 排除误报:tailwind.css `--color-*`(Tailwind 引擎消费)、plyr 变量(三方库消费)不动
- 风险:`.grokskin` 皮肤包若覆盖这些变量,因本就无消费者,行为不变;删除对称覆盖浅/深
- 验证:`pnpm build:ui` + 菜单/侧栏材质目检
- 结论:**执行**

### 3.3 [子代理证据] Wallpaper 组件 `file://` 解析重复 ≈ −10~−25 行
- `WallpaperSourceModal.tsx:78-90,511-512` 与 `lib/wallpaperSource.ts:282-296` 重复;委托 `resolveApplySource`
- 验证:`wallpaperSource.test.ts` + 三种来源缩略图目检
- 结论:**执行**

### 3.4 MediaLayer ↔ FocusEditor 媒体测量/clip 重复
- 结论:**暂缓**(非死代码,视频回归重,收益/风险一般)

### 3.5 不应改清单
- stream-perf 目标类全部存活;skins↔part 无同选择器同属性重复;light composer 规则与壁纸覆盖是级联设计;mac light `#ffffff` 与壁纸 `!important` 是有意对撞 → **均不应改**

---

## 模块 4:pane chrome / sidebar / plan / terminal

### 4.1 [已复核] ResourceViewer 壳 + 独占簇死代码 ≈ −4,657 行(本轮最大单项)
- `resource-viewer/ResourceViewer.tsx` 1733、`ResourceChangesList.tsx` 630、`useResourceChanges.ts` 772、`useResourceDiffActions.ts` 1086、`ResourceViewerDialogs.tsx` 436
- 证据:`<ResourceViewer` JSX 全仓 0;簇内四模块无外部引用;右侧实装是 `SideWorkbench` + `FilesWorkspace` + `ReviewTab/PlanTab`(`AppWorkbench.tsx:22368`)
- **必须保留**:`FileKindMark`、`ResourcePreviewBody`、`useResourceFileTabs`、`helpers`、`types`(`ResourceOpenTarget` 被 AppWorkbench/SideWorkbench/ConversationThread/MarkdownChat 等 import);入口 `components/ResourceViewer.tsx` 改为仅 type re-export
- 级联:`AgentTasksPanel` 的 `variant="rail"` 仅 RV 调用,顺带收掉;死 CSS 见 4.2
- 验证:`rg '<ResourceViewer\b' src`;`pnpm exec vitest run src/lib/sideWorkbench.test.ts src/lib/resourceTree.test.ts`;手动 aside → Files/Review/Plan
- 结论:**执行**

### 4.2 [已复核] RV 独占死 CSS ≈ −200~−220 行
- `composer.part4.css:281-492,497+`(`.rp-side-modes*`、`.rp-tasks-*` 整块、`.rp-chrome__badge/changes-btn/tasks-btn`)、`workbench.part1.css:456-458`(`.rp-chrome__agents-btn`)
- `rp-tasks-` 在 TSX 0 命中;`rp-side-modes` 7 命中全在死壳内
- 勿动仍被 SideTabBar/BottomTerminal/FilesWorkspace 使用的 `.rp-chrome`/`.rp-tab`/`.rp-split__*`
- 结论:**执行**(与 4.1 同一工作单元)

### 4.3 [已复核] `--collapsed` 死别名与死守卫 ≈ −15~−40 行
- CSS 别名:`sidebar.part1.css:626-644`、`chat.part6.css:651-704`;TS 死分支:`dragZone.ts:79`、`windowFit.ts:213,221`、`nativeWebviewBounds.ts:93`;运行时只打 `*--hidden`(`AppWorkbench.tsx:19206,22312`),TSX 中 `--collapsed` 0 写入
- 验证:`pnpm exec vitest run src/lib/windowFit.test.ts src/lib/paneSplitMotion.test.ts src/lib/nativeWebviewBounds.test.ts`
- 结论:**执行**

### 4.4 [子代理证据] 侧栏拖拽 `moveGhost` 字节级重复 ≈ −8~−15 行
- `useSidebarProjectReorder.ts:156-165` 与 `useSidebarSessionMoveDrag.ts:139-148` 完全一致;抽 `lib/sidebarDragGhost.ts`;ghost 工厂保持分叉
- 结论:**执行**

### 4.5 暂缓/不应改
- AppWorkbench 左右 resize 双状态机(可抽 `useWorkbenchSplitDrag`,但触达窗口适配,**暂缓**)
- BottomTerminal/SideTabBar 标签条(`RpNamedTabChip`,**暂缓**)
- `usePaneSplitMotion` vs 底栏动效、四套 resizer CSS 几何 → **不应改**

---

## 模块 5:chat / composer

### 5.1 [已复核] 死 CSS 簇 ≈ −160~−200 行
- `.lobe-chat-live-tool*`(`lobe-chat.part2.css:791-850`,≈60 行,活路径已换 `grok-act__*`)
- 验收稿/孤儿修饰符:`.entry-card*`(`chat.part6.css:378-396`)、`.chip--changes/--git-dirty`(`chat.part4.css:94-110`)、`.composer__editing-bar/__editing-cancel`(`chat.part2.css:529-549`)、`.composer__voice-live`(`chat.part3.css:767`,活类是 `--live`)、`.chat-md__file-link`(`lobe-chat.part1.css:494-510`)、`.file-path-card__path/__sub/--missing`、`.att-card__path/__sub/__open`(组件不输出这些类,主线已核对两组件的真实类名输出)
- 验证:逐类名 rg + 附件卡/语音按钮目检
- 结论:**执行**

### 5.2 [子代理证据] `ComposerPortalPop` 门户抽层 净 ≈ −40~−60 行
- `ComposerModelMenu.tsx:55-199` 私有 `usePortalMenu/MenuShell` 未导出;`ComposerProjectMenu.tsx:57-78,124-213`、`ComposerWorktreeMenu.tsx:141-216`、`ContextUsageChip.tsx:220-273` 各复制一份 portal + `cmm__pop` 样板
- 只抽门户层,**不合并**三个菜单业务
- 验证:`pnpm exec vitest run src/components/ComposerProjectMenu.test.tsx src/components/ComposerWorktreeMenu.test.tsx`
- 结论:**执行**

### 5.3 [子代理证据] 浮动/停靠双 ResizeObserver 测高 ≈ −25~−40 行
- `AppWorkbench.tsx:13176-13200`(float pad)与 `:13231-13267`(dock 高):同 ref、同 rect+1px 防抖;抽 `observeComposerBoxHeight`,保留两个语义不同的 state
- 验证:`pnpm exec vitest run src/lib/sideFloatComposer.test.ts src/lib/welcomeIntro.guard.test.ts`
- 结论:**执行**

### 5.4 暂缓/不应改
- `att-card` 双轨(chat.part3 ↔ lobe-chat.part3,视觉分叉风险高,**暂缓**)
- `ConversationThreadLive`/`ChatFindLive` 是性能隔离层、chips 已分域、欢迎 mark 资产不重复 → **不应改**(欢迎 brand 路由小重复可后置)

---

## 模块 6:hooks 与状态

### 6.1 [子代理证据] toast 定时器收敛到已有 `showToast` ≈ −40~−60 行
- 安全实现:`AppWorkbench.tsx:10124-10129`(按 msg 清除);重复:`useSessionHostEvents.ts` 14 处 `setTimeout(() => c.setToast(null))` + `AppWorkbench.tsx` 8 处裸 `setTimeout(() => setToast(null))`
- HostEvents ctx 改传 `showToast`;行为更稳(后发 toast 不被先发 timer 清掉)
- 验证:连发两条不同时长 toast 手测
- 结论:**执行**

### 6.2 [子代理证据] Quit 阻断与 sidebar busy 重复派生
- `useSessionRuntime.ts:133-157` 与 `AppWorkbench.tsx:15132-15140` 双实现;合并前对照 `lib/agentActivity.ts` 语义是否等价
- 结论:**执行**(先删 1.6 死返回,合并需对照后做)

### 6.3 不应改
- `useSessionShell → useSessionRuntimeRefs → useSessionRuntime` 分层;`useWorkbenchLayout / DisplayPrefs / PaneSplitMotion` 三 hook 正交;`setInterval`/`keydown` 模式契约不一,不抽通用 hook;providers 无平行逻辑 → **均不应改**
- pref CHANGE_EVENT 订阅抽层 → **暂缓**(收益有限)

---

## 模块 7:Rust / Tauri

### 7.1 [已复核] 死命令 2 个 ≈ −21 行
- `desktop_notify.rs:142-145` `desktop_notify_available`(恒 true,前端 0 引用)+ `lib.rs:1451` 注册
- `voice_host_more.rs:185-197` `voice_dictation_transcribe` + `lib.rs:1591` 注册(前端 0 引用)
- 总账:注册 400 = 定义 400;前端命中 398,确认死 2
- 验证:`cargo check --manifest-path src-tauri/Cargo.toml`
- 结论:**执行**;第二步再评 `voice_stt.rs:712` `transcribe_base64`(唯一生产调用链即该死命令,连删 ≈ −100~−130)

### 7.2 [已复核] `normalize_mode` 三份同体合一 ≈ −16~−24 行
- `agent_home_config.rs:35-41`、`agent_config_edit.rs:125-131`、`agent_config_view.rs:49+`;保留一处,余改 import
- 验证:`cargo test` 三模块
- 结论:**执行**

### 7.3 [子代理证据] `session_fsm.rs` 未用转移 ≈ −40~−60 行
- `:51` `clear_error`、`:167` `reattach_ok`,`fsm.` 调用 0;文件级 `#[allow(dead_code)]` 掩盖
- 结论:**执行**(确认无近期 reattach 接线计划)

### 7.4 [子代理证据] `normalize_enabled` 恒等函数 ×3 ≈ −10~−15 行
- 结论:**执行**(低优先,顺手)

### 7.5 [已复核,改判] 三份窗口配置几何重复 → **不应改**
- `app.windows` 是数组;Tauri 平台配置按 RFC 7396 merge patch,**数组整体替换**,平台文件必须重复全部字段;且平台数组有意省略 `zoomHotkeysEnabled` 等键。子代理的 DRY 建议技术不可行
- 结论:**不应改**

### 7.6 暂缓
- `AgentError` vs `Result<_,String>` 双轨(301 处,IPC 错误形状变更,大债)
- `sessions_list` vs `session_api::list_sessions` 抽共享行构造
- `remoteIm invokeSafe` 平行包装(吞错语义是有意的)
- app_icon / tray → **不应改**(产品规则要求 dock ≠ tray)

---

## 模块 8:测试守卫、资产与依赖清理

### 8.1 [已复核] 无引用资产 −9 文件
- `src/assets/providers/*.svg` ×5(图标已内联 JSX,仅注释提及)
- `src-tauri/icons/tray-16.png`、`tray-icon-18.png`、`tray-icon@2x.png`、`tray-source.png`(运行时 mac 用 `tray-icon.png`、win 用 `tray-win-*`/`tray-32`;`include_bytes!` 无命中)——**同步修改** `scripts/generate-icons.sh:134-139` 停产 + `docs/llm-wiki/icons.md`
- 结论:**执行**

### 8.2 [已复核] 跨文件/同文件 CSS 重复块合并 ≈ −90~−130 行
- `.ext-plugin-install` 家族 5 选择器 ≈35 行逐字节重复(`modals.part4.css:756-788` vs `modals.part5.css:458-488`)→ 删一份
- `search-panel` 模式芯片双块(`sidebar.part2.css:618-676` vs `:696-734`)→ 合并,保留后块生效值,浏览器确认
- `.ext-field-hint`(modals.part4:422 vs part6:88)、`.prompt-history__item-meta`(modals.part1:432 vs chat.part2:465)、`.aside__inner`(composer.part5:579 vs chat.part6:674)、`.lobe-chat-action.is-copied`(sidebar.part1:142 错放)→ 逐组对照生效值后归一
- 结论:**执行**(每组先算 computed 再删)

### 8.3 [子代理证据] 守卫精简(小)
- `skins.streamPerf.test.ts` 并入 wallpaper guards 后删薄文件(−18 行);`settingsControls.guard` 与 `rimUi.guard` 重复断言合并(−20~−40)
- 17 个 guard 主体(chatAnswerOverlap/planEmptyCenter/wallpaperThemeContrast/pet/windowsConsoleFlash 等)目标全部存活 → **不应改**
- 结论:合并项**执行(低优先)**;主体**不应改**

### 8.4 暂缓(需产品拍板的"预埋未接线")
| 模块 | 行数 | 纠结点 |
|---|---|---|
| `sendIntent`(318+364) | 682 | i18n key 已埋 |
| `worktreeParallel`(192+225) | 417 | palette 有 `parallel-worktree-task` 条目但无处理器 |
| `askUserDemoPath` + catalog + 15 语系 i18n | ≈450+ | 设置搜索能命中但无锚点 UI;接线 vs 砍半成品 |
| `chatcutCodexAdapter`(505) | 505 | wiki 称"纯函数真相源",运行时是 `.mjs` 自实现;先统一真相源 |
- 结论:**暂缓**,单独列给用户拍板

### 8.5 负结果(已排除)
- CSS 60 文件全部在 import 链上,无孤儿
- package.json scripts 与 CI 引用的脚本全部存在
- `viteManualChunks`(vite.config.ts 在用)、tailwind `--color-*`、plyr 变量、`petIdentity`(经 `@/lib/pet` barrel)均为误报,不动

---

## 实施顺序(每模块一个中文 commit + pi 审核)

1. **M1 死码大清扫(前端)**:1.1–1.8(可拆 2–3 个 commit:ui簇+依赖 / 死组件+级联 / lib孤儿批)
2. **M4 ResourceViewer 壳删除**:4.1–4.3(独立大 commit)
3. **M5 死 CSS 簇 + M8.2 CSS 重复合并**
4. **M2 设置收敛**:2.2 → 2.3 → 2.4 → 2.1(SettingsRow 分批)
5. **M3 主题/壁纸**:3.1–3.3
6. **M5 收敛**:5.2 门户抽层 → 5.3 测高
7. **M6 hooks**:6.1 toast → 6.2 Quit 对照
8. **M7 Rust**:7.1 → 7.2 → 7.3 → 7.4
9. **M8 资产/守卫/依赖终清**:8.1、8.3,复跑全量
10. 最终:`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm build:ui`、`check-code-quality-gates.py --mode final`、`cargo fmt --check`、`cargo check`、受影响 `cargo test`

每步:先补/确认守卫 → 迁移/删除 → 模块专项测试 + `git diff --check` → 精确暂存 → 中文 commit → pi 审核 → 下一项。

## 门禁提醒

- 修改代码前需要:另一进程的**最终集成分支 SHA + 工作树 clean + 全量测试结果**
- 然后:备份分支 → `$MAIN_WT` ff-only → main 全量验证绿 → 建 `codex/codebase-slimming-20260824` worktree → 本文档落库 → 按序实施
- 不 push、不建 PR、不动 `/tmp/grok-pr-*`、不新增依赖
