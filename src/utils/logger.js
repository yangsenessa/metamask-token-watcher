/**
 * 移动端日志工具类
 * 提供在移动设备上调试和记录日志的功能
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// 默认日志级别
let currentLogLevel = LOG_LEVELS.DEBUG;

/**
 * 设置日志级别
 * @param {number} level - 日志级别 (LOG_LEVELS 中的值)
 */
const setLogLevel = (level) => {
  if (Object.values(LOG_LEVELS).includes(level)) {
    currentLogLevel = level;
  } else {
    console.error('Invalid log level');
  }
};

/**
 * 检查当前日志级别是否应该输出
 * @param {number} level - 要检查的日志级别
 * @returns {boolean} 是否输出日志
 */
const shouldLog = (level) => level >= currentLogLevel;

/**
 * 格式化日志内容
 * @param {Array} args - 日志参数
 * @returns {string} 格式化后的日志字符串
 */
const formatLog = (...args) => {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
};

/**
 * 调试级别日志
 */
const debug = (...args) => {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    console.debug(`[DEBUG] ${formatLog(...args)}`);
  }
};

/**
 * 信息级别日志
 */
const info = (...args) => {
  if (shouldLog(LOG_LEVELS.INFO)) {
    console.info(`[INFO] ${formatLog(...args)}`);
  }
};

/**
 * 警告级别日志
 */
const warn = (...args) => {
  if (shouldLog(LOG_LEVELS.WARN)) {
    console.warn(`[WARN] ${formatLog(...args)}`);
  }
};

/**
 * 错误级别日志
 */
const error = (...args) => {
  if (shouldLog(LOG_LEVELS.ERROR)) {
    console.error(`[ERROR] ${formatLog(...args)}`);
  }
};

export default {
  LOG_LEVELS,
  setLogLevel,
  debug,
  info,
  warn,
  error,
};
