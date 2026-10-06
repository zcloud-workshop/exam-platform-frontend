# 前端 API

[文档索引](README.md)

本文列出 [src/api/](../src/api/) 当前提供的请求封装. 路径相对于 `VITE_API_BASE_URL`, 本地配置包含 `/api` 前缀. 这不是后端全部接口或服务端权限的替代文档.

## 共享请求约定

[request.ts](../src/api/request.ts) 创建 Axios 实例, 使用环境变量作为 `baseURL`, 超时为 30 秒, `withCredentials: true`. 所有领域请求复用该实例, 包括公开练习和 AI 请求.

成功拦截器返回 HTTP 响应体 `response.data`. 业务响应仍保留 `{ data: T }`, 因此:

| 请求结果 | 页面读取方式 |
| --- | --- |
| 单个对象或普通数组 | `res.data` |
| 分页列表 | `res.data.data` 为数组, `res.data.total` 为总数 |
| 文件、Excel 下载 | 原始 Blob 响应体, 通过下载工具消费 |
| 题库归档导出 | `res.data` 为归档对象, 页面再序列化为 JSON 文件 |

公共包裹、分页和错误类型见 [src/types/api.ts](../src/types/api.ts). 分页请求使用 `page`、`pageSize`; 页面默认每页 20 条. [getAllPages](../src/utils/pagination.ts) 用每页 100 条依次获取完整列表.

### 错误与会话失效

所有请求错误最终 `Promise.reject(error)`, 不会被当作成功结果返回. 提示优先采用响应 `message`; 若为数组则用 `;` 和一个空格连接, 无消息时使用国际化默认文案.

| 条件 | 当前行为 |
| --- | --- |
| 非静默请求返回 401, 当前不在首页 | 弹出错误、清除内存用户, 设置 `window.location.hash = '#/'` |
| 非静默请求返回 401, 当前 hash 为 `#/` 或空 | 弹出错误, 拦截器不清除用户或跳转 |
| `skipErrorMessage: true` 的请求失败 | 不弹出提示; 401 也不执行拦截器中的清除/跳转 |
| 其他非静默错误 | 弹出错误, 继续拒绝 Promise |

`getMe()` 是静默请求; [App](../src/App.tsx) 自己在失败时调用 `clearAuth()`. 页面访问时没有当前用户, 则由 [AuthGuard](../src/components/AuthGuard.tsx) 跳转登录页. 这两条路径不能混为同一重定向规则.

### 数据序列化

| 数据 | 前端接口约定 |
| --- | --- |
| 普通题目 `options` | 选项键到文本的对象 |
| 普通题目 `translations` | 按语言键组织的对象, 无翻译时可为 `null` |
| 草稿和提交的 `answers` | 题目 ID 到答案字符串的对象 |
| 记录响应 `answers` | 答案对象或逐题评分详情对象 |
| 归档题目 `options` / `translations` | JSON 字符串或空值, 随归档整体发送 |
| 考试起止时间 | ISO 字符串, 页面通过 `toISOString()` 生成 |

普通题目和答题请求无需额外 `JSON.stringify` 这些对象. `JSON.parse` / `JSON.stringify` 出现在题库归档文件和题库本地缓存处理中.

## 认证与用户

返回列表示业务包裹内部的类型. 认证详见 [auth.ts](../src/api/auth.ts) / [认证类型](../src/types/auth.ts), 用户详见 [users.ts](../src/api/users.ts) / [用户类型](../src/types/user.ts).

| 函数 | 方法与路径 | 参数或行为 | 返回 |
| --- | --- | --- | --- |
| `login` | `POST /auth/login` | `username`, `password`; 页面使用响应用户信息 | `LoginResponse` |
| `register` | `POST /auth/register` | `RegisterRequest`, 不发送确认密码或角色 | `UserResponse` |
| `getMe` | `GET /auth/me` | 静默恢复当前会话 | `JwtPayload` |
| `logout` | `POST /auth/logout` | 退出会话 | `{ success: boolean }` |
| `createUser` | `POST /users` | `CreateUserRequest` | `UserResponse` |
| `getUsers` | `GET /users` | 无分页参数 | `UserResponse[]` |
| `createRegistrationInvite` | `POST /users/registration-invites` | 目标系统角色, 仅超级管理员 | `RegistrationInviteResponse` |
| `getRegistrationInvites` | `GET /users/registration-invites` | 仅超级管理员, 按创建时间降序 | `RegistrationInviteResponse[]` |
| `updateUser` | `PATCH /users/:id` | `UpdateUserRequest` | `UserResponse` |
| `deleteUser` | `DELETE /users/:id` | 用户 ID | `void` |

`LoginResponse` 类型仍声明 `access_token`, 但前端会话依赖 Cookie, 登录页只读取 `user`. 注册成功后返回登录页建立会话. 当前没有用户详情或重置密码的独立请求封装.

