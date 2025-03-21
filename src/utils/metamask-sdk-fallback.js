/**
 * MetaMask SDK 备用实现
 * 当从CDN加载MetaMask SDK失败时使用
 * 提供基本功能，确保应用仍能运行
 */

export class MetaMaskSDK {
  constructor(options = {}) {
    console.log('[SDK Fallback] Initializing MetaMask SDK fallback implementation');
    this.options = options;
    this.isConnected = false;
    this.activeProvider = null;
    this._setupDummyProvider();
    
    // 记录初始化参数，便于调试
    console.log('[SDK Fallback] Initialized with options:', options);
  }

  /**
   * 设置一个基本的提供者实现
   * 具备关键功能，确保应用不会崩溃
   */
  _setupDummyProvider() {
    // 创建与MetaMask接口兼容的provider
    this.activeProvider = {
      isMetaMask: true,
      _metamask: { 
        isUnlocked: () => Promise.resolve(false) 
      },
      isConnected: () => this.isConnected,
      
      // 提供基本的RPC请求方法
      request: async ({ method, params }) => {
        console.log('[SDK Fallback] Request method called:', method, params);
        
        // 根据请求方法返回相应的模拟数据
        switch (method) {
          case 'eth_accounts':
          case 'eth_requestAccounts':
            // 如果没有真实连接，提示用户并返回空数组
            if (!this.isConnected) {
              console.warn('[SDK Fallback] No real connection available');
              
              // 尝试自动切换到真实MetaMask如果存在
              if (typeof window.ethereum !== 'undefined') {
                console.log('[SDK Fallback] Found window.ethereum, trying to use it');
                try {
                  return await window.ethereum.request({ method, params });
                } catch (e) {
                  console.error('[SDK Fallback] Error using window.ethereum:', e);
                  this._suggestRealMetaMask();
                  return [];
                }
              } else {
                this._suggestRealMetaMask();
                return [];
              }
            }
            return [];
            
          case 'eth_chainId':
            return '0x1'; // 默认为以太坊主网
            
          case 'wallet_watchAsset':
            this._suggestRealMetaMask();
            return false;
            
          default:
            console.warn(`[SDK Fallback] Unsupported method: ${method}`);
            return null;
        }
      },
      
      // 事件监听方法
      on: (event, handler) => {
        console.log(`[SDK Fallback] Registered event handler for: ${event}`);
        // 保存处理函数以便后续调用
        if (!this._eventHandlers) this._eventHandlers = {};
        if (!this._eventHandlers[event]) this._eventHandlers[event] = [];
        this._eventHandlers[event].push(handler);
        
        return this.activeProvider;
      }
    };
  }
  
  /**
   * 获取provider对象
   * @returns 模拟的provider对象
   */
  getProvider() {
    // 如果有真实MetaMask，优先返回真实实现
    if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
      console.log('[SDK Fallback] Returning real MetaMask provider from window.ethereum');
      return window.ethereum;
    }
    
    console.log('[SDK Fallback] Returning fallback provider');
    return this.activeProvider;
  }
  
  /**
   * 向用户推荐安装真正的MetaMask
   */
  _suggestRealMetaMask() {
    console.log('[SDK Fallback] Suggesting real MetaMask installation');
    // 如果尚未显示提示
    if (!this._hasShownMetaMaskSuggestion) {
      setTimeout(() => {
        alert('要获得完整功能，请安装MetaMask浏览器扩展或使用MetaMask移动应用。');
      }, 1000);
      this._hasShownMetaMaskSuggestion = true;
    }
  }
}

// 导出单例便于使用
export default { MetaMaskSDK };
