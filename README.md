# 在线考试平台前端

基于 React 的在线考试平台, 提供公开练习、题库协作、试卷管理、考试作答、成绩查看和 AI 辅助功能.

## 启动

```sh
nvm install
nvm use
pnpm install
pnpm dev
```

Node 版本由 [.nvmrc](.nvmrc) 指定. 本地开发入口为 [http://localhost:5173](http://localhost:5173), API 地址由 `VITE_API_BASE_URL` 配置. 账号由后端提供, 本仓库不包含注册或初始化账号流程.

## 文档

所有详细文档位于 [docs/](docs/README.md):

- [开发与运行](docs/development.md): 环境、命令、构建和排查.
- [系统架构](docs/architecture.md): 组件架构图、数据关系图、状态和目录职责.
- [路由与权限](docs/permissions.md): 页面入口、账号角色和题库权限.
- [业务流程](docs/business-flows.md): 登录、练习、题库、考试、归档和 AI 流程图.
- [前端 API](docs/frontend-api-doc.md): 当前请求封装、数据约定和接口清单.

开发协作规则见 [AGENTS.md](AGENTS.md).