## 题库与共享

依据: [question-banks.ts](../src/api/question-banks.ts), [题库和归档类型](../src/types/question-bank.ts).

| 函数 | 方法与路径 | 参数或行为 | 返回 |
| --- | --- | --- | --- |
| `createQuestionBank` | `POST /question-banks` | 名称、可选描述和 `isPublic` | `QuestionBankResponse` |
| `getQuestionBanks` | `GET /question-banks` | 分页、可选 `keyword`, `isPublic` | `PaginatedResult<QuestionBankResponse>` |
| `updateQuestionBank` | `PATCH /question-banks/:id` | 名称、描述、公开状态的部分更新 | `QuestionBankResponse` |
| `deleteQuestionBank` | `DELETE /question-banks/:id` | 题库 ID | `void` |
| `getBankShares` | `GET /question-banks/:bankId/shares` | 题库 ID | `BankShareResponse[]` |
| `addBankShare` | `POST /question-banks/:bankId/shares` | `userId`, `role` | `BankShareResponse` |
| `removeBankShare` | `DELETE /question-banks/:bankId/shares/:shareId` | 共享记录 ID | `void` |
| `exportBankArchive` | `GET /question-banks/:bankId/export` | 返回 JSON 业务对象, 不是文件流 | `BankArchive` |
| `importBankArchive` | `POST /question-banks/:bankId/import` | `{ archive, mode }`, mode 可选 | `BankImportSummary` |
| `createBankFromArchive` | `POST /question-banks/import` | `{ archive, name }`, 从 JSON 创建新题库 | `{ bankId, summary: BankImportSummary }` |
| `createBankFromExcel` | `POST /questions/import/new-bank` | multipart: `file`, `name`, 从 Excel 创建新题库 | `{ bankId, summary: ImportResult }` |

`BankArchive` 版本 `2` 由 `meta`, `categories`, `questions`, `images` 组成, 兼容版本 `1` 的旧归档. 图片条目为 `{ questionId, originalName, mimeType, size, optionKey?, data }`, `data` 为原文件 Base64, 不保存临时 URL. `mode` 为 `skip`, `overwrite` 或 `merge`; 页面默认 `skip`. 导入摘要包含 `categoriesImported`, `questionsImported`, `imagesImported`, `skipped`, `errors`, Excel 摘要也增加 `imagesImported`. 题库 JSON/Excel 导入导出请求单独使用 180 秒超时, 文件上限为 100 MiB.

## 分类、题目与试卷

依据: [categories.ts](../src/api/categories.ts), [questions.ts](../src/api/questions.ts), [papers.ts](../src/api/papers.ts); 字段见 [分类类型](../src/types/category.ts), [题目类型](../src/types/question.ts), [试卷类型](../src/types/paper.ts).

| 函数 | 方法与路径 | 参数或行为 | 返回 |
| --- | --- | --- | --- |
| `createCategory` | `POST /categories` | 名称、`bankId`, 可选 `parentId` | `CategoryResponse` |
| `getCategories` | `GET /categories` | query: `bankId` | `CategoryResponse[]` |
| `getCategoryTree` | `GET /categories/tree` | query: `bankId` | `CategoryResponse[]` |
| `updateCategory` | `PATCH /categories/:id` | 名称、`parentId` | `CategoryResponse` |
| `deleteCategory` | `DELETE /categories/:id` | 分类 ID | `void` |
| `createQuestion` | `POST /questions` | `CreateQuestionRequest`, 含 `bankId` | `QuestionResponse` |
| `getQuestions` | `GET /questions` | 分页、`bankId`, `type`, `categoryId`, `difficulty`, `keyword`, `locale` | `PaginatedResult<QuestionResponse>` |
| `getQuestion` | `GET /questions/:id` | 可选 query: `locale`; 当前页面未调用此封装 | `QuestionResponse` |
| `updateQuestion` | `PATCH /questions/:id` | `UpdateQuestionRequest` | `QuestionResponse` |
| `deleteQuestion` | `DELETE /questions/:id` | 题目 ID | `void` |
| `exportQuestions` | `GET /questions/export` | query: `bankId`, 可选 `categoryId`; 下载 `questions.xlsx` | Blob 下载 |
| `importQuestions` | `POST /questions/import` | query: `bankId`; multipart 字段 `file` | `ImportResult` |
| `createPaper` | `POST /papers` | 名称、时长、总分、`bankId`, `questionIds` | `PaperResponse` |
| `getPapers` | `GET /papers` | 分页、可选 `bankId`, `keyword` | `PaginatedResult<PaperResponse>` |
| `getPaper` | `GET /papers/:id` | 读取关联题目 | `PaperResponse` |
| `updatePaper` | `PATCH /papers/:id` | `UpdatePaperRequest` | `PaperResponse` |
| `deletePaper` | `DELETE /papers/:id` | 试卷 ID | `void` |

