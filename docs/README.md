# 项目文档

本目录描述当前前端仓库的实际实现, 核对日期为 2026-10-03. 后端内部实现、部署参数和数据库约束以对应后端仓库为准.

## 阅读顺序

| 文档 | 内容 | 主要代码依据 |
| --- | --- | --- |
| [开发与运行](development.md) | 环境、启动、构建、验证和排查 | [package.json](../package.json), [.nvmrc](../.nvmrc), [Vite 配置](../vite.config.ts) |
| [Docker + Nginx 部署](docker-deployment.md) | 容器构建、后端网络、HTTPS 入口、更新和回滚 | [Dockerfile](../Dockerfile), [Compose](../compose.yaml), [Nginx 配置](../deploy/nginx/default.conf.template) |
| [系统架构](architecture.md) | 组件架构图、业务对象关系、状态与样式 | [App](../src/App.tsx), [路由](../src/router/index.tsx), [类型](../src/types/) |
| [路由与权限](permissions.md) | 路由表、账号角色、题库权限矩阵 | [路由](../src/router/index.tsx), [题库页](../src/pages/QuestionBanks/index.tsx) |
| [业务流程](business-flows.md) | 登录、练习、内容管理、考试、归档和 AI 流程图 | [页面实现](../src/pages/) |
| [前端 API](frontend-api-doc.md) | 请求约定、接口清单、字段边界 | [API 封装](../src/api/), [类型](../src/types/) |

## 文档约定

- 描述已实现行为. 未接通入口和代码边界在对应流程中说明, 不把开发计划写成已有功能.
- 路由、权限和接口各自维护一份说明, 其他文档通过链接引用.
- 类型、校验和业务细节链接到源文件, 避免复制代码后失去同步.
- 图形保存在 Markdown 的 Mermaid 代码块中, 可在支持 Mermaid 的 Markdown 阅读器中查看和编辑. 语法参考 [Mermaid 官方文档](https://mermaid.js.org/intro/).

返回 [项目首页](../README.md).
