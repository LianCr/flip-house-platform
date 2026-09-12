# 翻新项目平台（Flip House Platform）· MVP 0

给房屋翻新转卖（house flipping）公司用的内部平台。以“项目”为中心，把一套房子从线索、买入、施工到卖出的数据放在一处，每个数字带来源，买前算账和买后记账连成一条线。

当前是 MVP 0：验证数据层思路，用模拟数据源演示。界面用 AWS 控制台的开源组件库 Cloudscape。

**在线演示**：https://flip-house-platform.onrender.com （Render 免费版，闲置后首次打开约需 30 秒）

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/LianCr/flip-house-platform)

---

## 现在能做什么

| 页面 | 内容 |
|---|---|
| 工作台 | 今日关注一句话、地址搜索、12 个可拖拽小组件（需要关注、未来 30 天、在建花了多少、资金占用、阶段分布、线索漏斗、近 12 周支出、估算准不准、供应商前五、最近更新、项目列表） |
| 新建项目 | 输地址 → 自动补全房产数据（每个字段带来源与把握度）→ 定策略与阶段 → 自动预填交易分析；地址 + 地块号查重 |
| 项目页 · 总览 | 身份卡（交易结论 + 时间线）、本阶段要做的事三张卡、生命周期轨道、关键信息、预算：花在哪、哪超了、状态、风险 |
| 项目页 · 分析 | 交易分析器（参考 PropStream Fix & Flip Analyzer）：买入 / 持有含房贷 / 装修明细 / 卖出，即时指标、按目标利润率反推最高出价、成本结构；多版本；“应用到项目”把装修明细变成预算项 |
| 项目页 · 数据 | 房产规格（多来源、冲突选主值、人工修改留痕）、业主、按揭、成交史 |
| 项目页 · 文件 | 文件登记：类型、阶段、日期、对方、金额、来源 |
| 项目页 · 预算 | 汇总、预算 vs 实际（子弹图）、预算项、支出 |
| 助手抽屉 | Amazon Q 式面板，回答由规则从项目数据生成（明确标注不是大模型） |

明确不包含：登录、Lark 对接、真实房产数据接口、AI 调用、任务与排期、承包商模块。

---

## 本地运行

需要 Python 3.11+、Node 18+。

```bash
# 后端（第一次）
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt

# 后端（每次）
./.venv/bin/uvicorn app.main:app --reload --port 8000
# 首次启动自动生成 8 个示例项目到 backend/data/app.db

# 前端（第一次）
cd frontend
npm install

# 前端（每次）
npm run dev
# 打开 http://localhost:5180
```

接口文档：http://127.0.0.1:8000/docs
重置示例数据：删除 `backend/data/`，重启后端。

---

## 部署（Render，推送即部署）

仓库里带 `Dockerfile` 和 `render.yaml`：一个容器同时提供后端 API 和打包后的前端。