题型、记录状态和共享角色见 [枚举](../src/types/enums.ts). 编辑题目/试卷的类型不声明 `bankId`, 但当前页面复用创建时的 payload, 编辑请求实际仍可能携带它. 类型与运行时 payload 不是完全等价的服务端契约.

## 考试与答题记录

依据: [exams.ts](../src/api/exams.ts), [records.ts](../src/api/records.ts), [考试类型](../src/types/exam.ts), [记录类型](../src/types/record.ts).

| 函数 | 方法与路径 | 参数或行为 | 返回 |
| --- | --- | --- | --- |
| `createExam` | `POST /exams` | 名称、`paperId`, 起止时间、可选 `showScore`, `studentIds` | `ExamResponse` |
| `getExams` | `GET /exams` | 分页、可选 `keyword`, `bankId` | `PaginatedResult<ExamResponse>` |
| `getExam` | `GET /exams/:id` | 考试详情与试卷 | `ExamResponse` |
| `updateExam` | `PATCH /exams/:id` | 名称、时间、`showScore`, `studentIds`; 不含 `paperId` | `ExamResponse` |
| `deleteExam` | `DELETE /exams/:id` | 考试 ID | `void` |
| `submitExam` | `POST /exams/:examId/records` | `{ answers }` | `RecordResponse` |
| `saveDraft` | `PUT /exams/:examId/records/draft` | `{ answers }` | `RecordResponse` |
| `getDraft` | `GET /exams/:examId/records/draft` | 恢复答案 | `DraftResponse` |
| `getRecords` | `GET /exams/:examId/records` | query: `page`, `pageSize` | `PaginatedResult<RecordResponse>` |
| `getStats` | `GET /exams/:examId/records/stats` | 统计当前考试 | `StatsResponse` |

`StatsResponse` 包含 `count`、`max`、`min`、`avg`. 前端不实现计分或统计算法. 作答页复用普通 `QuestionResponse` 类型, 但不读取其中的标准答案和解析; 学生响应的敏感字段裁剪必须由后端完成, 类型声明本身不提供这层保护.

## 公开练习

请求与类型集中在 [practice.ts](../src/api/practice.ts).

| 函数 | 方法与路径 | 参数或行为 | 返回 |
| --- | --- | --- | --- |
| `getPublicBanks` | `GET /practice/banks` | 公开题库数组 | `PublicBankResponse[]` |
| `getPracticeQuestionPage` | `GET /practice/banks/:bankId/question-pages` | query: `mode, page, pageSize, keyword?, seed?, collection?, questionId?` | `PracticeQuestionPageResponse` |
| `getPracticeQuestion` | `GET /practice/banks/:bankId/questions/:questionId` | 单题读取和图片链接刷新 | `PracticeQuestionResponse` |
| `checkPracticeAnswer` | `POST /practice/banks/:bankId/questions/:questionId/check` | `{ userAnswer }` | `CheckAnswerResponse` |
| `getMyPracticeSummary` | `GET /practice/mine/summary` | 当前用户的公开题库练习统计 | `PracticeSummaryResponse` |
| `getMyPracticeQuestions` | `GET /practice/mine/questions` | query: `collection, bankId?, page, pageSize` | `PaginatedResult<MyPracticeQuestionResponse>` |
| `getMyPracticeRecords` | `GET /practice/mine/records` | query: `bankId?, page, pageSize` | `PaginatedResult<PracticeRecordResponse>` |
| `favoritePracticeQuestion` | `PUT /practice/banks/:bankId/questions/:questionId/favorite` | 收藏当前题目 | `{ isFavorite: boolean }` |
| `unfavoritePracticeQuestion` | `DELETE /practice/banks/:bankId/questions/:questionId/favorite` | 取消收藏当前题目 | `{ isFavorite: boolean }` |
| `removeWrongPracticeQuestion` | `DELETE /practice/mine/wrong-questions/:questionId` | 移出当前用户错题本 | `{ success: boolean }` |

练习题型中的翻译只含标题和选项, 题目响应不声明答案或解析, 同时包含 `isFavorite` 和 `isWrong`, 匿名均为 `false`. `check` 返回 `correct`、`graded`、`answer` 和 `analysis`, 页面在提交后展示. 简答与编程题的 `graded=false`, 页面展示参考答案, 不显示错误判定. 登录提交由服务端保存, 客观题答错加入错题本, 答对自动移出; 匿名提交不保存.

