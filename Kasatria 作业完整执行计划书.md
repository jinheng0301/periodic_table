# Kasatria 作业完整执行计划书

**职位：** Junior Software Developer　｜　**作业：** 3D 元素周期表改造（Google 登录 + Google Sheet 数据）

---

## 0. 项目总览

**最终交付物：** 一个部署在公网（HTTPS）的网页链接。打开后先看到 Google 登录页，登录后从 Google Sheet 读取 200 条人物数据，渲染成 3D 卡片，可在 Table / Sphere / Helix / Grid 四种排列间切换，并按净资产着色。

**技术选型（保持简单，避免被构建工具拖累）：**

- 纯静态网站：HTML + CSS + 原生 JavaScript（ES Modules），**不需要后端、不需要构建工具**
- 3D：three.js（CSS3DRenderer）+ TWEEN.js，用 CDN 的 importmap 引入
- 登录与授权：Google Identity Services（GIS）的 OAuth Token 模式，一次登录同时拿到用户资料和读取 Sheet 的权限
- 数据：Google Sheets API v4（只读）
- 部署：GitHub Pages（免费、自带 HTTPS）

**为什么这样选：** 题目要求“Google 登录”和“从 Google Sheet 取数据”。用 Token 模式，登录用的那个 access token 直接拿去读 Sheet，只需要一个 OAuth Client ID，不需要 API Key，也不需要把 Sheet 设为公开。

**总流程（9 个阶段）：**

| 阶段 | 内容 | 预计耗时 |
| --- | --- | --- |
| A | 建 Google Sheet 并分享给 Lisa | 15 分钟 |
| B | Google Cloud Console 配置（重点） | 40 分钟 |
| C | 本地项目搭建 | 20 分钟 |
| D | 登录页与 Google 登录 | 1–1.5 小时 |
| E | 读取并清洗 Sheet 数据 | 1 小时 |
| F | 卡片样式与净资产着色 | 1–1.5 小时 |
| G | 四种 3D 排列 | 1.5–2 小时 |
| H | 部署到 GitHub Pages 并回填授权来源 | 30 分钟 |
| I | 测试与提交 | 30 分钟 |

---

## 阶段 A：创建 Google Sheet 并分享

1. 打开 https://sheets.google.com ，用你的 Google 账号登录。
2. 点击左上角 **空白表格**（Blank）新建。
3. 菜单 **文件 → 导入 → 上传**，把 `Data_Template.csv` 拖进去。
4. 导入设置对话框中：
   - 导入位置选 **替换当前工作表**
   - 分隔符类型选 **自动检测**（或逗号）
   - 勾选 **将文本转换为数字、日期和公式**（默认即可）
5. 点 **导入数据**。
6. **检查乱码：** 这个 CSV 不是 UTF-8 编码。如果名字出现乱码（例如带 `Â` 之类的字符），说明编码识别有误。解决办法：用 Excel 或记事本打开 CSV，另存为 UTF-8 后重新导入。
7. 检查数据：应该有 **200 行数据 + 1 行表头**，共 6 列：`Name / Photo / Age / Country / Interest / Net Worth`。
8. 左上角把文件命名为 `Kasatria Assignment Data`。
9. **分享给 Lisa：** 右上角 **共享** → 在“添加用户和群组”输入 `lisa@kasatria.com` → 权限选 **查看者**（Viewer）→ 取消勾选“通知”可选 → 点 **发送**。
10. **记录两个信息**，后面要用：
    - **Sheet ID：** 浏览器地址栏 `https://docs.google.com/spreadsheets/d/` 和 `/edit` 中间那一长串字符
    - **工作表标签名：** 左下角标签名，通常是 `Data_Template` 或 `Sheet1`（以实际为准，代码里要用）

> 注意：Net Worth 列在 CSV 里是 `$251,260.80` 这种带符号的文本，列名前后可能有空格。**不要在 Sheet 里手动改数据**，保持原样，在代码里清洗。

---

## 阶段 B：Google Cloud Console 配置（重点，逐步操作）

> 说明：Google 近年把“OAuth 同意屏幕”改版成了 **Google Auth Platform**，页面左侧有 Overview / Branding / Audience / Clients / Data Access 几个菜单。如果你看到的是旧版（一个叫 OAuth consent screen 的多步骤向导），原理一样，名称对照着找即可。

### B1. 创建项目

