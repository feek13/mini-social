# MiniSocial - 迷你社交平台

一个简洁优雅的迷你社交平台，使用 Next.js 15 和 Supabase 构建。

## 功能特性

- ✨ 用户注册和登录
- 📝 发布和删除动态（280字符限制）
- ❤️ 点赞功能（实时更新）
- 👤 个人主页（查看用户信息和动态）
- 🎨 现代化 UI 设计（响应式布局）
- 🌈 渐变头像系统
- ⚡ 优化的用户体验（骨架屏、乐观更新）

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS v4
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **图标**: Lucide React
- **部署**: Vercel

## 本地开发

### 环境要求

- Node.js 18.x 或更高版本
- npm 或 yarn 或 pnpm

### 安装步骤

1. 克隆仓库
```bash
git clone <your-repo-url>
cd mini-social
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量

创建 `.env.local` 文件并添加以下内容：
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. 设置 Supabase 数据库

在 Supabase SQL Editor 中运行 `supabase-setup.sql` 文件中的 SQL 语句，创建必要的表和触发器。

5. 启动开发服务器
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 部署到 Vercel

### 方法一：通过 Vercel Dashboard（推荐）

1. 访问 [Vercel](https://vercel.com) 并登录
2. 点击 "Add New Project"
3. 导入你的 Git 仓库
4. 配置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`: 你的 Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 你的 Supabase Anon Key
5. 点击 "Deploy"

### 方法二：通过 Vercel CLI

1. 安装 Vercel CLI
```bash
npm install -g vercel
```

2. 登录到 Vercel
```bash
vercel login
```

3. 部署项目
```bash
vercel
```

4. 在 Vercel Dashboard 中添加环境变量

### 部署后配置

1. **Supabase 设置**
   - 确保在 Supabase 项目中运行了 `supabase-setup.sql`
   - 配置 Row Level Security (RLS) 策略
   - 在 Supabase 认证设置中添加你的 Vercel 域名到允许的重定向 URL

2. **环境变量检查**
   - 确认 Vercel 项目设置中的环境变量正确配置
   - 重新部署以应用环境变量更改

## 项目结构

```
mini-social/
├── app/                      # Next.js App Router
│   ├── api/                 # API 路由
│   │   ├── auth/           # 认证相关 API
│   │   ├── posts/          # 动态相关 API
│   │   └── profile/        # 用户资料 API
│   ├── login/              # 登录页面
│   ├── signup/             # 注册页面
│   ├── profile/            # 个人主页
│   ├── providers/          # React Context
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 首页
│   └── globals.css         # 全局样式
├── components/              # React 组件
│   ├── Avatar.tsx          # 头像组件
│   ├── Navbar.tsx          # 导航栏
│   ├── PostCard.tsx        # 动态卡片
│   ├── PostForm.tsx        # 发布表单
│   ├── CommentList.tsx     # 评论列表
│   └── CommentForm.tsx     # 评论表单
├── lib/                     # 工具函数和配置
│   ├── supabase.ts         # Supabase 客户端
│   └── utils.ts            # 通用工具函数
├── types/                   # TypeScript 类型定义
│   └── database.ts         # 数据库类型
├── public/                  # 静态资源
├── supabase-setup.sql      # 数据库初始化脚本
└── package.json            # 项目依赖
```

## 可用脚本

- `npm run dev` - 启动开发服务器（使用 Turbopack）
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行 ESLint 检查

## 环境变量说明

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 是 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | 是 |

## 数据库架构

主要数据表：
- `profiles` - 用户资料
- `posts` - 动态
- `likes` - 点赞记录
- `comments` - 评论（预留）

详细的数据库结构请查看 `supabase-setup.sql`。

## 常见问题

### 部署后无法连接到 Supabase

确保：
1. 环境变量已正确配置
2. Supabase 项目处于活跃状态
3. 已在 Supabase 中运行了数据库初始化脚本

### 注册时提示 email rate limit

这是 Supabase 的安全限制。在开发环境中，你可以在 Supabase Dashboard 的 Authentication 设置中禁用邮箱确认。

### 构建失败

1. 检查 Node.js 版本（需要 18.x 或更高）
2. 删除 `node_modules` 和 `.next` 文件夹后重新安装依赖
3. 确保所有 TypeScript 类型错误已解决

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue 或联系项目维护者。

---

**🚀 Happy Coding!**
