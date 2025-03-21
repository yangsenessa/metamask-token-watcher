/**
 * MetaMask SDK React Isolator
 * 
 * 该工具用于隔离加载MetaMask SDK，避免React环境中的各种兼容性问题
 * 提供了多CDN源备份和健壮的错误处理
 */

class SDKReactIsolator {
  constructor() {
    this.initialized = false;
    this.loadAttempts = 0;
    this.maxAttempts = 3;
    this.timeout = 8000; // 加载超时时间，毫秒
    this.version = '0.10.0'; // 固定版本号，比使用latest更稳定
    
    // 按优先级排序的多个CDN源
    this.cdnSources = [
      `https://cdn.jsdelivr.net/npm/@metamask/sdk@${this.version}/dist/browser.min.js`,
      `https://unpkg.com/@metamask/sdk@${this.version}/dist/browser.min.js`,
      `https://cdn.jsdelivr.net/npm/@metamask/sdk@latest/dist/browser.min.js`,
      `https://unpkg.com/@metamask/sdk@latest/dist/browser.min.js`,
      `https://cdn.skypack.dev/@metamask/sdk@${this.version}`
    ];
    
    // 添加自定义事件总线，用于SDK事件传递
    this.eventBus = document.createElement('div');
  }

  /**
   * 加载MetaMask SDK
   * 实现多CDN源尝试和错误处理
   */
  async loadSDK() {
    if (window.MetaMaskSDK) {
      console.log('[SDK Isolator] MetaMask SDK already loaded in window scope');
      return window.MetaMaskSDK;
    }
    
    if (this.loadingPromise) {
      console.log('[SDK Isolator] SDK already loading, returning existing promise');
      return this.loadingPromise;
    }
    
    console.log('[SDK Isolator] Starting SDK load process');
    this.loadingPromise = new Promise(async (resolve, reject) => {
      try {
        // 首先尝试加载本地安装的SDK (如果项目中已安装)
        try {
          console.log('[SDK Isolator] Attempting to import local SDK from node_modules');
          const localSDK = await this.importLocalSDK();
          if (localSDK) {
            console.log('[SDK Isolator] Successfully loaded SDK from local installation');
            window.MetaMaskSDK = localSDK.MetaMaskSDK || localSDK.default;
            this.initialized = true;
            resolve(window.MetaMaskSDK);
            return;
          }
        } catch (localError) {
          console.warn('[SDK Isolator] Could not load local SDK:', localError.message);
          // 本地加载失败时继续尝试CDN
        }

        // 尝试从不同CDN源加载
        for (let i = 0; i < this.cdnSources.length; i++) {
          try {
            const source = this.cdnSources[i];
            console.log(`[SDK Isolator] Attempting to load from ${source} (attempt ${i+1})`);
            
            // 添加超时控制
            const sdkModule = await Promise.race([
              this.loadScript(source),
              new Promise((_, timeoutReject) => 
                setTimeout(() => timeoutReject(new Error(`Timeout loading from ${source}`)), this.timeout)
              )
            ]);
            
            console.log(`[SDK Isolator] Successfully loaded SDK from ${source}`);
            
            // 检查SDK是否正确加载
            if (window.MetaMaskSDK) {
              this.initialized = true;
              resolve(window.MetaMaskSDK);
              return;
            } else if (sdkModule && typeof sdkModule.MetaMaskSDK === 'function') {
              window.MetaMaskSDK = sdkModule.MetaMaskSDK;
              this.initialized = true;
              resolve(sdkModule);
              return;
            } else {
              console.warn(`[SDK Isolator] SDK loaded from ${source} but constructor not found`);
              // 继续尝试下一个源
            }
          } catch (err) {
            console.warn(`[SDK Isolator] Failed to load from ${this.cdnSources[i]}: ${err.message}`);
            // 错误时继续尝试下一个源
          }
        }
        
        // 如果所有源都尝试失败
        reject(new Error('All SDK sources failed to load properly'));
      } catch (error) {
        console.error('[SDK Isolator] Critical error loading SDK:', error);
        reject(error);
      }
    });
    
    return this.loadingPromise;
  }

  /**
   * 尝试导入本地安装的SDK
   * @returns {Promise} 加载本地SDK的Promise
   */
  async importLocalSDK() {
    try {
      // 动态导入项目中已安装的SDK
      return await import('@metamask/sdk');
    } catch (err) {
      console.warn('[SDK Isolator] Local SDK import failed:', err);
      return null;
    }
  }

  /**
   * 从指定URL加载脚本
   * @param {string} url - 脚本URL
   * @returns {Promise} - 加载完成的Promise
   */
  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      script.async = true;
      script.crossOrigin = "anonymous"; // 添加跨域支持
      
      script.onload = () => {
        console.log(`[SDK Isolator] Script loaded successfully from ${url}`);
        // 添加延迟检查，确保SDK真正加载完成
        setTimeout(() => {
          if (window.MetaMaskSDK) {
            resolve(window.MetaMaskSDK);
          } else {
            resolve({ MetaMaskSDK: window.MetaMaskSDK });
          }
        }, 100);
      };
      
      script.onerror = (error) => {
        console.error(`[SDK Isolator] Failed to load script from ${url}:`, error);
        reject(new Error(`Failed to load script from ${url}: ${error}`));
      };
      
      // 添加到文档
      document.head.appendChild(script);
    });
  }
  
  /**
   * 获取已加载的SDK
   * @returns SDK构造函数或null
   */
  getSDK() {
    return window.MetaMaskSDK || null;
  }
  
  /**
   * 检查SDK是否已加载
   * @returns {boolean} SDK是否已加载
   */
  isSDKLoaded() {
    return this.initialized && window.MetaMaskSDK !== undefined;
  }
  
  // 添加静态实例属性
  static instance = null;
  
  // 获取单例实例
  static getInstance() {
    if (!SDKReactIsolator.instance) {
      SDKReactIsolator.instance = new SDKReactIsolator();
    }
    return SDKReactIsolator.instance;
  }
  
  // 静态方法，允许直接通过类调用
  static async loadSDK() {
    return SDKReactIsolator.getInstance().loadSDK();
  }
  
  // 静态方法获取SDK
  static getSDK() {
    return SDKReactIsolator.getInstance().getSDK();
  }
  
  // 静态方法检查SDK是否已加载
  static isSDKLoaded() {
    return SDKReactIsolator.getInstance().isSDKLoaded();
  }
}

export default SDKReactIsolator;