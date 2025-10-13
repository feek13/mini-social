-- 添加链接预览功能
-- 运行此脚本前请确保已备份数据库

-- 1. 为 posts 表添加 link_preview 字段（JSONB 类型）
ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_preview JSONB;

-- 2. 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_posts_link_preview ON posts USING GIN (link_preview);

-- 3. 添加注释
COMMENT ON COLUMN posts.link_preview IS '链接预览数据（包含 url, title, description, image, siteName, favicon）';