分页业务响应为 `{ data, total, questionTotal, practiceTotal, page, pageSize, seed }`, 页面每批请求最多 50 道, 题目 `index` 是从 0 开始的本次练习位置. `total` 为可练习范围内的搜索匹配数量, `questionTotal` 为题库总题数, `practiceTotal` 为当前用户可练习题数. 未登录仅可顺序练习前 50 题, 随机模式和其他题目需要登录; 超范围单题读取和答案核对返回 `403`. 导航依据 `practiceTotal`, 小于 `questionTotal` 时提示登录后继续. 搜索响应额外返回匹配位置数组 `matchingIndexes`, 用于切题时同步搜索导航页. 后续请求复用 `seed` 保持随机顺序; `keyword` 在后端检索可练习范围, 匿名时不超过前 50 题. 页面保留已加载题目及批次, 避免重复请求和选项重排.

`collection` 取 `wrong` 或 `favorites`, 需要登录, 在分页和搜索前限制题目集合. 此时 `questionTotal` 和 `practiceTotal` 对应集合数量. `questionId` 用于首次请求定位题目, 响应包含实际 `page` 和 `initialIndex`; 不在当前可练习范围时返回 `404`. 集合因答对或取消收藏变化后, 页面清空旧批次并重新开始复习, 不复用已失效索引.

所有 `/mine` 和收藏写入接口需要登录. 个人列表沿用通用分页包裹, 集合列表不含参考答案或解析. 练习记录包含本人提交的原始选项键答案及提交时参考答案/解析快照, `correct=null` 表示未自动判分. 统计和列表只包括当前仍公开的题库. 正确率为 `correctCount / gradedCount`, 没有已判分作答时显示空值.

练习题目通过 `images` 返回附图, 类型见 [题目类型](../src/types/question.ts). `optionKey=null` 的图片显示在题干下方, 其他图片按原始选项键显示在对应选项内, 不受选项重排或语言切换影响. 图片使用响应中的预签名 `url`; 链接过期导致加载失败时只请求当前单题并更新图片信息, 保留题目顺序、答案和判题结果. 请求失败或图片无法加载时显示重新加载按钮.

## AI

依据: [ai.ts](../src/api/ai.ts), [AI 类型](../src/types/ai.ts). 草稿展示与保存步骤见 [AI 业务流程](business-flows.md#ai-辅助).

| 函数 | 方法与路径 | 参数或行为 | 返回 |
| --- | --- | --- | --- |
| `generateQuestions` | `POST /ai/questions` | `topic`, `type`, `bankId`; 可选数量、难度、分类、语言 | `GenerateQuestionsResponse` |
| `generateAnalysis` | `POST /ai/analysis/:id` | 题目 ID | `QuestionResponse` |
| `rulePaperCompose` | `POST /ai/smart-paper/rule` | 名称、时长、总分、`bankId`, `rules` | `PaperResponse` |
| `aiPaperCompose` | `POST /ai/smart-paper/ai` | 名称、时长、总分、`bankId`, `subject`; 可选难度偏好和分类 | `PaperResponse` |
| `translateQuestion` | `POST /ai/translate/:id` | `{ targetLocale }`, 值为 `zh` 或 `en` | `TranslateQuestionResponse` |

翻译响应包括源语言、目标语言和翻译草稿. 用户确认后由 `updateQuestion` 保存, 翻译请求本身不承担该保存步骤. 生成题目的响应类型使用 `QuestionResponse[]`, 不能据此推断页面已经完成入库.

## 文件与日志

依据: [files.ts](../src/api/files.ts), [下载工具](../src/api/helpers.ts), [logs.ts](../src/api/logs.ts), [文件类型](../src/types/file.ts), [日志类型](../src/types/log.ts).

| 函数 | 方法与路径 | 参数或行为 | 返回 |
| --- | --- | --- | --- |
| `uploadFile` | `POST /files/upload` | multipart 字段 `file` | `FileResponse` |
| `getFiles` | `GET /files` | 分页 | `PaginatedResult<FileResponse>` |
| `downloadFileById` | `GET /files/:id` | 文件 ID, 浏览器保存名称取 `originalName` | Blob 下载 |
| `deleteFile` | `DELETE /files/:id` | 文件 ID | `void` |
| `getLogs` | `GET /logs` | 分页、`userId`, `username`, `action`, `resource`, `startDate`, `endDate` | `PaginatedResult<LogResponse>` |

下载工具 `downloadFile(url, filename, params?, timeout?)` 用 `responseType: 'blob'` 获取内容, 超时默认 30000 毫秒, 通过 `saveBlob(blob, filename)` 创建对象 URL, 触发下载并释放 URL. 它返回 `Promise<void>`, 不是供调用方继续处理的 Blob. JSON 归档复用 `saveBlob`; 题库列表中的 Excel 导出使用题库名称作为文件名, 超时为 180000 毫秒.

此处不保留前端无法核实的限流次数、Cookie 有效期、删除约束、上传容量或数据库事务细节. 需要这些规则时查阅对应后端实现与接口文档.