1. 用 GitHub 账号登录 [render.com](https://render.com)。
2. New → **Blueprint** → 选这个仓库 → Apply。首次构建约 3–5 分钟。
3. 之后每次推送到 `main`，Render 自动重新部署。

免费版说明：15 分钟无访问会休眠，再打开约 30 秒；磁盘是临时的，每次部署示例数据自动重建，上传的文件不保留。换到 AWS App Runner、Railway 等平台时同一个 Dockerfile 可直接用。

生产环境变量：`PORT`（平台注入）、`DATA_DIR`（数据库与上传目录）、`PROVIDER`（数据源，目前只有 `mock`）。

---

## 目录结构

```
backend/app/
  main.py          FastAPI 入口、跨域、静态托管（生产）
  db.py            SQLite（SQLAlchemy，换 Postgres 不改业务代码）
  models.py        房产、字段来源、业主、按揭、成交史、项目、预算项、支出、文件、交易分析
  schemas.py       请求 / 响应结构
  dictionaries.py  阶段 / 状态 / 预算类别 / 文件类型 / 来源 / 分析默认值
  status.py        项目健康状态规则（可人工覆盖）
  analysis.py      交易分析公式与预填（确定性计算，不含 AI）
  providers/       外部数据源抽象层；mock.py 为模拟源，换真源只实现同一个类
  routers/         meta、dashboard、lookup、projects、property_data、files、budget、analyses
  seed.py          示例数据：8 个项目、147 条支出、48 份文件、12 份分析、2 处多来源冲突
frontend/src/
  App.tsx          外壳：顶栏（地址搜索、评审标注开关）、侧栏、右侧助手抽屉
  pages/Dashboard.tsx        工作台（可拖拽看板，布局记在浏览器）
  pages/AddProject.tsx       新建项目向导
  pages/project/             项目页：总览 / 分析 / 数据 / 文件 / 预算
  components/charts/         图表组件包（见下）
  components/                来源标签、字段与来源、生命周期条、工作流卡、助手、评审标注
  lib/analysis.ts            与后端同一套分析公式（即时重算）
  lib/insights.ts            规则洞察：超支 / 落后 / 缺数据 / 缺文件 / 待定价 / 未算账
docs/
  候选API方案.docx          5 个非 AI 数据接口 + AI 搭配方案 + 地址补全与合并规则
  评审标注对照表.md         界面上黄色字母圆标的含义
CLAUDE.md                    产品研究框架与工作原则
```

---

## 数据层的三个核心机制

- **字段多来源**：同一字段可有多条来源记录（公共记录、Lark、人工、估算、AI），一条为主值。人工修改不覆盖旧值，只新增一条并设为主值；多来源不一致时界面标“有冲突”，人来选。
- **查重钥匙**：标准地址 + 地块号（APN）。新建项目命中已有房产会提示。
- **文件登记**：文件除了存，还登记类型、阶段、日期、对方、金额、来源；`extracted_text` 预留给后续 AI 抽取。

交易分析器把“买前估算”写成预算项，之后实际支出对着它记，估算准不准就有了对照（工作台“估算准不准”小组件）。

---

## 图表组件包

`frontend/src/components/charts/`：自建的“薄标记”图表，配色只用 Cloudscape 设计令牌（分类色前 7 位已用色盲可辨性脚本验证）。图形按“读者要做什么”选：

| 问题 | 组件 |
|---|---|
| 一个数字是多少 | `StatTile` |
| 一个比例离上限多远 | `Meter`（灰底 = 上限，超出段红） |
| 一组“实际 vs 目标” | `BulletList` / `InlineBar`（子弹图：灰底 = 目标，彩条 = 实际，超出段红，同组共用一把尺） |
| 一组量的大小 | `HBars` |
| 部分对整体 | `StackedBar`（可加参考线） |
| 随时间怎么变 | `Trend` |
| 流程走到哪 | `SegmentTrack` |
| 偏差是正是负 | `DeltaBadge` |

---

## 评审标注

每个功能块标题前有黄底黑字的字母圆标（同一页面内 A、B、C…），开会时口头引用（“总览 C 改进 xxx”）。对照表见 `docs/评审标注对照表.md`；顶栏“评审标注：开/关”可隐藏。

---

## 分工、阶段清单与更新记录（2026-09-11）

- **我是谁**：顶栏“我是：负责人 ▾”切换身份（A D J K L S W Z / 设计师 / 园丁 / 负责人，代号来自业务负责人手写流程，不写真名）。没有登录，身份存在本机浏览器，每个请求带 `X-Actor` 头。
- **蓝色圆标**：每个功能块标“谁负责”，映射在 `backend/app/dictionaries.py` 的 `OWNER_MAP`，前端 `components/OwnerTag.tsx`。
- **文件记“谁传的”**：`project_files.uploaded_by`；上传表单默认当前身份，负责人代传时按文件类型给默认（`FILE_DEFAULT_OWNER`）；登记表可按人筛。
- **更新记录**：`project_updates` 表，上传文件 / 改字段 / 记支出 / 加预算项 / 应用分析 / 编辑项目 / 勾清单时各记一条；工作台“谁更新了什么”、总览“最近更新”。
- **阶段清单**：`STAGE_CHECKLIST` 六个阶段（来自负责人的 24 条），每项带负责人和证据规则（`file:<类型>` / `field:<字段>` / `expense:any` / `manual`）；有证据自动打勾，其余手动勾存 `project_steps`；`backend/app/steps.py` 算“现在到哪一步、轮到谁、前面还有什么没勾”。总览“现在到哪一步”、工作台“每套房轮到谁”、头部阶段徽章都读它。
- **旧库补列**：`db.init_db()` 用 PRAGMA 查缺补漏，不引入迁移工具。

## 路线图

1. 接入公司 Lark：只读盘点 → 目标模型映射 → 清洗（AI 提议、人审批）→ 单向同步。
2. 接真实数据源：Google 地理编码与街景、RentCast、ATTOM、HouseCanary（见 `docs/候选API方案.docx`）。
3. AI：文件自动分类与抽取、街景风格与状况判断、助手接大模型（界面不变）。
4. 用公司历史项目替换分析器里的行业默认值（装修单价、持有月数、卖出比例）。
