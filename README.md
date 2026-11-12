# Forma

A calmer place for good work. 基于 **Next.js App Router + React + TypeScript + Supabase** 的私人任务看板。

## 已实现

- 四列看板：To do / In progress / In review / Done。
- 鼠标、触摸拖拽及键盘拖拽；跨列放下后保存，失败时恢复并提示。
- 任务创建、编辑、删除、详情侧栏；标题、描述、优先级、截止日期。
- 团队成员管理；一个任务可分配多位成员。成员是负责人信息，**不是共享账号或邀请功能**。
- 标签创建、删除、多标签分配及筛选。
- 任务评论与时间戳；任务修改、状态与分配的活动记录。
- 按标题搜索，并组合筛选优先级、成员、标签、状态。
- 看板 / 列表视图、任务完成进度、逾期和即将到期标记。
- 响应式布局，清晰的空状态 / 加载状态 / 错误状态，保存反馈、删除确认、未保存修改提醒。
- Supabase 匿名登录、数据持久化、所有表的 RLS、跨所有者关联的数据库约束。
- 未配置 Supabase 时提供**明确标记的本地演示模式**，不冒充真实云端持久化。

## 1. 先在本地查看

建议使用 **Node.js 22.12+ 或 24 LTS**。本项目在 Node.js 26 上也完成了验证。

```bash
cd forma
npm ci
cp .env.example .env.local  # 如果已有 .env.local，请直接编辑，不要覆盖
npm run dev
```

打开 <http://localhost:3000>。

两个环境变量都为空时进入本地演示：包含虚构的示例成员与任务，修改保存在当前浏览器的 localStorage 中。清理浏览器数据会移除这些修改。此模式方便检查 UI，**不满足最终验收所需的 Supabase 云端持久化**。

只配置一个变量会显示配置错误，不会悄悄回退到演示。

## 2. 接入你的 Supabase

### A. 创建项目

在 <https://supabase.com/> 创建一个免费项目，等待数据库就绪。

### B. 执行数据库 SQL

打开项目的 **SQL Editor → New query**，粘贴并执行：

```
supabase/migrations/001_initial.sql
```

这是一个事务化的初始迁移，适用于**新的项目，只运行一次**。不要重复执行，也不要在已有同名业务表的数据库里直接运行。它会创建所有表、索引、RLS 策略、活动日志触发器以及原子化的 `save_task` RPC；不需要额外手动建表。

### C. 开启匿名登录

在 **Authentication → Sign In / Providers** 中找到并启用 **Anonymous Sign-Ins**（后台布局可能略有不同）。匿名用户无需邮箱或密码，登录后具有数据库的 `authenticated` 角色。

### D. 配置环境变量

在 Supabase 的 **Connect / Project Settings → API Keys** 中获取项目 URL 和公开的 **Publishable key**。旧版 `anon` key 也可使用。

编辑 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

**注意：**

- 不要填 `service_role`、`sb_secret_...`、数据库密码或连接字符串。
- `NEXT_PUBLIC_` 变量会进入浏览器 JS；这里的 key 本来就是公开标识，权限安全必须依赖 RLS。
- `.env.local` 被 Git 忽略；`.env.example` 只有空白模板。
- 更改环境变量后，必须重启开发服务器；线上部署时必须重新构建。

重新执行 `npm run dev` 后，右上状态会显示 **Saved to Supabase**，真实看板从空数据开始。**本地演示数据不会自动上传**。

## 3. 验证真实数据与用户隔离

1. 在普通浏览器窗口创建任务 A，刷新后确认仍然存在。
2. 在 Supabase Table Editor 中确认 `tasks` 行已保存，`user_id` 与匿名用户对应。
3. 用隐身窗口或另一个浏览器打开 App；这是独立游客 B，应当看到空白看板，而不是 A 的任务。
4. 在 B 中创建任务 B；返回 A 并刷新，A 不应看到 B 的任务。
5. 验证拖拽后状态保存、评论保存、标签和多负责人保存。

自动化测试在本地 PostgreSQL / PGlite 中验证了 SQL、触发器、RLS、跨用户写入拦截以及事务回滚。**Supabase Auth / PostgREST 的真实联调仍需按上述步骤，在你自己的项目中验证**；没有配置密钥时不能将本地测试视为真实云端验证。

匿名会话保存在当前浏览器。清理站点数据、使用另一设备或失去会话会产生新的游客身份，旧数据不会自动归属新身份，也没有邮件找回流程。

## 4. 测试与生产构建

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

浏览器测试使用 Playwright：

```bash
npx playwright install chromium
npm run test:e2e
```

若已安装桌面 Google Chrome，可在 macOS / Linux 使用：

