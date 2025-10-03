// 搜索历史管理工具函数

const SEARCH_HISTORY_KEY = 'mini-social-search-history'
const MAX_HISTORY_ITEMS = 10

export interface SearchHistory {
  query: string
  timestamp: number
}

/**
 * 获取搜索历史
 */
export function getSearchHistory(): SearchHistory[] {
  if (typeof window === 'undefined') return []

  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!history) return []

    const parsed = JSON.parse(history) as SearchHistory[]
    // 按时间倒序排列
    return parsed.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error('Failed to get search history:', error)
    return []
  }
}

/**
 * 添加搜索到历史
 */
export function addSearchHistory(query: string): void {
  if (typeof window === 'undefined') return
  if (!query.trim()) return

  try {
    const history = getSearchHistory()

    // 检查是否已存在相同的搜索词
    const existingIndex = history.findIndex(item => item.query === query)

    if (existingIndex !== -1) {
      // 如果已存在，删除旧的记录
      history.splice(existingIndex, 1)
    }

    // 添加新记录到开头
    history.unshift({
      query,
      timestamp: Date.now()
    })

    // 限制历史记录数量
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS)

    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(trimmedHistory))
  } catch (error) {
    console.error('Failed to add search history:', error)
  }
}

/**
 * 从历史中删除单条记录
 */
export function removeSearchHistory(query: string): void {
  if (typeof window === 'undefined') return

  try {
    const history = getSearchHistory()
    const filtered = history.filter(item => item.query !== query)
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to remove search history:', error)
  }
}

/**
 * 清空所有搜索历史
 */
export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY)
  } catch (error) {
    console.error('Failed to clear search history:', error)
  }
}
