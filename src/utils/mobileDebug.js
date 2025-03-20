/**
 * 移动端调试工具
 * 用于在移动设备上提供调试控制台
 */
import VConsole from 'vconsole';
import logger from './logger';

let vConsole = null;

/**
 * 初始化移动端调试工具
 * @param {boolean} enableOnProduction - 是否在生产环境下启用
 * @param {Object} options - VConsole 选项
 */
export const initMobileDebug = (enableOnProduction = false, options = {}) => {
  // 判断是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // 判断是否为生产环境
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 如果是移动设备，且在开发环境或者指定在生产环境启用
  if (isMobile && (!isProduction || enableOnProduction)) {
    // 初始化 VConsole
    vConsole = new VConsole(options);
    logger.info('VConsole 已启用');

    // 添加一个自定义的 vConsole 插件，用于记录应用信息
    if (vConsole) {
      console.info('应用版本:', process.env.npm_package_version);
      console.info('运行环境:', process.env.NODE_ENV);
      console.info('用户代理:', navigator.userAgent);
    }
    
    return true;
  }
  
  logger.debug('VConsole 未启用', {
    isMobile,
    isProduction,
    enableOnProduction
  });
  
  return false;
};

/**
 * 销毁 VConsole 实例
 */
export const destroyVConsole = () => {
  if (vConsole) {
    vConsole.destroy();
    vConsole = null;
    logger.info('VConsole 已销毁');
    return true;
  }
  return false;
};

export default {
  initMobileDebug,
  destroyVConsole,
};