```bash
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

测试覆盖任务生命周期、刷新持久化、鼠标 / 键盘拖拽、搜索筛选、成员标签、手机页面宽度、未保存提醒、损坏存储、空看板及自动化 WCAG AA 检查。测试需要本地演示模式；**不要在连接真实 Supabase 的个人工作数据上运行这些演示测试**。

测试截图及失败 trace 保存在被 Git 忽略的 `test-results/` 下。

## 5. 部署到 Vercel 免费版

1. **仅将 `forma` 目录作为代码仓库**，不要把上层的测评原始 PDF 加入仓库。
2. 将仓库导入 Vercel，框架选择 Next.js。如果仓库本身就是 `forma` 内容，Root Directory 使用默认值。
3. 为部署环境配置上述两个 `NEXT_PUBLIC_SUPABASE_*` 变量。
4. 部署完成后，使用线上 URL 重复真实数据与用户隔离验证。
5. 后续修改公开环境变量，也要重新部署；不是只改配置就会改变已有浏览器 bundle。

没有独立 Go / Express 服务，不需要后台服务密钥、付费 API 或另外的服务器。应用使用 Next.js，数据层通过浏览器 Supabase SDK 调用 Auth / PostgREST。

本项目未自动推送 GitHub、未创建任何远程资源、未公开部署。公开访问的长期产品还应补充 CAPTCHA / 限流、滥用治理和匿名账号清理策略；当前默认配置用于测评演示。**不要直接在 Supabase 开启强制 CAPTCHA 而不增加前端验证流程，否则匿名登录将失败。**

## 数据模型与安全设计

| 表               | 用途                                                          |
| ---------------- | ------------------------------------------------------------- |
| `tasks`          | 标题、描述、四种状态、优先级、截止日期、创建/更新时间、所有者 |
| `members`        | 当前用户的虚拟团队成员：姓名、颜色                            |
| `labels`         | 当前用户的自定义标签：名称、颜色                              |
| `task_assignees` | 任务与成员的多对多关系                                        |
| `task_labels`    | 任务与标签的多对多关系                                        |
| `comments`       | 任务评论、时间戳及所有者                                      |
| `activity_log`   | 数据库触发器生成的任务活动记录                                |

- 所有表均启用 RLS；仅 `auth.uid() = user_id` 的已登录用户可访问。
- `WITH CHECK` 阻止伪造、转移所有者；未登录的 `anon` 角色无表权限。
- 关联表与评论通过 `(entity_id, user_id)` **复合外键**确保关联对象也属于相同用户，不能只靠客户端筛选。
- `save_task` 以调用者权限执行；任务与负责人、标签在同一数据库事务内提交，失败全部回滚。
- 活动表对客户端只读。写入来自固定 `search_path` 的触发器函数，且客户端无函数执行权限。
- 删除任务会级联删除相关评论、活动、分配和标签关联；删除成员 / 标签不会删除任务。
- 所有 SQL 均位于初始迁移中，可直接作为数据库 Schema 交付材料。

## 代码结构

```text
src/app/                    Next.js 页面、布局、全局样式
src/components/workspace.tsx 工作区、导航、筛选和面板调度
src/components/board.tsx     拖拽看板和列表
src/components/task-dialog.tsx 任务编辑、评论及活动侧栏
src/components/manage-dialog.tsx 成员和标签管理
src/components/ui.tsx       对话框、头像及通用 UI
src/lib/types.ts            领域模型
src/lib/repository.ts       同一接口下的 demo / Supabase 数据实现
src/lib/use-board.ts        加载、串行修改、乐观更新和错误恢复
src/lib/utils.ts            校验、筛选和本地日期逻辑
supabase/migrations/        完整数据库迁移
 tests/                     领域逻辑、存储、PostgreSQL 安全、浏览器测试
```

## 设计取舍

- 使用柔和中性色与低饱和绿色，靠排版、间距和明确状态图形区分层级，而不只依赖颜色。移动端使用单列堆叠，避免整页横向滚动。
- 标题搜索、筛选和概览都在当前工作区内完成；状态在放下卡片后保存，不依赖 WebSocket。不同窗口的更新通过 Refresh 获取。
- 当前不支持同列内自定义排序；跨列拖拽是明确实现的核心交互。触屏和键盘用户也可以在任务详情中直接修改状态。
- 数据读取面向小型测评工作区，暂未加入服务端分页；Supabase 默认返回行数上限会限制大规模任务、评论和活动列表。
- 任务详情和其关联实体采用一笔事务；评论单独保存，评论按钮不会自动保存尚未提交的任务字段。
- 日期为数据库 `date`，使用本地日历日期判断是否逾期，避免 UTC 转换导致前一天 / 后一天偏差。活动、评论使用 `timestamptz`。
- 后续可增加正式账号升级、可恢复身份、多人共享权限、实时订阅、分页、同列排序与附件。目前没有假装实现这些能力。

## 提交材料

提交前需要你填入真实线上链接、GitHub 链接与个人姓名，再整理成要求的 PDF / DOCX。可引用本 README 的功能、设计取舍和运行说明，以及迁移文件中的 SQL。

请勿在仓库中包含原始测评 PDF，或在公开社交平台发布最终提交材料链接。项目外的原始文档没有被修改或上传。
