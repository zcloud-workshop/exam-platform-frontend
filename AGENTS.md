# 仓库协作指引

本仓库是在线考试平台前端. 详细实现说明集中在 [docs/README.md](docs/README.md), 修改前先阅读相关源文件和文档.

## 环境与验证

- 使用 nvm, 严格遵循 [.nvmrc](.nvmrc). nvm 不可用时先询问用户, 不静默切换 Node 来源.
- 包管理使用 pnpm. 安装、运行与验证命令见 [开发与运行](docs/development.md).
- 修改后执行最小有意义的验证. 当前无自动化测试框架, 不存在 `pnpm test` 脚本.
- 使用中文回复、英文标点, 不使用表情符号.

## 修改原则

- 先搜索现有实现和调用点, 确认影响范围, 再修改文件.
- 修改前检查: 是否足够简单, 是否只涉及当前需求, 是否符合现有风格.
- 优先复用现有组件、请求封装和工具函数, 不为一次性逻辑建立抽象.
- 函数签名变化时更新全部调用点. 保留既有外部行为, 清理未使用代码和临时文件.
- 每个文件单独使用 `git commit -m` 提交, 格式为 `<type>: <desc>`.

## 实现约束

- 路由使用 HashRouter. 分类、题目、试卷、考试管理和 AI 都是题库详情标签页, 不要当作独立路由. 见 [路由与权限](docs/permissions.md).
- 页面请求经过 `src/api/` 和共享 Axios 实例. 拦截器去掉 Axios 外层, 业务包裹仍为 `{ data: T }`; 分页列表读取 `res.data.data`.
- 会话通过 HttpOnly Cookie 维持. `authStore` 只保存当前用户和初始化状态, 不添加 localStorage Token 认证.
- 区分账号角色和 `currentBank.permission`. 前端入口控制不能替代后端鉴权.
- 普通题目接口的 `options`、`translations` 和答题 `answers` 是对象. 题库归档中的 `options`、`translations` 才保留 JSON 字符串.
- 复用 `usePagination`、`getAllPages` 和下载工具. 新增响应式逻辑分支使用 `useBreakpoint().isMobile`.
- 样式由 `src/styles.css`、Ant Design 主题和局部内联样式共同组成. 复用现有 CSS 变量和主题配置.
- 新文案同步维护 `src/locales/zh.ts` 与 `src/locales/en.ts`; 日期显示复用 `formatDateTime`.
- 详细字段以 `src/types/` 和 `src/api/` 为准, 不在文档中复制整套类型或示例实现.

## 文档维护

架构调整更新 [architecture.md](docs/architecture.md), 权限调整更新 [permissions.md](docs/permissions.md), 用户流程调整更新 [business-flows.md](docs/business-flows.md), 接口调整更新 [frontend-api-doc.md](docs/frontend-api-doc.md). 图使用 Mermaid, 保留可编辑源文本.
