# TRD：3D 人物周期表（Google 登录 + Google Sheet）

> 本文档供 AI 编码 Agent 阅读并据此实现。请严格按文档中的**需求、约束、接口、验收标准**执行，不要自行扩展范围。

## 0. 文档信息

| 项目 | 内容 |
|---|---|
| 项目名 | periodic-table（Kasatria Junior Software Developer 作业） |
| 类型 | 纯前端静态网站，无后端 |
| 交付物 | 一个部署在公网 HTTPS 的网页链接 + 源码仓库 |
| 语言 | JavaScript（ES Modules），不使用框架、不使用构建工具 |
| 文档语言 | 中文；代码标识符、注释用英文，界面文案用英文 |

---

## 1. 背景与目标

改造 three.js 官方示例 **CSS3D Periodic Table**（https://threejs.org/examples/#css3d_periodictable）：

1. 用户必须先通过 **Google 登录** 才能看到内容。
2. 登录后从 **Google Sheet** 读取 200 条人物数据，每人一块 3D 卡片，取代原来的化学元素。
3. 卡片背景/边框按 **净资产（Net Worth）** 着色。
4. 支持四种排列并带动画切换：**Table、Sphere、Helix（双螺旋）、Grid**。

---

## 2. 范围

### 2.1 范围内（In Scope）

- Google 登录页、登录/退出、错误提示
- 读取 Google Sheet、数据清洗
- 卡片 DOM 与样式、净资产着色、颜色图例
- 四种 3D 布局与切换动画、拖拽旋转与缩放
- 部署到 GitHub Pages、README

### 2.2 范围外（Out of Scope，不要做）

- 后端服务、数据库、用户系统
- 写入或修改 Google Sheet（只读）
- 搜索、筛选、分页、编辑数据
- 使用 React / Vue 等框架，或 npm 构建流程
- 单元测试框架（可选，不强制）

---

## 3. 技术栈与约束

| 项 | 要求 |
|---|---|
| 3D 渲染 | three.js **0.160.0**，`CSS3DRenderer`、`CSS3DObject`、`TrackballControls` |
| 动画 | `three/addons/libs/tween.module.js`（three 自带的 TWEEN，无需另外引入） |
| 模块加载 | `index.html` 中使用 `<script type="importmap">`，从 jsDelivr 引入，**固定精确版本号**，不要用 `latest` |
| 登录 | Google Identity Services（GIS）**OAuth Token 模式**：`google.accounts.oauth2.initTokenClient` |
| 数据 | Google Sheets API v4，`values.get`，只读 |
| 部署 | GitHub Pages（Deploy from a branch，`main` / root） |
| 浏览器 | 最新版 Chrome / Edge / Safari / Firefox 桌面端 |

**硬性约束：**

1. **禁止**把 Client Secret、API Key 或任何密钥写进代码（本项目只需要 Client ID）。
2. **禁止**使用 `innerHTML` 拼接来自 Sheet 的数据，一律用 `textContent` / `createElement`，防止注入。
3. 必须通过 `http://` 或 `https://` 运行，不支持 `file://`。
4. 所有可变配置集中在 `js/config.js`。
5. GIS 脚本是异步加载的，必须等它加载完成后才允许点击登录按钮。
6. 登录弹窗必须由**用户点击事件**直接触发 `requestAccessToken`，否则会被浏览器拦截。

---

## 4. 已完成的外部配置（Agent 无需再创建）

| 项 | 值 |
|---|---|
| Google Cloud 项目 | `kasatria-periodic-table` |
| 已启用 API | Google Sheets API |
| OAuth 客户端类型 | Web application |
| **Client ID** | `271446044272-e7m7v9i0vb9enu1ftc5n6occkr6e4895.apps.googleusercontent.com` |
| Authorized JavaScript origins | `http://localhost:8000`、`https://jinheng0301.github.io` |
| OAuth 应用状态 | External / Testing（Test users 含开发者与 `lisa@kasatria.com`） |
| 所需 Scopes | `openid`、`email`、`profile`、`https://www.googleapis.com/auth/spreadsheets.readonly` |
| **Sheet ID** | `1vfcEjDZ7IsjRxRfyM3dIhaxsUWD9Y0Def3a2AOfF7kM` |
| 工作表标签名 | `Data Template`（含空格） |
| 读取范围 | `'Data Template'!A:F`（带单引号） |