1. 打开 https://console.cloud.google.com ，用**与 Sheet 相同的 Google 账号**登录。首次进入需同意服务条款。
2. 点击页面顶部左侧的**项目选择器**（显示当前项目名或 “Select a project”）。
3. 在弹出的窗口右上角点 **New project（新建项目）**。
4. **Project name** 填 `kasatria-periodic-table`。Organization / Location 保持默认（No organization）。
5. 点 **Create**。等待几秒，右上角通知铃铛出现创建成功提示。
6. **再次点项目选择器，确认当前选中的是 `kasatria-periodic-table`。** 这一步很重要，后面所有设置都必须在这个项目下做。

### B2. 启用 Google Sheets API

1. 左上角 ☰ 汉堡菜单 → **APIs & Services → Library**（API 和服务 → 库）。
2. 搜索框输入 `Google Sheets API`，点进搜索结果。
3. 点蓝色 **Enable（启用）** 按钮。
4. 页面跳转到 API 概览页，表示启用成功。

### B3. 配置 OAuth 同意屏幕（Google Auth Platform）

1. ☰ 菜单 → **APIs & Services → OAuth consent screen**，会进入 **Google Auth Platform**。如果页面显示 “Google Auth Platform not configured yet”，点 **Get started**。
2. **App Information（应用信息）：**
   - App name：`Kasatria Periodic Table`（登录弹窗会显示这个名字，对应 Image A 第二张图的 “Kasatria”）
   - User support email：下拉选你自己的邮箱
   - 点 **Next**
3. **Audience（受众）：** 选 **External（外部）**，点 **Next**。
   - 个人 Gmail 账号只能选 External。
4. **Contact Information（联系信息）：** 填你的邮箱，点 **Next**。
5. **Finish：** 勾选同意 Google API Services User Data Policy，点 **Continue**，再点 **Create**。

### B4. 添加授权范围（Scopes）

1. 在 Google Auth Platform 左侧点 **Data Access（数据访问）**。
2. 点 **Add or remove scopes（添加或移除范围）**。
3. 在右侧面板中勾选以下 **4 项**（可用 Filter 搜索）：
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   - `.../auth/spreadsheets.readonly`（描述：See all your Google Sheets spreadsheets）
   - 如果列表里搜不到 spreadsheets.readonly，说明第 B2 步没启用成功，回去检查。
4. 点底部 **Update（更新）**，再点页面底部 **Save（保存）**。

> `spreadsheets.readonly` 属于“敏感范围”。在 Testing 状态下可以正常使用，只是登录时会提示“Google hasn't verified this app”，点 **Advanced → Go to ... (unsafe)** 继续即可。这对作业来说是正常的，不需要提交 Google 验证。

### B5. 添加测试用户（关键，容易漏）

1. 左侧点 **Audience（受众）**。
2. 确认 **Publishing status** 为 **Testing（测试中）**。保持这个状态即可，**不要点 Publish app**。
3. 找到 **Test users（测试用户）** → 点 **Add users（添加用户）**。
4. 输入以下邮箱（一行一个）：
   - 你自己的 Gmail
   - `lisa@kasatria.com`
   - （可选）你用来测试的另一个账号
5. 点 **Save**。

> **为什么必须加 Lisa：** Testing 状态下，不在名单里的账号登录会直接报 `Error 403: access_denied`。你提交链接后，Lisa 要能登录才能看到效果。最多可以添加 100 个测试用户。

### B6. 创建 OAuth Client ID

1. 左侧点 **Clients（客户端）** → **Create client（创建客户端）**。
2. **Application type（应用类型）：** 选 **Web application**。
3. **Name：** `periodic-table-web`。
4. **Authorized JavaScript origins（已获授权的 JavaScript 来源）** → 点 **Add URI**，添加：
   - `http://localhost:8000`（本地开发用，端口和你本地起的服务保持一致）
   - `https://你的GitHub用户名.github.io`（部署后使用）
   - 规则：只写到域名/端口，**不要带路径，不要带末尾斜杠**。例如 `https://fam123.github.io`，而不是 `https://fam123.github.io/kasatria/`。
5. **Authorized redirect URIs：** 这次使用 GIS 弹窗 Token 模式，**不需要填**，留空。
6. 点 **Create**。
7. 弹窗里会显示 **Client ID**，形如 `1234567890-abcdefg.apps.googleusercontent.com`。点复制保存。
   - **Client secret 不需要，也不要写进前端代码。**
