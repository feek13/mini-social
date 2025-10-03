# Supabase 数据库设置指南

在使用注册功能之前，需要在 Supabase 中设置数据库表。

## 设置步骤

### 1. 打开 Supabase Dashboard

访问 [Supabase Dashboard](https://app.supabase.com/)，选择你的项目。

### 2. 打开 SQL Editor

在左侧菜单中，点击 **SQL Editor**。

### 3. 创建新查询

点击 **New Query** 按钮。

### 4. 运行设置脚本

将 `supabase-setup.sql` 文件中的内容复制并粘贴到 SQL Editor 中，然后点击 **Run** 按钮。

或者，你可以直接复制下面的 SQL 代码：

```sql
-- 创建 profiles 表（用户资料）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为 username 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- 启用行级安全（RLS）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取用户资料
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- 用户只能更新自己的资料
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 允许插入新用户资料（注册时）
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 创建 posts 表（动态/帖子）
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);

-- 启用 RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Posts 策略
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);
```

### 5. 验证表已创建

在左侧菜单中点击 **Table Editor**，你应该能看到以下表：
- `profiles`
- `posts`

### 6. （可选）启用邮箱确认

如果你想要求用户在注册后确认邮箱：

1. 进入 **Authentication** > **Settings**
2. 在 **Email** 部分，启用 **Confirm email**
3. 配置邮件模板（可选）

**注意**：开发时，为了方便测试，可以暂时禁用邮箱确认。

## 完成！

现在你可以测试注册功能了。访问 `http://localhost:3000/signup` 开始注册。

## 故障排除

### 错误：relation "profiles" does not exist

确保你已经运行了 SQL 脚本来创建 `profiles` 表。

### 错误：permission denied

检查 RLS（行级安全）策略是否正确设置。你可以在 **Authentication** > **Policies** 中查看策略。

### 注册后没有跳转

检查浏览器控制台是否有错误信息。确保环境变量配置正确。