---

## 5. 数据规格

### 5.1 Sheet 列结构（共 6 列，约 200 行数据 + 1 行表头）

| 列 | 表头 | 类型 | 示例 | 用途 |
|---|---|---|---|---|
| A | Name | 文本 | `Lee Siew Suan` | 卡片名字 |
| B | Photo | 图片 URL | `https://static.kasatria.com/...` | 卡片头像 |
| C | Age | 数字 | `25` | 卡片右上角 |
| D | Country | 文本（国家代码） | `MY` | 卡片左上角 |
| E | Interest | 文本 | `Cooking` | 卡片底部小字 |
| F | Net Worth | 文本（货币） | `$251,260.80` | 决定颜色 |

### 5.2 清洗规则

- 表头匹配：`trim()` + 转小写后按名称查找列（`name`、`photo`、`age`、`country`、`interest`、`net worth`），**不要写死列下标**。表头缺失时抛出明确错误。
- Net Worth 清洗：`Number(String(v).replace(/[^0-9.\-]/g, ''))`，非法值按 `0` 处理。
- 丢弃 Name 为空的行。
- 输出对象：`{ name, photo, age, country, interest, netWorth:number }`。

### 5.3 预期分布（用于验收）

净资产 < $100K 约 21 人，$100K–$200K 约 86 人，> $200K 约 93 人（总计 200）。

---

## 6. 功能需求

### FR-1 登录页

- 未登录时只显示登录页，不渲染 3D 场景。
- 视觉：白色背景，居中白色圆角卡片（浅灰细边框）；标题 `Welcome Back`；一行小字说明；蓝色（`#4285F4`）按钮，左侧白底 Google「G」图标，文字 `Sign in with Google`。
- GIS 脚本未加载完成时按钮为禁用状态。
- 点击按钮 → `initTokenClient` + `requestAccessToken({ prompt: 'select_account' })`，弹出账号选择窗口。
- 成功后：校验已授予 `spreadsheets.readonly`（`hasGrantedAllScopes`），再请求 `https://www.googleapis.com/oauth2/v3/userinfo` 获取姓名、头像。
- 失败时在卡片内显示可操作的错误文案（见 FR-9）。

### FR-2 登录后界面

- 隐藏登录页，显示 3D 场景（黑色背景全屏）。
- 右上角：用户头像（可选）、用户名、`Sign out` 按钮。
- 底部居中：四个按钮 `Table / Sphere / Helix / Grid`，当前布局高亮。
- 右下角：颜色图例（见 FR-5）。

### FR-3 读取数据

- 登录成功后调用 Sheets API：`GET https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/{encodeURIComponent(RANGE)}?valueRenderOption=FORMATTED_VALUE`，请求头 `Authorization: Bearer <access_token>`。
- 加载期间显示全屏 loading 提示。
- 失败处理见 FR-9。

### FR-4 卡片

每个人一块卡片，尺寸 **120 × 160 px**，内容自上而下：

1. 顶行：左 `country`，右 `age`（小字）
2. 头像：96 × 96，`object-fit: cover`，`referrerpolicy="no-referrer"`，加载失败时用灰色人像占位图（data URI SVG）
3. 名字：加粗，单行，超出省略
4. 兴趣（Interest）：小字

卡片 `title` 属性显示 `姓名: $净资产`。

### FR-5 净资产着色

| 条件 | 颜色 |
|---|---|
| 净资产 **> 200,000** | 绿 `#3A9F48` |
| 净资产 **> 100,000** 且 ≤ 200,000 | 橙/黄 `#FDCA35` |
| 净资产 ≤ 100,000 | 红 `#EF3022` |