8. 授权来源修改后最多需要几分钟到几小时才生效，如果刚加完登录报 `origin_mismatch`，等 5–10 分钟再试。

### B7. Cloud Console 完成检查清单

- [ ] 当前项目是 `kasatria-periodic-table`
- [ ] Google Sheets API 已启用
- [ ] Audience 为 External，状态为 Testing
- [ ] Data Access 里有 spreadsheets.readonly + 3 个基础范围
- [ ] Test users 包含你自己和 lisa@kasatria.com
- [ ] Web Client 已创建，已拿到 Client ID
- [ ] Authorized JavaScript origins 含 localhost 和 github.io 域名

---

## 阶段 C：本地项目搭建

### C1. 目录结构

```
periodic-table/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── config.js        # CLIENT_ID、SHEET_ID、RANGE
│   ├── auth.js          # Google 登录与 token
│   ├── sheets.js        # 读取并清洗数据
│   ├── card.js          # 生成卡片 DOM、颜色判断
│   ├── layouts.js       # 四种排列的位置计算
│   └── main.js          # 场景、动画、按钮事件
└── README.md
```

### C2. 本地运行

GIS 必须在 http(s) 下运行，**不能直接双击打开 html**（file:// 会失败）。在项目目录执行：

```
python3 -m http.server 8000
```

浏览器访问 `http://localhost:8000`。端口必须与 B6 里登记的来源一致。

### C3. config.js

```js
export const CONFIG = {
  CLIENT_ID: 'xxxx.apps.googleusercontent.com',
  SHEET_ID: '你的SheetID',
  RANGE: 'Data_Template!A1:F201', // 工作表名以你实际的为准
  SCOPES: 'openid email profile https://www.googleapis.com/auth/spreadsheets.readonly'
};
```

### C4. index.html 骨架

- `<head>` 中放 importmap，引入 three 与 CSS3DRenderer、TWEEN（用 jsDelivr 或 unpkg，并固定版本号）
- 引入 GIS 脚本：`<script src="https://accounts.google.com/gsi/client" async defer></script>`
- `<body>` 里有两个容器：`#login-view`（登录卡片）和 `#app-view`（默认隐藏，包含 3D 容器和底部按钮）

---

## 阶段 D：登录页与 Google 登录（对应 Image A）

### D1. 登录页界面

- 页面居中一张白色圆角卡片
- 标题 `Welcome Back`，下方一行小字说明，下方蓝色按钮 `Sign in with Google`（带 Google G 图标）
- 和 Image A 保持一致即可，不需要花哨

### D2. 登录逻辑（auth.js 核心）

```js
let tokenClient;
let accessToken = null;

export function initAuth(onSuccess, onError) {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: CONFIG.SCOPES,
    callback: async (resp) => {
      if (resp.error) return onError(resp.error);
      accessToken = resp.access_token;
      const user = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      }).then(r => r.json());
      onSuccess(user, accessToken);
    }
  });
}

export function signIn() {
  tokenClient.requestAccessToken({ prompt: 'select_account' });
}
```

- 点击自定义按钮时调用 `signIn()`，弹出 Image A 第二张图那种 “Choose an account” 窗口。
- 登录成功后：隐藏 `#login-view`，显示 `#app-view`，并开始加载数据。
- 增加一个右上角“退出登录”按钮：调用 `google.accounts.oauth2.revoke(accessToken)` 并清空状态，回到登录页（加分项）。

**注意：** GIS 脚本是异步加载的，要等它加载完才能调用 `initAuth`（在 `window.onload` 里初始化）。

---

## 阶段 E：读取并清洗 Sheet 数据

### E1. 调用 Sheets API

```js
export async function fetchPeople(token) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodeURIComponent(CONFIG.RANGE)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets API ${res.status}`);
  const { values } = await res.json();
  const [header, ...rows] = values;
  return rows.map(r => ({
    name: r[0], photo: r[1], age: r[2], country: r[3], interest: r[4],
    netWorth: parseMoney(r[5])
  }));
}

