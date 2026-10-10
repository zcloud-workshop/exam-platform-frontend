# 路由与权限

[文档索引](README.md)

权限分为三部分: 路由是否需要登录, 账号角色能否进入页面, 当前题库权限能否操作内容. 以下表格描述前端实现, 不替代服务端授权规则.

## 路由

所有路径均位于 URL 的 `#` 后. 路由依据 [src/router/index.tsx](../src/router/index.tsx).

| 路径 | 页面 | 前端访问条件 | 布局 |
| --- | --- | --- | --- |
| `/` | 首页, 展示前 4 个公开题库 | 公开 | PublicHeader |
| `/practice` | 全部公开题库 | 公开 | PublicHeader |
| `/practice/mine` | 我的错题、我的收藏、练习记录 | 登录, 所有账号角色 | PublicHeader |
| `/practice/:bankId` | 单题库练习 | 匿名限顺序前 50 题, 全部题目和随机模式需登录 | PublicHeader |
| `/login` | 登录 | 公开 | PublicHeader |
| `/register` | 邀请码注册 | 公开, 需有效一次性邀请码 | PublicHeader |
| `/exams` | 按时间分组的考试列表 | 登录 | PublicHeader |
| `/dashboard` | 仪表盘 | 登录 | AppLayout |
| `/question-banks` | 题库列表与详情标签 | 登录 | AppLayout |
| `/files` | 文件管理 | 登录 | AppLayout |
| `/admin/users` | 用户管理 | `super_admin` | AppLayout |
| `/admin/logs` | 操作日志 | `super_admin` | AppLayout |
| `/exams/:id/take` | 考试作答 | `student` | AppLayout |
| `/exams/:id/records` | 成绩与统计 | `super_admin`, `question_admin`, `teacher` | AppLayout |
| `/403` | 无权限提示 | 公开 | PublicHeader |
| `*` | 未匹配地址的 404 提示 | 公开 | PublicHeader |

分类、题目、试卷、考试管理和 AI 是题库详情中的组件, 没有 `/categories`、`/questions`、`/papers`、`/ai` 独立路由.

[AuthGuard](../src/components/AuthGuard.tsx) 在会话初始化前不渲染子页, 初始化后无用户则跳转 `/login`. [RoleGuard](../src/components/RoleGuard.tsx) 按允许角色列表匹配, 不匹配则跳转 `/403`. 请求发生 401 时另有拦截器处理, 见 [API 错误行为](frontend-api-doc.md#错误与会话失效).

PublicHeader 和管理侧栏为登录用户提供我的练习入口. 收藏、错题移除、个人练习查询以及题库内的错题/收藏练习范围都需要登录, 只展示当前仍公开的题库内容. 个人数据归属与公开状态由后端校验.

## 账号角色

角色来自 [Role 枚举](../src/types/enums.ts). 前端没有角色等级继承, 每处显式判断允许的角色.

| 能力 | super_admin | question_admin | teacher | student |
| --- | --- | --- | --- | --- |
| 仪表盘与考试列表 | 可进入 | 可进入 | 可进入 | 可进入 |
| 用户管理和日志页 | 可进入 | 无入口 | 无入口 | 无入口 |
| 生成, 查看和删除注册邀请码 | 可操作 | 无入口 | 无入口 | 无入口 |
| 考试作答页 | 不允许 | 不允许 | 不允许 | 可进入 |
| 成绩统计页 | 可进入 | 可进入 | 可进入 | 不允许 |
| 文件上传按钮 | 显示 | 显示 | 显示 | 隐藏 |
| 文件删除按钮 | 显示 | 显示 | 隐藏 | 隐藏 |
| 题库列表的编辑、删除、共享、公开开关 | 所有返回题库 | 所有返回题库 | 自己创建的题库 | 仅当创建者匹配 |

当前 `/question-banks` 和 `/files` 没有 RoleGuard, 侧栏对所有登录用户显示这两个入口. 新建题库按钮也没有账号角色判断. 这不表示服务端允许所有账号使用对应接口; 可访问数据、学生考试分配和最终操作权限由服务端决定.

依据: [AppLayout](../src/components/Layout/AppLayout.tsx), [题库列表](../src/pages/QuestionBanks/index.tsx), [文件页](../src/pages/Files/index.tsx).

## 题库权限

进入题库后, 按接口返回的 `currentBank.permission` 控制标签与操作. 缺省时题库详情按 `viewer` 展示, 子页不会开放写操作. 管理员在详情页同样依赖这个返回字段.

| 标签或操作 | owner | editor | exam_manager | viewer |
| --- | --- | --- | --- | --- |
| 查看分类、题目、试卷标签 | 是 | 是 | 是 | 是 |
| 新建或编辑分类、题目、试卷 | 是 | 是 | 否 | 否 |
| 删除分类、题目、试卷 | 是 | 否 | 否 | 否 |
| 题目 Excel 导入与导出 | 是 | 是 | 否 | 否 |
| 查看考试标签, 新建或编辑考试 | 是 | 否 | 是 | 否 |
| 删除考试 | 是 | 否 | 否 | 否 |
| 查看和使用 AI 标签 | 是 | 是 | 否 | 否 |
| 导出题库 JSON 归档 | 是 | 是 | 是 | 是 |
| 导入题库 JSON 归档 | 是 | 是 | 否 | 否 |
| 详情页共享管理 | 是 | 否 | 否 | 否 |

题库列表的共享按钮采用账号角色或创建者判断, 详情页共享按钮采用 `owner` 判断. 共享弹窗只列出除当前用户外的教师, 可授予 `viewer`、`editor` 或 `exam_manager`; `owner` 不是可分配的共享角色.

依据: [题库与共享](../src/pages/QuestionBanks/index.tsx), [分类](../src/pages/Categories/index.tsx), [题目](../src/pages/Questions/index.tsx), [试卷](../src/pages/Papers/index.tsx), [考试](../src/pages/Exams/index.tsx), [AI](../src/pages/AI/index.tsx).