- 边界值（恰好 100,000 / 200,000）归入较低一档，并写入 README。
- 实现：CSS 变量 `--rgb`，边框 `rgba(var(--rgb), .95)`，背景 `rgba(var(--rgb), .16)`，发光 `box-shadow: 0 0 12px rgba(var(--rgb), .5)`；hover 时增强。
- 颜色阈值与色值集中在 `config.js`。
- **图例**：右下角一条 `Low → High` 的渐变条（`#EF3022 → #FDCA35 → #3A9F48`）。

### FR-6 四种布局

通用约定：设 `n` 为卡片数，`i` 为卡片序号（0 起）。每种布局预先算好 `{position:Vector3, rotation:Euler}` 数组。用一个 `Object3D` 做 dummy，`lookAt` 后读取 rotation。

**Table（20 列 × 10 行）**

```
col = i % 20
row = floor(i / 20)
x = (col - 9.5) * 140
y = (4.5 - row) * 180
z = 0
朝向：不旋转（正对相机）
```

**Sphere**

```
phi   = acos(-1 + 2*i/n)
theta = sqrt(n * PI) * phi
position.setFromSphericalCoords(900, phi, theta)
朝向：lookAt(position * 2)  // 朝外
```

**Helix（双螺旋）**

```
strand = i % 2                 // 0 或 1，两条螺旋
idx    = floor(i / 2)
perStrand = ceil(n / 2)
theta  = idx * 0.35 + strand * PI   // 两条相位差 180°
x = 900 * sin(theta)
y = (perStrand / 2 - idx) * 16
z = 900 * cos(theta)
朝向：lookAt(x*2, y, z*2)           // 朝外
```

**Grid（5 × 4 × 10）**

```
x = i % 5
y = floor(i / 5) % 4
z = floor(i / 20)
position.x = (x - 2) * 300
position.y = (1.5 - y) * 300
position.z = (4.5 - z) * 400
朝向：不旋转
```

常量集中在 `layouts.js` 顶部导出，便于调整视觉效果。

### FR-7 动画与交互

- 首次渲染：每张卡片随机位置出现，再过渡到 Table。
- 切换布局：每张卡片用 TWEEN 对 `position` 与 `rotation` 做补间，`Easing.Exponential.InOut`，时长 `random * duration + duration`（`duration` 默认 1500 ms）。切换前调用 `TWEEN.removeAll()`。
- 相机：`PerspectiveCamera(40, aspect, 1, 10000)`，初始 `z = 3200`。
- `TrackballControls`：`minDistance = 500`，`maxDistance = 6000`。
- 每帧：`TWEEN.update()`、`controls.update()`、`renderer.render()`。
- 窗口缩放：更新相机比例与渲染器尺寸。

### FR-8 退出登录

- 点击 `Sign out`：`google.accounts.oauth2.revoke(token)`，然后 `location.reload()` 回到登录页。

### FR-9 错误处理

| 场景 | 提示文案（可微调，但必须清晰） | 操作 |
|---|---|---|
| GIS 脚本加载失败 | Google sign-in could not load. Check your connection and refresh. | 刷新 |
| 弹窗被关闭 `popup_closed` | The sign-in window was closed. Click the button to try again. | 重试 |
| 弹窗被拦截 `popup_failed_to_open` | The browser blocked the sign-in window. Allow pop-ups for this site and try again. | 重试 |
| `access_denied`（不在测试用户名单） | Access was denied. This app is in testing, so only approved accounts can sign in. | — |
| 缺少 Sheets 权限 | Sign-in needs permission to read Google Sheets. Sign in again and allow access. | 重新登录 |
| Sheets API 401 | Your session expired. Sign in again to reload the data. | Sign out |
| Sheets API 403 | This Google account cannot open the Sheet, or the Google Sheets API is not enabled for the project. | Sign out |
| Sheets API 404 | The Sheet was not found. Check SHEET_ID in js/config.js. | — |
| Sheets API 400 | The worksheet range is invalid. Check the tab name in RANGE in js/config.js. | Try again |
| 网络失败 / 其他 | Could not load the data. Check your connection and try again. | Try again |