function parseMoney(v) {
  return Number(String(v ?? '').replace(/[^0-9.\-]/g, '')) || 0;
}
```

### E2. 权限说明（重要）

API 是用**登录者自己的账号**去读 Sheet 的，所以**登录的账号必须有权访问该 Sheet**。

- 你自己：Sheet 的所有者，没问题
- Lisa：已在阶段 A 分享，没问题
- 其他账号：会返回 403，页面要给出友好提示：“当前账号没有该表格的访问权限”

### E3. 错误处理（体现代码质量）

- 401：token 过期，提示重新登录
- 403：无权限，显示提示
- 网络失败：显示重试按钮
- 加载中：显示 loading 状态

---

## 阶段 F：卡片样式与净资产着色（对应 Image B）

### F1. 卡片内容

每块卡片是一个 `div.element`，布局如下：

- 左上角：国家代码（如 `MY`）
- 右上角：年龄
- 中间：头像（Photo 列的 URL）
- 下方加粗：姓名
- 最下方小字：兴趣（Interest）

卡片尺寸沿用原 demo 的 120×160 px，字体用小号，姓名过长时用省略号。

### F2. 着色规则

题目规则：红 < $100K；橙 > $100K；绿 > $200K。落实为：

```js
export function colorOf(netWorth) {
  if (netWorth > 200000) return '#3A9F48'; // 绿
  if (netWorth > 100000) return '#FDCA35'; // 橙/黄（Image B 的中间色）
  return '#EF3022';                       // 红
}
```

- 用该颜色设置**边框、外发光（box-shadow）和半透明背景**，参考 Image B 右上角三张卡片的效果
- 颜色值取自 Image B 的渐变图（#EF3022 / #FDCA35 / #3A9F48），更贴近参考图
- 在 README 里说明边界值处理：恰好等于 $100K 或 $200K 的归入较低一档
- **加分：** 在底部按钮右侧加一个 LOW → HIGH 的渐变图例，与 Image B 一致

### F3. 图片加载

- `<img loading="lazy">`，并设置 `onerror` 回退为灰色占位头像
- 外链图片来自 `static.kasatria.com`，如果被跨域拦截，CSS3D 里用普通 `<img>` 显示是不受影响的（不要用 canvas 读取像素）

---

## 阶段 G：四种 3D 排列

通用做法：沿用原 demo 的结构——每块卡片创建一个 `CSS3DObject`，同时为四种布局各预先算好一个目标位置数组（`targets.table/sphere/helix/grid`），点击按钮时用 TWEEN 把每块卡片从当前位置补间到目标位置，并同时补间旋转。200 块卡片编号 `i = 0…199`。

### G1. Table：20 列 × 10 行

```js
const col = i % 20;
const row = Math.floor(i / 20);
obj.position.x = (col - 9.5) * 140;
obj.position.y = (4.5 - row) * 180;
obj.position.z = 0;
```

- 200 = 20 × 10，正好填满，**不再使用真实元素周期表的稀疏布局**
- 间距按卡片大小 120×160 加上空隙，居中显示

### G2. Sphere（球体）

沿用原 demo 的算法：

```js
const l = 200;
const phi = Math.acos(-1 + (2 * i) / l);
const theta = Math.sqrt(l * Math.PI) * phi;
position.setFromSphericalCoords(800, phi, theta);
// 再让卡片朝外：lookAt(position * 2)
```

### G3. Helix：双螺旋

原 demo 是单螺旋。双螺旋做法：把卡片按奇偶分成两条链，两条链的相位相差 π（180°）。

```js
const strand = i % 2;              // 0 或 1，决定在哪条螺旋上
const idx = Math.floor(i / 2);     // 在该螺旋上的序号 0…99
const theta = idx * 0.35 + strand * Math.PI;
const y = -(idx * 16) + 800;       // 两条链高度一致，整体居中
position.x = 900 * Math.sin(theta);
position.y = y;
position.z = 900 * Math.cos(theta);
// 卡片朝外：lookAt(x * 2, y, z * 2)
```

- 调整 `0.35`（旋转速度）和 `16`（垂直间距）让两条螺旋看起来均匀、不重叠
- 加分：可以在两链之间不加线，保持简洁

### G4. Grid：5 × 4 × 10（Image C）

```js
const x = i % 5;                        // 5 列
const y = Math.floor(i / 5) % 4;        // 4 行
const z = Math.floor(i / 20);           // 10 层
obj.position.x = (x - 2) * 400;
obj.position.y = (1.5 - y) * 400;
obj.position.z = (z - 4.5) * 1000;
```

- 5 × 4 × 10 = 200，刚好用完所有卡片
- 原 demo 的 Grid 本来就是这个尺寸，需要确认并保证 200 块都正确落位

### G5. 控制与交互

- 底部四个按钮：`TABLE / SPHERE / HELIX / GRID`
- 切换动画时长约 1–2 秒
- 使用 `TrackballControls` 允许拖拽旋转和缩放（沿用原 demo）
- 窗口缩放时更新相机与渲染器尺寸

---

## 阶段 H：部署到公网（GitHub Pages）

1. 注册/登录 GitHub，新建公开仓库 `periodic-table`。
2. 把项目文件全部推送到 `main` 分支。
3. 仓库页面 **Settings → Pages**：
   - Source 选 **Deploy from a branch**
   - Branch 选 `main`，目录选 `/ (root)`
   - 点 Save
4. 等 1–3 分钟，页面顶部出现链接 `https://你的用户名.github.io/periodic-table/`。
5. **回到 Cloud Console 核对授权来源：** 确认 Authorized JavaScript origins 里有 `https://你的用户名.github.io`（只到域名，不带 `/periodic-table`）。
6. 等几分钟让设置生效，再测试线上登录。

