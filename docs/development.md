# 开发与运行

[文档索引](README.md)

## 环境

| 项目 | 当前配置 |
| --- | --- |
| Node | [.nvmrc](../.nvmrc) 指定 `v24.13.0`, 使用 nvm |
| 包管理 | pnpm, 依赖锁定在 [pnpm-lock.yaml](../pnpm-lock.yaml) |
| UI | React 19, Ant Design 6 |
| 构建与类型 | Vite 8, TypeScript 6 |
| 路由与状态 | React Router 7, Zustand 5 |
| 请求与语言 | Axios, i18next, react-i18next, dayjs |

依赖版本以 [package.json](../package.json) 和锁文件为准.

## 首次启动

在仓库根目录执行:

```sh
nvm install
nvm use
pnpm install
pnpm dev
```

nvm 不可用时先修复环境, 不静默回退到系统 Node. 项目没有固定 pnpm 版本字段.

开发地址通常为 [http://localhost:5173](http://localhost:5173), 以终端实际输出为准. 本仓库没有后端进程或数据库启动脚本, 联调前需单独启动后端并取得账号.

## API 地址

[.env](../.env) 当前配置:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api
```

个人环境可在已被 Git 忽略的 `.env.local` 中覆盖同名变量. 修改后重启开发服务; 生产环境需要重新构建.

[Vite 配置](../vite.config.ts) 只配置 React 插件和 `@` 别名, 未设置开发代理. 浏览器直接访问 API 地址, 跨域与 Cookie 设置由后端配合. `VITE_` 变量会进入浏览器产物, 不应放入服务端密钥.

## 命令

| 命令 | 行为 |
| --- | --- |
| `pnpm dev` | 启动 Vite 开发服务 |
| `pnpm lint` | 使用 [ESLint 配置](../eslint.config.js) 检查代码 |
| `pnpm build` | 执行 `tsc -b` 和 `vite build`, 产物写入 `dist/` |
| `pnpm preview` | 本地预览构建产物 |

当前未配置测试框架、`test` 脚本或 Markdown 检查脚本. 修改代码时执行对应 lint/build; 修改文档时检查本地链接、代码引用和 Mermaid 渲染.

## 构建与发布

```sh
nvm use
pnpm install --frozen-lockfile
pnpm build
pnpm preview
```

发布对象是 `dist/` 下的静态文件. 构建时必须指定目标 API 地址. 当前没有自定义 Vite `base`, 按站点根路径使用; 若要放到子目录, 需另行核对资源路径配置.

应用路由位于 `#` 后, 例如 `/#/question-banks`. 分类、题目和试卷没有独立 URL, 从题库详情进入. 完整入口见 [路由与权限](permissions.md).

服务器部署使用 [Docker + Nginx](docker-deployment.md). Docker 构建时固定 API 地址为 `/api`, Nginx 加入已有后端网络并代理请求; 已有 HTTPS 入口负责 TLS, 前端默认发布到宿主机 `127.0.0.1:8080`.

## 联调与验证

| 现象 | 检查位置 |
| --- | --- |
| API 请求失败 | 浏览器 Network 中的实际请求 URL, 后端连通性, CORS 与 Cookie 配置 |
| 刷新后用户状态未恢复 | `GET /auth/me` 的响应, 请求是否携带 Cookie, [App](../src/App.tsx) 初始化逻辑 |
| 进入受保护页跳到登录 | [AuthGuard](../src/components/AuthGuard.tsx) 的 `initialized` 和 `user` |
| 请求 401 后回首页 | [请求拦截器](../src/api/request.ts) 的非静默、非首页分支 |
| 题库操作按钮缺失 | 当前题库返回的 `permission`, 对照 [权限矩阵](permissions.md) |
| 普通接口数据层级不对 | 业务对象用 `res.data`, 分页数组用 `res.data.data`, 见 [API 约定](frontend-api-doc.md) |
| 颜色或文案切换不同步 | [ThemeProvider](../src/components/ThemeProvider.tsx), [主题状态](../src/stores/themeStore.ts), [语言初始化](../src/locales/index.ts) |

业务改动需要按相关 [业务流程](business-flows.md) 联调, 覆盖实际涉及的账号角色、题库权限、桌面/移动布局和中英文主题状态. 本仓库不能独立验证服务端鉴权、判分和数据删除约束.