---

## 7. 架构与文件结构

```
periodic-table/
├── index.html          # 登录视图、3D 视图、importmap、GIS 脚本
├── css/style.css       # 登录页、卡片、控件、图例样式
├── js/
│   ├── config.js       # 所有配置
│   ├── auth.js         # Google 登录/退出
│   ├── sheets.js       # 读取并清洗数据
│   ├── card.js         # 卡片 DOM + 着色
│   ├── layouts.js      # 四种布局坐标
│   └── main.js         # 场景、动画、事件、状态流转
└── README.md
```

### 7.1 模块接口（必须按此签名实现）

**config.js**
```js
export const CONFIG = {
  CLIENT_ID, SHEET_ID, RANGE,
  SHEETS_SCOPE, SCOPES,
  THRESHOLDS: { orange: 100000, green: 200000 },
  COLORS: { red, orange, green }
};
```

**auth.js**
```js
export function waitForGoogle(timeoutMs = 10000): Promise<void>
export function signIn(): Promise<{ user: {name,email,picture}, token: string }>
export function signOut(token: string): Promise<void>
export function describeAuthError(err: Error): string
```

**sheets.js**
```js
export class SheetsError extends Error { status: number }
export function parseMoney(value: any): number
export function fetchPeople(token: string): Promise<Person[]>
export function describeSheetsError(err: SheetsError): { text: string, signIn: boolean }
```

**card.js**
```js
export function colorOf(netWorth: number): string   // 返回 hex
export function createCard(person: Person): HTMLElement
```

**layouts.js**
```js
export const TABLE, GRID
export function tableLayout(n), sphereLayout(n), helixLayout(n), gridLayout(n)
export function buildLayouts(n): { table, sphere, helix, grid }
// 每个布局返回 Array<{ position: THREE.Vector3, rotation: THREE.Euler }>
```

**main.js**：只负责串联（初始化 → 点击登录 → 读数据 → 建场景 → 布局切换），不包含业务计算。

### 7.2 状态流转

```
[登录页] --点击--> [GIS 弹窗] --成功--> [读取 Sheet] --成功--> [3D 场景]
    ^                  |失败                |失败
    |__ 显示错误 <_____|                    |__ 显示状态浮层（重试 / Sign out）
```

---

## 8. 非功能需求

| 项 | 要求 |
|---|---|
| 性能 | 200 张卡片下切换布局动画流畅（桌面端约 60fps 目标） |
| 安全 | 无密钥入库；Sheet 数据只用 `textContent` 渲染；token 仅存内存，不写入 localStorage |
| 可访问性 | 按钮有可见的键盘焦点；颜色之外卡片 `title` 提供数值信息；尊重 `prefers-reduced-motion`（用于登录页过渡） |
| 兼容性 | 窗口缩放后正常；登录页在手机宽度下可用 |
| 代码质量 | 模块职责单一，无全局变量污染，函数带简短英文注释，无未使用代码 |

---

## 9. 部署要求

1. 仓库根目录即站点根目录（`index.html` 在最外层）。
2. GitHub Pages：Settings → Pages → Deploy from a branch → `main` / `/ (root)`。
3. 线上地址形如 `https://jinheng0301.github.io/<repo-name>/`。
4. OAuth 授权来源只写到域名：`https://jinheng0301.github.io`（不含路径与末尾斜杠）。
5. 所有资源使用相对路径，保证在子路径 `/<repo-name>/` 下正常加载。
6. README 必须包含：功能说明、文件说明、本地运行（`python3 -m http.server 8000`）、部署步骤、颜色边界说明、OAuth Testing 状态说明。

---

## 10. 验收标准（Definition of Done）

### 登录
- [ ] 未登录只看到登录页，样式与描述一致
- [ ] 点击按钮弹出账号选择窗口，登录成功进入 3D 页面
- [ ] 不在测试用户名单的账号得到 `access_denied` 的友好提示
- [ ] 点击 Sign out 回到登录页