> 备选：Netlify / Vercel 拖拽部署也可，同样要把最终域名加入 Authorized JavaScript origins。

---

## 阶段 I：测试清单

**登录**

- [ ] 未登录时只看到登录页
- [ ] 点按钮弹出选择账号窗口
- [ ] 登录后进入 3D 页面
- [ ] 用未在测试用户名单里的账号登录，看到 access\_denied（预期行为）

**数据**

- [ ] 页面共 200 块卡片
- [ ] 名字无乱码，头像正常显示
- [ ] 国家、年龄、兴趣正确

**颜色**

- [ ] 抽查几个人：$60K 为红，$150K 为橙，$250K 为绿
- [ ] 红、橙、绿数量约为 21 / 86 / 93

**布局**

- [ ] Table 为 20 列 × 10 行
- [ ] Sphere 均匀分布
- [ ] Helix 是两条交错的螺旋
- [ ] Grid 是 5 × 4 × 10
- [ ] 四种布局之间切换流畅

**线上环境**

- [ ] 用隐身窗口访问线上链接，完整走一遍
- [ ] 用 lisa@kasatria.com 的视角检查：她已在测试用户名单中且有 Sheet 查看权限
- [ ] 浏览器控制台无报错

---

## 提交

发送邮件给 lisa@kasatria.com（或 HR 提供的联系人），内容包含：

- 网页链接
- GitHub 仓库链接
- 说明：应用处于 Google OAuth Testing 状态，已将 lisa@kasatria.com 加入测试用户；首次登录会看到“未验证应用”提示，点 Advanced → Go to ... 继续
- 说明：Google Sheet 已分享给她

---

## 常见错误排查

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| `Error 400: origin_mismatch` | 当前网址不在授权来源里 | 到 Clients 里补上，写到域名/端口，不带路径和斜杠，等几分钟 |
| `Error 403: access_denied` | 账号不在测试用户名单 | Audience → Test users 里添加 |
| 登录窗口弹出又立刻关闭 | 浏览器拦截弹窗 | 确保是用户点击触发，且允许弹窗 |
| Sheets API 返回 403 | 该账号没有 Sheet 权限，或 API 没启用 | 检查共享设置与 B2 |
| Sheets API 返回 404 | Sheet ID 或工作表名错误 | 核对 config.js |
| `google is not defined` | GIS 脚本尚未加载完 | 在 window.onload 后再初始化 |
| 名字乱码 | CSV 编码不是 UTF-8 | 转成 UTF-8 后重新导入 |
| 所有人都是红色 | Net Worth 没清洗成数字 | 检查 parseMoney，去掉 `$` 和逗号 |
| 打开 html 无法登录 | 用了 file:// | 必须通过 http://localhost 或线上域名访问 |

---

## 加分项（对应评分的“架构、质量”）

- 代码按模块拆分，配置集中在 config.js
- README：写明配置方法、部署步骤、颜色边界规则
- 加载状态、错误提示、退出登录
- LOW → HIGH 颜色图例
- 给 `colorOf` 和布局坐标函数写几个简单的单元测试
- 在手机和桌面浏览器都检查一遍

---

## 建议的下一步

按顺序做完阶段 A 和阶段 B，把 **Client ID、Sheet ID、工作表名** 三个信息准备好，我就可以直接帮你生成完整的项目代码文件（含登录页、数据读取、卡片、四种布局和双螺旋），你填入配置后部署即可。
