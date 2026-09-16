# 数字博物馆管理端

数字博物馆一体机的 Web 管理后台，基于 Art Design Pro 扩展，使用 Vue 3、TypeScript、Vite、Element Plus、Pinia 和 Tailwind CSS。

本仓库对应 `CloudService/admin-web`。登录、权限、学校、设备及 OTA 更新由相邻的 `api-server` 提供接口；数字人和 AI 应用配置目前主要保存在浏览器本地。

## 功能概览

| 模块 | 功能与当前状态 |
| --- | --- |
| 系统管理 | 用户、角色、菜单权限、登录日志和操作日志，对接 API 服务。 |
| 学校与设备 | 学校及学校管理员管理、设备学校关联、设备身份、标签和运行遥测。 |
| 版本与更新 | 上传安装包、版本下载、立即或定时发布、升级进度和设备结果查看，以及暂停、恢复、取消等任务操作。 |
| 数字人管理 | 数字人列表、形象与音色草稿、独立应用配置、按学校发布及历史版本管理。 |
| AI 配置 | 模型、知识资源、提示词和话术管理，以及讲解内容与场景预览；详见下方实现边界。 |

### 版本与更新

安装包版本使用 SemVer，例如 `1.2.3`，填写时不包含展示前缀 `v`，并与安装包内部版本保持一致。

定时发布的版本在“发布状态”列显示“定时发布”标签，下方展示 `发布时间：YYYY-MM-DD HH:mm:ss`；详情中的“计划执行”使用相同格式。时间按浏览器所在时区展示，时间缺失或无效时列表显示“待确认”。

管理员下载版本文件使用登录会话和版本管理权限；设备查询、下载安装包及上报结果使用独立的客户端接口。

### 数字人配置与发布

- 每个数字人独立保存首页综合问答、小小博物馆、央博知识库三个场景的配置，以及讲解内容和授权来源。
- 编辑保存为草稿，发布时固定形象、音色、独立配置及相关引用快照。修改草稿不会改变已发布版本。
- 发布范围支持全部学校或指定学校，学校列表来自真实学校接口。学校专属版本优先于通用版本。
- 撤回当前匹配版本后不会自动回退到旧版或通用版，需要重新发布。
- 页面支持搜索、发布状态筛选、草稿更新提示、预览和历史版本管理。

**实现边界：** 数字人及场景发布目前为浏览器本地配置快照，尚未接入服务端发布存储、真实客户端鉴权与设备下发。模拟器使用固定情境，不发起真实模型请求；形象资产服务、TTS、知识索引和正式会话服务仍需后续接入。浏览器数据不能作为多人协作或设备分发的正式数据源。

详细设计、兼容规则和验收说明见 [AI 管理设计](docs/ai-admin-design.md)。

## 本地开发

### 环境要求

- Node.js `>=20.19.0`。
- pnpm `>=8.8.0`。
- 可访问的 `api-server`，默认地址为 `http://127.0.0.1:3000`。后端所需 PostgreSQL、Redis 和管理员账号请按 API 服务 README 配置。

在本仓库目录执行：

```powershell
pnpm install
# 仅首次缺少 .env 时复制，已有配置请保留。
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
pnpm dev
```

默认开发地址为 `http://localhost:3006`，实际地址以 Vite 启动输出为准。使用 API 服务创建的管理员账号登录，菜单和按钮根据后端权限加载。

### 环境配置

通用配置在 `.env`，开发和生产配置分别在 `.env.development`、`.env.production`。本机覆盖可放入 `.env.development.local` 或 `.env.production.local`；修改后重启开发服务，生产环境需重新构建。

| 变量 | 用途与默认配置 |
| --- | --- |
| `VITE_PORT` | 开发端口，默认 `3006`。 |
| `VITE_BASE_URL` | 页面部署路径，默认 `/`，部署到子目录时相应调整。 |
| `VITE_ACCESS_MODE` | 权限模式，当前使用 `backend`。 |
| `VITE_API_URL` | 通用请求基础地址，开发环境为 `/`。 |
| `VITE_AUTH_API_URL` | 登录、设备及 OTA 等请求基础地址，开发环境为 `/`。 |
| `VITE_API_PROXY_URL` | Vite 通用 API 代理目标，默认 `http://127.0.0.1:3000`。 |
| `VITE_AUTH_API_PROXY_URL` | Vite 登录、学校、设备和 OTA 等代理目标，默认 `http://127.0.0.1:3000`。 |

Vite 开发代理同时转发 `/device-events` WebSocket。后端端口变化时，应同步调整两个代理目标。

`VITE_` 变量会进入浏览器构建产物，不应存放数据库密码、服务端令牌等秘密。`VITE_LOCK_ENCRYPT_KEY` 仅用于本地锁屏数据混淆。

## 构建与部署

```powershell
# 类型检查并构建，输出到 dist/
pnpm build

# 本地预览构建结果
pnpm serve
```

生产环境默认使用同域相对地址。静态站点服务器需要将业务 API 路径转发至 `api-server`，并为 `/device-events` 配置 WebSocket 转发，同时处理前端路由回退。Vite 开发代理不会随 `dist/` 一起部署，`pnpm serve` 也不能替代生产 API 反向代理。

分域部署时，在生产配置中设置 `VITE_API_URL` 与 `VITE_AUTH_API_URL`，并确保后端允许对应来源及 Cookie 会话。部署子目录时同时检查 `VITE_BASE_URL` 与静态服务器配置。

## 常用检查

```powershell
# TypeScript / Vue 类型检查
pnpm exec vue-tsc --noEmit

# 检查指定文件，替换为实际修改路径
pnpm exec eslint src/views/device/version/index.vue

# AI 管理与数字人场景回归检查
node scripts/test-ai-admin.cjs
node scripts/test-ai-scenes.cjs
```

AI 回归脚本覆盖发布校验、快照不变性、引用保护、凭据排除、学校版本选择及数字人独立配置等行为。提交时 Husky 和 lint-staged 会按文件类型执行配置中的 ESLint、Stylelint 和 Prettier 检查或修复。

## 目录导航

```text
src/
  api/                    接口请求
  router/                 路由与权限导航
  store/                  全局状态
  views/
    system/               系统管理
    device/               设备、遥测与版本更新
    ai/                   数字人及 AI 管理
      shared/             AI 资源、场景状态及发布组件
docs/                     功能设计与实现说明
scripts/                  回归检查与开发脚本
```

## 常见问题

- **登录或接口请求失败：** 检查 API 服务、Redis 会话存储及开发代理地址，确认浏览器保留登录 Cookie。
- **登录后看不到菜单：** 检查当前账号的角色、菜单权限与 `VITE_ACCESS_MODE`，授权调整后重新登录。
- **数字人保存后另一浏览器看不到：** 当前配置使用浏览器本地存储，尚未接入服务端同步。
- **定时发布时间与其他电脑不同：** 页面按浏览器本地时区格式化时间，检查电脑时区设置。

## 模板来源与许可

管理端基于 Art Design Pro 开发，保留原项目 [MIT 许可证](LICENSE) 及版权声明。仓库中的 `README.md` 和历史更新日志仍为模板资料，本项目中文说明以本文件为准。
