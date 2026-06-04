import { logger } from './logger'

// ─── In-Memory Cache (fallback when Redis disabled) ────────
const memCache = new Map<string, { value: any; expires: number }>()

// ─── Cache Get ─────────────────────────────────────────────
export const cache = {
  async get(key: string): Promise<any | null> {
    try {
      const item = memCache.get(key)
      if (!item) return null
      if (Date.now() > item.expires) {
        memCache.delete(key)
        return null
      }
      return item.value
    } catch (err) {
      logger.warn(`Cache get error for key ${key}:`, err)
      return null
    }
  }
}

// ─── Cache Set ─────────────────────────────────────────────
export const setCache = async (
  key: string,
  value: any,
  ttlSeconds = 300
): Promise<void> => {
  try {
    memCache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000
    })
  } catch (err) {
    logger.warn(`Cache set error for key ${key}:`, err)
  }
}

// ─── Cache Delete ──────────────────────────────────────────
export const deleteCache = async (pattern: string): Promise<void> => {
  try {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1)
      for (const key of memCache.keys()) {
        if (key.startsWith(prefix)) memCache.delete(key)
      }
    } else {
      memCache.delete(pattern)
    }
  } catch (err) {
    logger.warn(`Cache delete error for pattern ${pattern}:`, err)
  }
}

// ─── Clear All Cache ───────────────────────────────────────
export const clearAllCache = async (): Promise<void> => {
  memCache.clear()
  logger.info('Cache cleared')
}