### 数据
- [ ] 页面共 200 张卡片
- [ ] 名字、国家、年龄、兴趣、头像显示正确，头像失败时有占位图
- [ ] Net Worth 能解析 `$251,260.80` 这类格式；表头有多余空格也能识别

### 着色
- [ ] `$60,393.60` → 红；`$139,080.00` → 橙/黄；`$251,260.80` → 绿
- [ ] 三种颜色数量约为 21 / 86 / 93
- [ ] 右下角图例显示 Low → High 渐变

### 布局
- [ ] Table 为 **20 列 × 10 行**
- [ ] Sphere 卡片均匀分布且朝外
- [ ] Helix 为**两条**相位相差 180° 的螺旋
- [ ] Grid 为 **5 × 4 × 10**，共 200 个位置，无重叠错位
- [ ] 四种布局间切换有补间动画，无报错；当前布局按钮高亮

### 工程
- [ ] 无 Client Secret / API Key 出现在代码或仓库
- [ ] 浏览器控制台无报错
- [ ] 线上链接在隐身窗口中完整走通一遍
- [ ] `lisa@kasatria.com` 的账号能登录并成功读取数据
- [ ] README 完整

---

## 11. Agent 实施顺序（建议按此顺序逐步完成并自测）

| 步骤 | 任务 | 完成标志 |
|---|---|---|
| 1 | 建目录与 `index.html`、`style.css`、`config.js`（含 importmap 和 GIS 脚本） | 页面能打开，显示登录卡片 |
| 2 | 实现 `auth.js` 与登录点击流程 | 能弹出账号选择并拿到 token 与用户信息 |
| 3 | 实现 `sheets.js`（读取 + 清洗 + 错误类） | 控制台打印出 200 条清洗后的数据 |
| 4 | 实现 `card.js`（卡片 + 着色） | 卡片显示正确且颜色分三档 |
| 5 | 实现 `layouts.js` 四种布局 | 四个数组长度均为 n，坐标符合公式 |
| 6 | 实现 `main.js`（场景、TWEEN、按钮、resize、状态浮层、退出） | 四种布局可切换 |
| 7 | 加图例、错误文案、README | 对照第 10 节逐项自测 |
| 8 | 部署 GitHub Pages | 线上链接可用 |

---

## 12. Agent 工作规则

1. 严格遵循本 TRD；若发现矛盾或缺失，**先列出问题并提问**，不要自行猜测。
2. 不引入本文未列出的依赖；不改变技术栈。
3. 每完成一个步骤，说明改了哪些文件，并给出自测方法与结果。
4. 不要重写已通过自测的模块；修改时只改必要部分。
5. 不提交任何密钥；`config.js` 里只能出现 Client ID 与 Sheet ID。
6. 需要在 Google Cloud Console、Google Sheet、GitHub 页面上人工操作的步骤，**明确告诉我去做什么**，不要假装已经完成。

---

## 13. 已知风险与注意事项

| 风险 | 说明 | 对策 |
|---|---|---|
| `origin_mismatch` | 当前访问域名不在授权来源 | 在 Cloud Console → Clients 补充，等待几分钟生效 |
| `access_denied` | 账号不在 Test users | Audience → Test users 添加 |
| 登录账号读不到 Sheet | API 用登录者自己的权限访问 | Sheet 必须已分享给该账号 |
| 工作表名含空格 | 范围写错会 400 | `RANGE` 使用 `'Data Template'!A:F` |
| Net Worth 为带 `$`、逗号的文本 | 直接比较会全部变红 | 必须先 `parseMoney` |
| CSV 编码非 UTF-8 | 导入 Sheet 可能乱码 | 已导入完成，如乱码需转 UTF-8 后重新导入 |
| 前面的卡片遮挡（Grid） | 层与层位置相同会重叠 | 按需微调 `GRID.dx / dy / dz`，仍须保持 5×4×10 |
| 登录状态不持久 | token 仅存内存，刷新需重新登录 | 属于预期行为 |
| 弹窗被拦截 | 非用户点击触发会被拦截 | 登录必须直接由点击事件调用 |
