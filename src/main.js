// 引入移动调试功能
import { initMobileDebug } from './utils/mobileDebug';
import logger from './utils/logger';
import sdkIsolator from './utils/sdk-react-isolator';

// 添加MetaMask SDK导入
let MetaMaskSDK;

// 使用隔离加载器和直接引入回退版本避免依赖问题
try {
    console.log('Loading MetaMask integration...');
    
    // 首先尝试使用隔离加载器加载SDK
    sdkIsolator.loadSDK().then(sdk => {
        console.log('MetaMask SDK loaded through isolator');
        MetaMaskSDK = window.MetaMaskSDK || sdk.constructor;
        
        // 初始化SDK (现在是异步的)
        initMetaMaskSDK().catch(err => {
            console.error('Error during SDK initialization:', err);
            // 尝试回退方法
            loadMetaMaskSDKFromCDN();
        });
    }).catch(err => {
        console.error('SDK isolator failed:', err);
        
        // 尝试回退实现
        import('./utils/metamask-sdk-fallback').then(fallbackModule => {
            console.log('Loaded MetaMask SDK fallback implementation');
            MetaMaskSDK = fallbackModule.MetaMaskSDK;
            
            // 初始化SDK
            initMetaMaskSDK().catch(fallbackErr => {
                console.error('Failed to initialize fallback implementation:', fallbackErr);
                // 直接从CDN加载
                loadMetaMaskSDKFromCDN();
            });
        }).catch(fallbackErr => {
            console.error('Failed to load fallback implementation:', fallbackErr);
            // 直接从CDN加载
            loadMetaMaskSDKFromCDN();
        });
    });
} catch (error) {
    console.error('Error in SDK import process:', error);
    // 尝试从CDN加载
    loadMetaMaskSDKFromCDN();
}

// 从CDN加载MetaMask SDK
function loadMetaMaskSDKFromCDN() {
    console.log('Attempting to load MetaMask SDK from CDN');
    
    // 尝试多个CDN源以提高可靠性
    const cdnUrls = [
        'https://cdn.jsdelivr.net/npm/@metamask/sdk@latest/dist/browser.min.js',
        'https://unpkg.com/@metamask/sdk@latest/dist/browser.min.js',
        'https://cdn.skypack.dev/@metamask/sdk'
    ];
    
    // 依次尝试不同的CDN源
    tryLoadFromCDN(cdnUrls, 0);
}

// 递归尝试从不同CDN加载
function tryLoadFromCDN(urls, index) {
    if (index >= urls.length) {
        console.warn('All CDN attempts failed, using fallback implementation only');
        return;
    }
    
    const script = document.createElement('script');
    script.src = urls[index];
    script.async = true;
    
    script.onload = () => {
        console.log(`MetaMask SDK loaded successfully from ${urls[index]}`);
        
        if (window.MetaMaskSDK) {
            // 检查我们是否已经初始化了SDK
            if (!metamaskSDK) {
                MetaMaskSDK = window.MetaMaskSDK;
                initMetaMaskSDK();
            } else {
                console.log('SDK already initialized from fallback, enhancing with CDN version');
                // 可以选择用完整版替换回退版
                MetaMaskSDK = window.MetaMaskSDK;
            }
        } else {
            console.error('MetaMask SDK loaded but MetaMaskSDK class not found');
            // 尝试再次检查，有时SDK可能需要时间初始化
            setTimeout(() => {
                if (window.MetaMaskSDK) {
                    console.log('MetaMask SDK found after delay');
                    MetaMaskSDK = window.MetaMaskSDK;
                    if (!metamaskSDK) {
                        initMetaMaskSDK();
                    }
                } else {
                    console.error('MetaMask SDK still not available after delay');
                    tryLoadFromCDN(urls, index + 1);
                }
            }, 1000);
        }
    };
    
    script.onerror = (err) => {
        console.error(`Failed to load MetaMask SDK from ${urls[index]}:`, err);
        // 尝试下一个CDN
        tryLoadFromCDN(urls, index + 1);
    };
    
    document.head.appendChild(script);
}

// MetaMask SDK实例
let metamaskSDK = null;

// 初始化MetaMask SDK
async function initMetaMaskSDK() {
    if (!MetaMaskSDK) {
        console.error('MetaMask SDK not successfully loaded, cannot initialize');
        return;
    }
    
    try {
        console.log('Initializing MetaMask SDK');
        metamaskSDK = new MetaMaskSDK({
            dappMetadata: {
                name: 'Token Watcher',
                url: window.location.href,
                iconUrl: 'https://cdn.jsdelivr.net/gh/MetaMask/brand-resources@master/SVG/metamark.svg'
            },
            infuraApiKey: '9aa3d95b3bc440fa88ea12eaa4456161', // Public infura key
            checkInstallationOnAllCalls: false,
            logging: {
                developerMode: true,
            },
            storage: {
                enabled: true,
            },
            // React兼容性设置
            useDeeplink: false,            // 避免使用React Native deeplink
            enableDebug: true,             // 启用调试以便跟踪问题
            // 支持的链
            defaultNetworks: [1, 56, 137],
            // 默认连接以太坊主网
            defaultNetwork: 'mainnet',
            // 添加异步初始化选项
            shouldShimWeb3: true,
        });
        
        console.log('MetaMask SDK created, waiting for initialization...');
        
        // 等待SDK初始化完成
        await new Promise((resolve) => {
            // 检查SDK是否已初始化
            if (metamaskSDK._initialized) {
                console.log('SDK already initialized');
                resolve();
                return;
            }
            
            // 监听SDK初始化完成事件
            const checkInitialized = () => {
                if (metamaskSDK._initialized) {
                    console.log('SDK initialization completed');
                    resolve();
                    return true;
                }
                return false;
            };
            
            // 尝试立即检查一次
            if (checkInitialized()) return;
            
            // 如果SDK有初始化事件，可以监听
            if (metamaskSDK.on && typeof metamaskSDK.on === 'function') {
                metamaskSDK.on('_initialized', () => {
                    console.log('SDK _initialized event fired');
                    resolve();
                });
            }
            
            // 使用轮询作为备选方案
            let attempts = 0;
            const maxAttempts = 10;
            const interval = setInterval(() => {
                attempts++;
                if (checkInitialized() || attempts >= maxAttempts) {
                    clearInterval(interval);
                    if (attempts >= maxAttempts) {
                        console.warn(`SDK did not initialize after ${maxAttempts} attempts, continuing anyway`);
                        resolve();
                    }
                }
            }, 500);
        });
        
        console.log('MetaMask SDK initialized, getting provider');
        
        // 初始化后尝试恢复连接
        const ethereum = metamaskSDK.getProvider();
        if (ethereum) {
            // 将ethereum对象附加到window以保持兼容性
            window.ethereum = ethereum;
            // 检查之前的连接状态
            checkPreviousConnection();
        } else {
            console.error('getProvider() returned undefined even after waiting for initialization');
        }
    } catch (error) {
        console.error('Failed to initialize MetaMask SDK:', error);
    }
}

// 检查之前的连接状态 - 增强回调检测
async function checkPreviousConnection() {
    try {
        // 首先检查URL参数，查看是否是从MetaMask返回
        const urlParams = new URLSearchParams(window.location.search);
        const isMetaMaskReturn = urlParams.has('metamask_return');
        
        if (isMetaMaskReturn) {
            console.log('Detected return from MetaMask app, checking connection status');
            const savedState = loadConnectionState();
            
            if (savedState && savedState.pendingAuthorization) {
                console.log('Found pending authorization state, attempting to reconnect');
                
                // 显示连接中状态
                updateStatusText('Finalizing connection with MetaMask...');
                
                // 延迟一点执行，让MetaMask有时间完成其处理
                setTimeout(async () => {
                    try {
                        // 对于移动端，先检查window.ethereum是否可用
                        if (window.ethereum) {
                            const accounts = await window.ethereum.request({ 
                                method: 'eth_requestAccounts',
                                params: [] 
                            });
                            
                            if (accounts && accounts.length > 0) {
                                userAccount = accounts[0];
                                console.log('Connection established to account:', userAccount);
                                updateUIForConnectedWallet();
                                updateStatusText(`Connected to account: ${formatAddress(userAccount)}`);
                                
                                // 初始化web3
                                if (typeof Web3 === 'function') {
                                    web3 = new Web3(window.ethereum);
                                }
                                
                                // 清除待处理状态
                                saveConnectionState({
                                    connected: true,
                                    method: 'metamask-deeplink',
                                    timestamp: Date.now(),
                                    address: userAccount,
                                    pendingAuthorization: false
                                });
                                
                                return;
                            } else {
                                console.warn('No accounts returned after authorization');
                            }
                        } else {
                            console.warn('window.ethereum not available after app return');
                        }
                        
                        // 如果上面的方法失败，尝试再次启动连接流程
                        console.log('Automatic reconnection failed, trying again...');
                        openMetaMaskMobile();
                    } catch (reconnectError) {
                        console.error('Error during reconnection:', reconnectError);
                        updateStatusText('Failed to complete connection. Please try again.');
                    }
                }, 1000);
                
                return;
            }
        }

        // 原有逻辑 - 检查常规连接状态
        if (window.ethereum && window.ethereum.isConnected()) {
            console.log('Detected existing connection, attempting to restore');
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                userAccount = accounts[0];
                console.log('Connection restored to account:', userAccount);
                updateUIForConnectedWallet();
                updateStatusText(`Connected to account: ${formatAddress(userAccount)}`);
            }
        }
    } catch (error) {
        console.error('Failed to restore connection:', error);
    }
}

// 初始化移动调试控制台
// 参数: 第一个参数设为 true 可以在生产环境中启用
initMobileDebug(false);

// 使用日志工具记录信息
logger.info('Application initializing...');

// 显示状态文本函数 - 移到前面以确保在调用前已定义
function updateStatusText(text) {
    console.log("Status update:", text);
    // 显示状态文本
    const statusElement = document.getElementById('status-text');
    if (statusElement) {
        statusElement.textContent = text;
    } else {
        // 如果元素不存在，创建一个
        const statusDiv = document.createElement('div');
        statusDiv.id = 'status-text';
        statusDiv.style.margin = '10px 0';
        statusDiv.style.padding = '8px';
        statusDiv.style.backgroundColor = '#f8f9fa';
        statusDiv.style.border = '1px solid #e9ecef';
        statusDiv.style.borderRadius = '4px';
        statusDiv.textContent = text;

        // 插入到连接按钮下方
        const connectSection = document.getElementById('connect-section');
        if (connectSection) {
            connectSection.appendChild(statusDiv);
        } else {
            document.body.insertBefore(statusDiv, document.getElementById('token-form'));
        }
    }
}

// 格式化地址函数 - 移到外部以便引用
function formatAddress(address) {
    if (!address) return '';
    return address.slice(0, 6) + '...' + address.slice(-4);
}

// 移动设备检测函数 - 移到外部作用域
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// MetaMask内置浏览器检测函数 - 移到全局作用域
function isMetaMaskInAppBrowser() {
    return window.ethereum && window.ethereum.isMetaMask && /MetaMask/.test(navigator.userAgent);
}

// 全局变量定义
let userAccount = null;

function openMetaMaskMobile() {
    // 如果已经连接则不需要再次连接
    if (userAccount) {
        console.log("Already connected to wallet, no need to reconnect");
        return;
    }
    
    console.log("Opening MetaMask connection options for mobile");
    
    // 创建移动端连接选项容器
    const mobileOptionsContainer = document.createElement('div');
    mobileOptionsContainer.style.position = 'fixed';
    mobileOptionsContainer.style.top = '0';
    mobileOptionsContainer.style.left = '0';
    mobileOptionsContainer.style.width = '100%';
    mobileOptionsContainer.style.height = '100%';
    mobileOptionsContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
    mobileOptionsContainer.style.display = 'flex';
    mobileOptionsContainer.style.justifyContent = 'center';
    mobileOptionsContainer.style.alignItems = 'center';
    mobileOptionsContainer.style.zIndex = '1000';
    
    // 创建选项卡容器
    const optionsContent = document.createElement('div');
    optionsContent.style.backgroundColor = 'white';
    optionsContent.style.padding = '20px';
    optionsContent.style.borderRadius = '10px';
    optionsContent.style.maxWidth = '90%';
    optionsContent.style.width = '400px';
    
    // 创建标题
    const title = document.createElement('h2');
    title.textContent = '连接到MetaMask';
    title.style.textAlign = 'center';
    title.style.marginTop = '0';
    
    // 添加关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => document.body.removeChild(mobileOptionsContainer);
    
    // 创建选项按钮
    const mmAppButton = document.createElement('button');
    mmAppButton.style.display = 'block';
    mmAppButton.style.width = '100%';
    mmAppButton.style.padding = '12px';
    mmAppButton.style.margin = '10px 0';
    mmAppButton.style.backgroundColor = '#f6851b'; // MetaMask橙色
    mmAppButton.style.color = 'white';
    mmAppButton.style.border = 'none';
    mmAppButton.style.borderRadius = '5px';
    mmAppButton.style.fontWeight = 'bold';
    mmAppButton.style.cursor = 'pointer';
    mmAppButton.textContent = '打开MetaMask应用';
    
    // 添加WalletConnect选项
    const wcButton = document.createElement('button');
    wcButton.style.display = 'block';
    wcButton.style.width = '100%';
    wcButton.style.padding = '12px';
    wcButton.style.margin = '10px 0';
    wcButton.style.backgroundColor = '#3396ff'; // WalletConnect蓝色
    wcButton.style.color = 'white';
    wcButton.style.border = 'none';
    wcButton.style.borderRadius = '5px';
    wcButton.style.cursor = 'pointer';
    wcButton.textContent = '使用WalletConnect';
    
    // 组装DOM
    optionsContent.appendChild(title);
    optionsContent.appendChild(mmAppButton);
    optionsContent.appendChild(wcButton);
    mobileOptionsContainer.appendChild(closeButton);
    mobileOptionsContainer.appendChild(optionsContent);
    
    // 添加事件监听
    mmAppButton.addEventListener('click', () => {
        try {
            // 生成深层链接 - 修改链接格式并添加必要参数
            const currentUrl = window.location.href;
            // 添加回调参数和连接类型
            const callbackUrl = encodeURIComponent(`${window.location.origin}${window.location.pathname}?metamask_return=true`);
            const mmDeepLink = `https://metamask.app.link/dapp/${window.location.hostname}${window.location.pathname}?callbackUrl=${callbackUrl}&connectType=direct`;
            console.log("Opening MetaMask app with enhanced URL:", mmDeepLink);
            
            // 保存状态以便返回时恢复 - 添加更多状态信息
            saveConnectionState({
                connecting: true,
                method: 'metamask-deeplink',
                timestamp: Date.now(),
                pendingAuthorization: true,
                originalUrl: currentUrl
            });
            
            // 跳转到MetaMask
            window.location.href = mmDeepLink;
            
            // 移除选项容器
            document.body.removeChild(mobileOptionsContainer);
        } catch (error) {
            console.error("Error opening MetaMask app:", error);
            alert("打开MetaMask应用失败，请尝试其他连接方式");
        }
    });
    
    wcButton.addEventListener('click', () => {
        document.body.removeChild(mobileOptionsContainer);
        initWalletConnect();
    });
    
    // 添加到DOM
    document.body.appendChild(mobileOptionsContainer);
}

// 保存连接状态到localStorage - 移到外部作用域
function saveConnectionState(state) {
    try {
        // 添加更多信息以便恢复
        const enhancedState = {
            ...state,
            timestamp: Date.now(),
            returnUrl: window.location.href,
            userAgent: navigator.userAgent,
            isMobile: isMobile()
        };
        
        localStorage.setItem('metamask_connection_state', JSON.stringify(enhancedState));
        console.log('Connection state saved:', enhancedState);
    } catch (error) {
        console.error('Failed to save connection state:', error);
    }
}

// 从localStorage加载连接状态 - 移到外部作用域
function loadConnectionState() {
    try {
        const stateJson = localStorage.getItem('metamask_connection_state');
        if (stateJson) {
            const state = JSON.parse(stateJson);
            console.log('Loaded connection state:', state);
            return state;
        }
    } catch (error) {
        console.error('Failed to load connection state:', error);
    }
    return null;
}

// 修复Web3导入
let Web3;
if (typeof window.Web3 !== 'undefined') {
    Web3 = window.Web3;
} else {
    try {
        // 尝试动态导入
        import('web3').then(web3Module => {
            if (web3Module.default) {
                Web3 = web3Module.default;
            } else {
                Web3 = web3Module;
            }
        }).catch(err => {
            console.error('Failed to import Web3:', err);
        });
    } catch (error) {
        console.error('Error loading Web3:', error);
    }
}

// 使用动态导入避免构造函数错误
// import WalletConnectProvider from '@walletconnect/web3-provider';
try {
    // ABI最小接口定义
    const minABI = [{
        // balanceOf
        constant: true,
        inputs: [{ name: "_owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "balance", type: "uint256" }],
        type: "function"
    }, {
        // decimals
        constant: true,
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        type: "function"
    }, {
        // symbol
        constant: true,
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", type: "string" }],
        type: "function"
    }];

    // 显示加载指示器 - 通用函数
    function showLoader() {
        const loader = document.getElementById('connection-loader');
        if (loader) {
            loader.style.display = 'block';
        }
    }

    // 隐藏加载指示器
    function hideLoader() {
        const loader = document.getElementById('connection-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    // 设备信息显示
    function updateDeviceInfo() {
        const deviceInfo = document.getElementById('device-info');
        if (isMobile()) {
            deviceInfo.innerHTML = '<p>Mobile device detected - supports MetaMask app and WalletConnect</p>';
        } else {
            deviceInfo.innerHTML = '<p>Desktop device detected - supports MetaMask browser extension and WalletConnect</p>';
        }
    }

    // 加载WalletConnect Provider
    async function loadWalletConnectProvider() {
        console.log('Loading WalletConnect provider...');
        if (window.WalletConnectProvider) {
            console.log('Using preloaded WalletConnectProvider, type:', typeof window.WalletConnectProvider);
            if (typeof window.WalletConnectProvider === 'function') {
                return window.WalletConnectProvider;
            }
            
            // 如果是对象，可能需要检查它的属性
            console.log('WalletConnectProvider is not a constructor, checking structure:', Object.keys(window.WalletConnectProvider));
            
            // 如果是ES模块，可能需要访问default导出
            if (window.WalletConnectProvider.default) {
                console.log('Using WalletConnectProvider.default');
                return window.WalletConnectProvider.default;
            }

            throw new Error('WalletConnectProvider structure not as expected');
        }

        console.log('Attempting to dynamically import WalletConnectProvider from CDN...');
        // 尝试多个CDN源
        const cdnUrls = [
            'https://unpkg.com/@walletconnect/web3-provider@1.7.8/dist/umd/index.min.js',
            'https://cdn.jsdelivr.net/npm/@walletconnect/web3-provider@1.7.8/dist/umd/index.min.js',
            'https://cdn.jsdelivr.net/npm/@walletconnect/web3-provider@1.8.0/dist/umd/index.min.js'
        ];
        
        // 依次尝试不同的CDN源
        let loaded = false;
        let lastError = null;
        
        for (const url of cdnUrls) {
            if (loaded) break;
            
            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = url;
                    script.onload = () => {
                        console.log(`Successfully loaded WalletConnectProvider from ${url}`);
                        resolve();
                    };
                    script.onerror = (err) => {
                        console.error(`Failed to load from ${url}`, err);
                        reject(new Error(`Failed to load: ${url}`));
                    };
                    document.head.appendChild(script);
                });
            } catch (err) {
                lastError = err;
                console.warn(`Failed to load ${url}, trying next source`);
            }
        }
        
        if (!loaded) {
            throw lastError || new Error('All CDN sources failed to load');
        }

        // 检查加载结果
        if (window.WalletConnectProvider) {
            console.log('WalletConnectProvider loaded successfully from CDN, type:', typeof window.WalletConnectProvider);
            if (typeof window.WalletConnectProvider === 'function') {
                return window.WalletConnectProvider;
            } else if (window.WalletConnectProvider.default) {
                console.log('Using WalletConnectProvider.default');
                return window.WalletConnectProvider.default;
            } else {
                console.warn('WalletConnectProvider structure is not as expected:', window.WalletConnectProvider);
                for (const key in window.WalletConnectProvider) {
                    if (typeof window.WalletConnectProvider[key] === 'function') {
                        console.log(`Attempting to use window.WalletConnectProvider.${key} as constructor`);
                        return window.WalletConnectProvider[key];
                    }
                }
            }

            throw new Error('Loaded successfully but no usable WalletConnectProvider constructor found');
        }

        throw new Error('WalletConnectProvider not loaded');
    }

    // 初始化通用WalletConnect方法
    async function initWalletConnect() {
        try {
            updateStatusText('Initializing WalletConnect...');
            if (!Web3) {
                throw new Error('Web3 not properly loaded, cannot initialize WalletConnect');
            }

            let WalletConnectProviderClass;
            try {
                WalletConnectProviderClass = await loadWalletConnectProvider();
                console.log('WalletConnectProvider loaded:', WalletConnectProviderClass);
            } catch (loadError) {
                console.error('Error loading WalletConnectProvider:', loadError);
                // 尝试备用方案：使用QR码扫描方式
                updateStatusText('Failed to load WalletConnect component, please try other connection methods');
                if (isMobile()) {
                    setTimeout(() => {
                        openMetaMaskMobile();
                    }, 1000);
                } else {
                    alert('WalletConnect loading failed, please try other connection methods or refresh the page.');
                }
                throw loadError;
            }

            const config = {
                rpc: {
                    1: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
                    56: "https://bsc-dataseed.binance.org/",
                    137: "https://polygon-rpc.com"
                },
                bridge: 'https://bridge.walletconnect.org',
                qrcodeModalOptions: {
                    mobileLinks: ["metamask", "trust"]
                }
            };

            let provider;
            try {
                if (typeof WalletConnectProviderClass === 'function') {
                    console.log('Using constructor to create WalletConnect provider');
                    provider = new WalletConnectProviderClass(config);
                } else if (WalletConnectProviderClass && typeof WalletConnectProviderClass.create === 'function') {
                    console.log('Using create method to create WalletConnect provider');
                    provider = WalletConnectProviderClass.create(config);
                } else {
                    throw new Error('Cannot create WalletConnect provider instance, not a valid constructor');
                }
            } catch (providerError) {
                console.error('Failed to create WalletConnect provider instance:', providerError);
                updateStatusText('Failed to create WalletConnect connection, please refresh the page and try again');
                throw providerError;
            }

            console.log('WalletConnect provider created:', provider);
            updateStatusText('WalletConnect initialized, please connect your wallet in the QR code popup');

            // 启用会话（显示QR码）
            await provider.enable();
            console.log('WalletConnect session enabled');

            // 创建Web3实例
            window.web3 = new Web3(provider);
            walletConnectProvider = provider;

            // 获取连接的账户
            const accounts = await window.web3.eth.getAccounts();
            if (accounts.length > 0) {
                userAccount = accounts[0];
                updateUIForConnectedWallet();
                updateStatusText(`Connected to account via WalletConnect: ${formatAddress(userAccount)}`);
            }

            // 监听账户变更
            provider.on("accountsChanged", (accounts) => {
                if (accounts.length > 0) {
                    userAccount = accounts[0];
                    updateUIForConnectedWallet();
                    updateStatusText(`Account changed: ${formatAddress(userAccount)}`);
                } else {
                    resetUI();
                    updateStatusText('No connected accounts');
                }
            });

            // 监听链变更
            provider.on("chainChanged", (chainId) => {
                console.log('Chain changed:', chainId);
                updateStatusText(`Chain changed: ${chainId}`);
            });

            // 监听断开连接
            provider.on("disconnect", (code, reason) => {
                console.log('Disconnected:', code, reason);
                userAccount = null;
                resetUI();
                updateStatusText('Wallet disconnected');
            });

            return provider;
        } catch (error) {
            console.error('Error initializing WalletConnect:', error);
            updateStatusText(`WalletConnect connection failed: ${error.message || error}`);
            // 显示错误信息并提供替代连接选项
            updateStatusText('Failed to connect to WalletConnect, please try other connection methods');
            if (isMobile()) {
                setTimeout(() => {
                    openMetaMaskMobile(); // 这已经提供了多种连接选项
                }, 1000);
            } else {
                // 在桌面上，告知用户安装MetaMask扩展
                alert('Connection failed. Please install the MetaMask browser extension or try using a mobile device.');
            }
            throw error;
        }
    }

    // 添加备用WalletConnect连接方法 - 使用在线二维码生成器
    function showWalletConnectQRBackup() {
        console.log('Showing backup WalletConnect QR code');
        // 创建模态框
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '10000';
        
        const container = document.createElement('div');
        container.style.backgroundColor = 'white';
        container.style.padding = '20px';
        container.style.borderRadius = '10px';
        container.style.maxWidth = '90%';
        container.style.width = '450px';
        container.style.textAlign = 'center';
        
        const title = document.createElement('h3');
        title.textContent = 'Connect via WalletConnect';
        title.style.marginTop = '0';
        
        const desc = document.createElement('p');
        desc.textContent = 'Due to technical reasons, please use the following backup method:';
        
        // 创建WalletConnect URI
        const wcUri = 'wc:00e46b69-d0cc-4b3e-b6a2-cee442f97188@1?bridge=https%3A%2F%2Fbridge.walletconnect.org&key=91303352aa104fe5925c6d321be95af2e6d60a3d5bb0c74dd9e0e3a6ae3c556d';
        
        // 添加二维码
        const qrDiv = document.createElement('div');
        qrDiv.id = 'walletconnect-qr';
        qrDiv.style.margin = '20px auto';
        qrDiv.style.maxWidth = '280px';
        
        // 添加二维码图像
        const qrImg = document.createElement('img');
        qrImg.style.width = '100%';
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(wcUri)}`;
        qrDiv.appendChild(qrImg);
        
        // 添加复制按钮
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy WalletConnect Connection Code';
        copyButton.style.marginTop = '15px';
        copyButton.style.padding = '10px';
        copyButton.style.backgroundColor = '#3396ff';
        copyButton.style.color = 'white';
        copyButton.style.border = 'none';
        copyButton.style.borderRadius = '5px';
        copyButton.style.cursor = 'pointer';
        copyButton.onclick = () => {
            // Safely copy text to clipboard
            try {
                // First try modern API
                if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    navigator.clipboard.writeText(wcUri)
                        .then(() => {
                            copyButton.textContent = 'Copied!';
                            setTimeout(() => {
                                copyButton.textContent = 'Copy WalletConnect Connection Code';
                            }, 2000);
                        })
                        .catch(err => {
                            console.warn('Clipboard API failed, using fallback method:', err);
                            fallbackCopyMethod();
                        });
                } else {
                    // Fallback method
                    fallbackCopyMethod();
                }
            } catch (err) {
                console.error('Copy attempt failed:', err);
                fallbackCopyMethod();
            }

            // Fallback copy method
            function fallbackCopyMethod() {
                // Create temporary text area
                const textarea = document.createElement('textarea');
                textarea.value = wcUri;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textarea);
                    if (successful) {
                        copyButton.textContent = 'Copied!';
                    } else {
                        copyButton.textContent = 'Copy failed, please copy manually';
                    }
                } catch (err) {
                    console.error('Fallback copy method failed:', err);
                    copyButton.textContent = 'Copy failed, please copy manually';
                    // Show a text area for manual copying
                    const manualCopyArea = document.createElement('textarea');
                    manualCopyArea.value = wcUri;
                    manualCopyArea.style.width = '100%';
                    manualCopyArea.style.marginTop = '10px';
                    manualCopyArea.style.padding = '5px';
                    copyButton.parentNode.insertBefore(manualCopyArea, copyButton.nextSibling);
                }
                
                // Restore button text regardless of success
                setTimeout(() => {
                    copyButton.textContent = 'Copy WalletConnect Connection Code';
                }, 2000);
            }
        };
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.marginTop = '15px';
        closeButton.style.padding = '10px';
        closeButton.style.backgroundColor = '#6c757d';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => {
            document.body.removeChild(modal);
        };
        
        container.appendChild(title);
        container.appendChild(desc);
        container.appendChild(qrDiv);
        container.appendChild(copyButton);
        container.appendChild(document.createElement('br'));
        container.appendChild(closeButton);
        
        modal.appendChild(container);
        document.body.appendChild(modal);
        
        updateStatusText('Please scan the WalletConnect QR code with your wallet app to connect');
    }

    function ensureHttps() {
        if (window.location.protocol !== 'https:') {
            updateStatusText('Warning: MetaMask deep links require HTTPS environment');
            console.warn('Current page is not using HTTPS, which may affect MetaMask connection');
        }
    }

    function logConnectionAttempt(method, url) {
        console.log(`Attempting ${method} connection:`, {
            url,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            isMetaMaskInstalled: typeof window.ethereum !== 'undefined'
        });
    }

    window.addEventListener('load', async () => {
        let provider;
        
        const addTokenButton = document.getElementById('add-token');
        const tokenInfo = document.getElementById('token-info');
        let currentTokenData = null;
        let walletConnectProvider = null;

        // 更新设备信息
        updateDeviceInfo();

        // 显示网络信息
        async function updateNetworkDisplay() {
            const networkIndicator = document.getElementById('network-indicator');
            if (networkIndicator) {
                try {
                    const network = await window.MetaMaskHelper.detectCurrentNetwork();
                    if (network) {
                        networkIndicator.textContent = network.name;
                        networkIndicator.style.display = 'inline-block';

                        // 设置不同网络的颜色
                        if (network.name.includes('Mainnet')) {
                            networkIndicator.style.backgroundColor = '#28a745'; // 绿色
                        } else if (network.name.includes('Testnet')) {
                            networkIndicator.style.backgroundColor = '#ffc107'; // 黄色
                        } else if (network.name.includes('Binance')) {
                            networkIndicator.style.backgroundColor = '#f6851b'; // BSC橙色
                        } else if (network.name.includes('Polygon')) {
                            networkIndicator.style.backgroundColor = '#8247e5'; // Polygon紫色
                        }
                    } else {
                        networkIndicator.style.display = 'none';
                    }
                } catch (e) {
                    console.error('Error updating network display:', e);
                }
            }
        }

        // 生成代币按钮列表
        function createTokenButtons() {
            const tokenList = document.getElementById('token-list');
            if (tokenList) {
                // 先清空现有按钮列表
                tokenList.innerHTML = '';
                const tokens = Object.values(TOKEN_LIST);
                for (let i = 0; i < tokens.length; i++) {
                    const token = tokens[i];
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'token-button-container';
                    buttonContainer.style.display = 'flex';
                    buttonContainer.style.alignItems = 'center';
                    buttonContainer.style.gap = '8px';

                    // 添加logo（如果有）
                    if (token.logoUrl) {
                        const logo = document.createElement('img');
                        logo.src = token.logoUrl;
                        logo.style.width = '24px';
                        logo.style.height = '24px';
                        buttonContainer.appendChild(logo);
                    }

                    // 创建按钮并设置基本属性
                    const button = document.createElement('button');
                    button.className = 'token-button';
                    button.textContent = token.name;
                    button.id = 'token-button-' + i; // 使用索引作为ID，避免复杂引用
                    buttonContainer.appendChild(button);

                    // 将容器添加到列表
                    tokenList.appendChild(buttonContainer);

                    // 使用独立的方式绑定事件，避免在循环中创建闭包
                    document.getElementById('token-button-' + i).onclick = function() {
                        handleTokenClick(token.address);
                    };
                }
            }
        }

        // 简化的代币点击处理函数
        function handleTokenClick(address) {
            try {
                if (!address) {
                    console.error('Missing token address');
                    alert('Cannot query token: Invalid address');
                    return;
                }
                console.log('Querying token address:', address); // 添加日志，帮助调试
                queryToken(address);
            } catch (error) {
                console.error('Error handling token click:', error);
                alert('Error handling token click: ' + error.message);
            }
        }

        // 查询代币信息
        async function queryToken(tokenAddress) {
            // 参数验证
            if (!tokenAddress || typeof tokenAddress !== 'string') {
                console.error('Query token: Invalid token address', tokenAddress);
                alert('Please provide a valid token address');
                return;
            }

            // 显示加载中状态
            document.getElementById('token-info').style.display = 'none';
            showLoader();

            try {
                // 确保web3已初始化
                if (!web3) {
                    throw new Error('Web3 not initialized, please connect wallet first');
                }

                console.log('Starting token query:', tokenAddress);

                // 创建代币合约实例
                const tokenContract = new web3.eth.Contract(minABI, tokenAddress);

                const foundTokenInfo = Object.values(TOKEN_LIST).find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
                const logoUrl = foundTokenInfo ? foundTokenInfo.logoUrl : '';

                // 获取代币符号
                const symbol = await tokenContract.methods.symbol().call();
                console.log('Token symbol:', symbol);

                // 获取小数位数
                const decimals = await tokenContract.methods.decimals().call();
                console.log('Token decimals:', decimals);

                // 更新当前代币数据
                currentTokenData = {
                    address: tokenAddress,
                    symbol: symbol,
                    decimals: decimals,
                    logoUrl: logoUrl
                };

                // 更新UI
                try {
                    document.getElementById('token-symbol-display').textContent = symbol;
                    document.getElementById('token-decimals-display').textContent = decimals;
                    document.getElementById('token-logo-url-display').textContent = logoUrl || 'Not provided';

                    // 更新logo预览
                    const logoPreview = document.getElementById('token-logo-preview');
                    if (logoUrl) {
                        logoPreview.src = logoUrl;
                        logoPreview.style.display = 'block';
                        logoPreview.onerror = () => {
                            logoPreview.style.display = 'none';
                            document.getElementById('token-logo-url-display').textContent = 'Logo load failed';
                        };
                    } else {
                        logoPreview.style.display = 'none';
                    }

                    // 显示token信息区域
                    document.getElementById('token-info').style.display = 'block';

                    // 更新按钮状态 - 使用安全的方式
                    const buttons = document.querySelectorAll('.token-button');
                    for (let i = 0; i < buttons.length; i++) {
                        const btn = buttons[i];
                        btn.classList.remove('active');
                        if (foundTokenInfo && btn.textContent === foundTokenInfo.name) {
                            btn.classList.add('active');
                        }
                    }
                } catch (uiError) {
                    console.error('Error updating UI:', uiError);
                    // UI错误不阻止流程，但要记录
                }

                console.log('Token query completed:', currentTokenData);
                // 隐藏加载状态
                hideLoader();
            } catch (error) {
                console.error('Error querying token:', error, 'Address:', tokenAddress);
                alert('Token query failed: ' + (error.message || 'Unknown error'));
                document.getElementById('token-info').style.display = 'none';
                hideLoader();
            }
        }

        // 更新MetaMask移动端连接函数
        function openMetaMaskMobile() {
            // 如果已经连接则不需要再次连接
            if (userAccount) {
                console.log("Already connected to wallet, no need to reconnect");
                return;
            }
            
            console.log("Opening MetaMask connection options for mobile");
            
            // 创建移动端连接选项容器
            const mobileOptionsContainer = document.createElement('div');
            mobileOptionsContainer.style.position = 'fixed';
            mobileOptionsContainer.style.top = '0';
            mobileOptionsContainer.style.left = '0';
            mobileOptionsContainer.style.width = '100%';
            mobileOptionsContainer.style.height = '100%';
            mobileOptionsContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
            mobileOptionsContainer.style.display = 'flex';
            mobileOptionsContainer.style.justifyContent = 'center';
            mobileOptionsContainer.style.alignItems = 'center';
            mobileOptionsContainer.style.zIndex = '1000';
            
            // 创建选项卡容器
            const optionsContent = document.createElement('div');
            optionsContent.style.backgroundColor = 'white';
            optionsContent.style.padding = '20px';
            optionsContent.style.borderRadius = '10px';
            optionsContent.style.maxWidth = '90%';
            optionsContent.style.width = '400px';
            
            // 创建标题
            const title = document.createElement('h2');
            title.textContent = '连接到MetaMask';
            title.style.textAlign = 'center';
            title.style.marginTop = '0';
            
            // 添加关闭按钮
            const closeButton = document.createElement('button');
            closeButton.textContent = '✕';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '10px';
            closeButton.style.right = '10px';
            closeButton.style.background = 'none';
            closeButton.style.border = 'none';
            closeButton.style.fontSize = '20px';
            closeButton.style.cursor = 'pointer';
            closeButton.onclick = () => document.body.removeChild(mobileOptionsContainer);
            
            // 创建选项按钮
            const mmAppButton = document.createElement('button');
            mmAppButton.style.display = 'block';
            mmAppButton.style.width = '100%';
            mmAppButton.style.padding = '12px';
            mmAppButton.style.margin = '10px 0';
            mmAppButton.style.backgroundColor = '#f6851b'; // MetaMask橙色
            mmAppButton.style.color = 'white';
            mmAppButton.style.border = 'none';
            mmAppButton.style.borderRadius = '5px';
            mmAppButton.style.fontWeight = 'bold';
            mmAppButton.style.cursor = 'pointer';
            mmAppButton.textContent = '打开MetaMask应用';
            
            // 添加WalletConnect选项
            const wcButton = document.createElement('button');
            wcButton.style.display = 'block';
            wcButton.style.width = '100%';
            wcButton.style.padding = '12px';
            wcButton.style.margin = '10px 0';
            wcButton.style.backgroundColor = '#3396ff'; // WalletConnect蓝色
            wcButton.style.color = 'white';
            wcButton.style.border = 'none';
            wcButton.style.borderRadius = '5px';
            wcButton.style.cursor = 'pointer';
            wcButton.textContent = '使用WalletConnect';
            
            // 组装DOM
            optionsContent.appendChild(title);
            optionsContent.appendChild(mmAppButton);
            optionsContent.appendChild(wcButton);
            mobileOptionsContainer.appendChild(closeButton);
            mobileOptionsContainer.appendChild(optionsContent);
            
            // 添加事件监听
            mmAppButton.addEventListener('click', () => {
                try {
                    // 生成深层链接 - 修改链接格式并添加必要参数
                    const currentUrl = window.location.href;
                    // 添加回调参数和连接类型
                    const callbackUrl = encodeURIComponent(`${window.location.origin}${window.location.pathname}?metamask_return=true`);
                    const mmDeepLink = `https://metamask.app.link/dapp/${window.location.hostname}${window.location.pathname}?callbackUrl=${callbackUrl}&connectType=direct`;
                    console.log("Opening MetaMask app with enhanced URL:", mmDeepLink);
                    
                    // 保存状态以便返回时恢复 - 添加更多状态信息
                    saveConnectionState({
                        connecting: true,
                        method: 'metamask-deeplink',
                        timestamp: Date.now(),
                        pendingAuthorization: true,
                        originalUrl: currentUrl
                    });
                    
                    // 跳转到MetaMask
                    window.location.href = mmDeepLink;
                    
                    // 移除选项容器
                    document.body.removeChild(mobileOptionsContainer);
                } catch (error) {
                    console.error("Error opening MetaMask app:", error);
                    alert("打开MetaMask应用失败，请尝试其他连接方式");
                }
            });
            
            wcButton.addEventListener('click', () => {
                document.body.removeChild(mobileOptionsContainer);
                initWalletConnect();
            });
            
            // 添加到DOM
            document.body.appendChild(mobileOptionsContainer);
        }

        // 连接钱包按钮点击事件
        const connectButton = document.getElementById('connect-button');
        connectButton.addEventListener('click', async () => {
            // 如果已连接，断开连接
            if (userAccount) {
                resetConnection();
                return;
            }

            // 检测环境并选择合适的连接方式
            if (isMobile()) {
                // 移动设备 - 提供选择
                if (window.ethereum && window.ethereum.isMetaMask) {
                    // 移动设备上的浏览器中已安装MetaMask插件（少见情况）
                    await connectMetaMaskExtension();
                } else {
                    // 直接调用更新的MetaMask连接选项
                    openMetaMaskMobile();
                }
            } else {
                // PC设备
                if (typeof window.ethereum !== 'undefined') {
                    await connectMetaMaskExtension();
                } else {
                    // PC上未安装MetaMask插件，使用WalletConnect
                    await initWalletConnect();
                }
            }
        });

        // 添加代币按钮点击事件 - 优化版本
        addTokenButton.addEventListener('click', async () => {
            if (!currentTokenData) {
                alert('Please query token information first');
                return;
            }

            try {
                showLoader();
                updateStatusText('Processing token addition request...');
                console.log('Adding token:', currentTokenData);

                // 获取当前网络ID
                let chainId;
                try {
                    if (window.ethereum) {
                        chainId = await window.ethereum.request({ method: 'eth_chainId' });
                        console.log('Current chain ID:', chainId);
                    } else if (web3 && web3.eth) {
                        chainId = await web3.eth.getChainId();
                        console.log('Current chain ID:', chainId);
                    }
                } catch (e) {
                    console.warn('Failed to get chain ID:', e);
                }

                // 确保web3已初始化
                if (!web3) {
                    throw new Error('Web3 not initialized, please connect wallet first');
                }

                // 构建代币参数
                const tokenParams = {
                    type: 'ERC20',
                    options: {
                        address: currentTokenData.address,
                        symbol: currentTokenData.symbol,
                        decimals: parseInt(currentTokenData.decimals),
                        image: currentTokenData.logoUrl || undefined
                    }
                };

                console.log('Token addition parameters:', tokenParams);

                // 检测连接类型，并使用相应的方法添加代币
                if (window.ethereum && web3.currentProvider === window.ethereum) {
                    // 使用MetaMask浏览器扩展
                    try {
                        updateStatusText('Please confirm token addition in MetaMask popup...');

                        // 在MetaMask内置浏览器中使用特殊处理
                        if (isMetaMaskInAppBrowser()) {
                            // 构建深度链接URL
                            const tokenParamsString = JSON.stringify(tokenParams);
                            const encodedParams = encodeURIComponent(tokenParamsString);
                            const metamaskAddTokenUrl = `https://metamask.app.link/wallet_watchAsset?params=${encodedParams}`;
                            
                            // 保存当前状态
                            localStorage.setItem('pending_token_add', JSON.stringify({
                                token: currentTokenData,
                                timestamp: Date.now(),
                                chainId: chainId
                            }));

                            // 跳转到MetaMask
                            window.location.href = metamaskAddTokenUrl;
                            return;
                        }

                        const wasAdded = await window.ethereum.request({
                            method: 'wallet_watchAsset',
                            params: tokenParams
                        });

                        if (wasAdded) {
                            // 添加成功后进行验证
                            await verifyTokenAddition(currentTokenData.address);
                            updateStatusText('Token added successfully!');
                            alert('Token added successfully! Please check in MetaMask.');
                        } else {
                            updateStatusText('Token addition cancelled');
                            alert('Token addition cancelled');
                        }
                    } catch (error) {
                        console.error('Error adding token to MetaMask extension:', error);
                        alert(`Failed to add token: ${error.message}`);
                        // 尝试使用备用方法
                        showTokenAddOptions();
                    }
                } else if (isMobile() && !walletConnectProvider) {
                    // 在移动设备上使用多种添加代币方法
                    updateStatusText('Opening token addition options...');
                    showTokenAddOptions();
                } else if (walletConnectProvider) {
                    // 使用WalletConnect
                    try {
                        updateStatusText('Adding token via WalletConnect...');

                        const wasAdded = await walletConnectProvider.request({
                            method: 'wallet_watchAsset',
                            params: tokenParams
                        });

                        if (wasAdded) {
                            // 添加成功后进行验证
                            await verifyTokenAddition(currentTokenData.address);
                            updateStatusText('Token added successfully!');
                            alert('Token added successfully! Please check in your wallet.');
                        } else {
                            updateStatusText('Token addition cancelled');
                            alert('Token addition cancelled');
                        }
                    } catch (error) {
                        console.error('WalletConnect token addition error:', error);
                        updateStatusText('Your wallet does not support automatic token addition, please try manual addition');
                        showTokenAddOptions();
                    }
                } else {
                    throw new Error('No supported wallet connection detected');
                }

                hideLoader();
            } catch (error) {
                console.error('Error during token addition:', error);
                updateStatusText(`Failed to add token: ${error.message}`);
                alert('Failed to add token: ' + error.message);
                hideLoader();
            }
        });

        async function verifyTokenAddition(tokenAddress) {
            try {
                // 等待一段时间让MetaMask处理完成
                await new Promise(resolve => setTimeout(resolve, 2000));
                const exists = await window.MetaMaskHelper.checkIfTokenExists(tokenAddress);
                console.log('Token verification result:', exists ? 'Added' : 'Not found');
                if (!exists) {
                    console.warn('Token may not have been added successfully, suggesting manual addition');
                    showTokenAddOptions();
                }
            } catch (error) {
                console.error('Error verifying token addition status:', error);
                return false;
            }
            return true;
        }

        // 检查是否有待处理的代币添加
        const pendingTokenAdd = localStorage.getItem('pending_token_add');
        if (pendingTokenAdd) {
            try {
                const { token, timestamp } = JSON.parse(pendingTokenAdd);
                // 如果是在最近5分钟内添加的代币，尝试重新添加
                if (Date.now() - timestamp < 5 * 60 * 1000) {
                    console.log('Network change detected, attempting to re-add token:', token);
                    await window.ethereum.request({
                        method: 'wallet_watchAsset',
                        params: {
                            type: 'ERC20',
                            options: {
                                address: token.address,
                                symbol: token.symbol,
                                decimals: parseInt(token.decimals),
                                image: token.logoUrl || undefined
                            }
                        }
                    });
                }
                // 清除待处理状态
                localStorage.removeItem('pending_token_add');
            } catch (error) {
                console.error('Error re-adding token:', error);
            }
        }

        // 显示手动添加代币选项
        function showTokenAddOptions() {
            const tokenAddOptions = document.createElement('div');
            tokenAddOptions.style.position = 'fixed';
            tokenAddOptions.style.top = '0';
            tokenAddOptions.style.left = '0';
            tokenAddOptions.style.width = '100%';
            tokenAddOptions.style.height = '100%';
            tokenAddOptions.style.backgroundColor = 'rgba(0,0,0,0.8)';
            tokenAddOptions.style.display = 'flex';
            tokenAddOptions.style.flexDirection = 'column';
            tokenAddOptions.style.justifyContent = 'center';
            tokenAddOptions.style.alignItems = 'center';
            tokenAddOptions.style.zIndex = '999';

            const optionsContainer = document.createElement('div');
            optionsContainer.style.backgroundColor = 'white';
            optionsContainer.style.padding = '20px';
            optionsContainer.style.borderRadius = '10px';
            optionsContainer.style.maxWidth = '90%';
            optionsContainer.style.width = '450px';
            optionsContainer.style.maxHeight = '90vh';
            optionsContainer.style.overflowY = 'auto';
            optionsContainer.style.textAlign = 'center';

            const title = document.createElement('h3');
            title.textContent = 'Add Token to MetaMask';
            title.style.marginTop = '0';

            const description = document.createElement('p');
            description.textContent = 'Please choose a method to add the token to your MetaMask wallet:';
            description.style.marginBottom = '15px';

            // 显示代币信息
            const tokenInfoDiv = document.createElement('div');
            tokenInfoDiv.style.backgroundColor = '#f5f5f5';
            tokenInfoDiv.style.padding = '15px';
            tokenInfoDiv.style.borderRadius = '5px';
            tokenInfoDiv.style.marginBottom = '20px';
            tokenInfoDiv.style.textAlign = 'left';
            tokenInfoDiv.style.border = '1px solid #ddd';

            // 添加代币图标（如果有）
            if (currentTokenData.logoUrl) {
                const logoImg = document.createElement('img');
                logoImg.src = currentTokenData.logoUrl;
                logoImg.style.width = '64px';
                logoImg.style.height = '64px';
                logoImg.style.display = 'block';
                logoImg.style.margin = '0 auto 15px auto';
                logoImg.style.borderRadius = '50%';
                tokenInfoDiv.appendChild(logoImg);
            }

            // 添加代币信息
            const tokenInfo = document.createElement('div');
            tokenInfo.innerHTML = `
                <p><strong>Token Name:</strong> ${currentTokenData.symbol}</p>
                <p><strong>Contract Address:</strong> <span style="word-break: break-all;">${currentTokenData.address}</span></p>
                <p><strong>Decimals:</strong> ${currentTokenData.decimals}</p>
            `;
            tokenInfoDiv.appendChild(tokenInfo);

            optionsContainer.appendChild(title);
            optionsContainer.appendChild(description);
            optionsContainer.appendChild(tokenInfoDiv);

            // 创建不同的添加方式按钮
            // 方法1: 标准深层链接
            const standardLinkButton = document.createElement('button');
            standardLinkButton.textContent = 'Method 1: Add in MetaMask';
            standardLinkButton.style.display = 'block';
            standardLinkButton.style.width = '100%';
            standardLinkButton.style.margin = '10px 0';
            standardLinkButton.style.padding = '12px';
            standardLinkButton.style.backgroundColor = '#f6851b';
            standardLinkButton.style.color = 'white';
            standardLinkButton.style.border = 'none';
            standardLinkButton.style.borderRadius = '5px';
            standardLinkButton.style.fontWeight = 'bold';
            standardLinkButton.style.cursor = 'pointer';

            standardLinkButton.addEventListener('click', () => {
                try {
                    // 构建代币参数
                    const tokenParams = {
                        type: 'ERC20',
                        options: {
                            address: currentTokenData.address,
                            symbol: currentTokenData.symbol,
                            decimals: parseInt(currentTokenData.decimals),
                            image: currentTokenData.logoUrl || undefined
                        }
                    };

                    // 使用完整标准格式
                    const tokenParamsString = JSON.stringify(tokenParams);
                    const encodedParams = encodeURIComponent(tokenParamsString);

                    // 构建MetaMask深度链接 - 不同格式适用于移动端
                    const metamaskAddTokenUrl = `https://metamask.app.link/wallet_watchAsset?params=${encodedParams}`;
                    console.log('Add token link (Method 1):', metamaskAddTokenUrl);
                    document.body.removeChild(tokenAddOptions);

                    // 跳转前提示
                    alert('You are about to be redirected to the MetaMask app to add the token. Please confirm the addition in MetaMask.');

                    // 跳转到MetaMask
                    window.location.href = metamaskAddTokenUrl;
                } catch (error) {
                    console.error('Error building add token link:', error);
                    alert('Failed to create link: ' + error.message);
                }
            });

            // 方法2: 备用深度链接格式
            const alternativeLinkButton = document.createElement('button');
            alternativeLinkButton.textContent = 'Method 2: Alternative Add Method';
            alternativeLinkButton.style.display = 'block';
            alternativeLinkButton.style.width = '100%';
            alternativeLinkButton.style.margin = '10px 0';
            alternativeLinkButton.style.padding = '12px';
            alternativeLinkButton.style.backgroundColor = '#037dd6';
            alternativeLinkButton.style.color = 'white';
            alternativeLinkButton.style.border = 'none';
            alternativeLinkButton.style.borderRadius = '5px';
            alternativeLinkButton.style.cursor = 'pointer';

            alternativeLinkButton.addEventListener('click', () => {
                try {
                    // 优先使用SDK添加代币
                    if (metamaskSDK && window.ethereum) {
                        addTokenViaSDK();
                        document.body.removeChild(tokenAddOptions);
                        return;
                    }
                    
                    // 备用：使用简化参数格式
                    const metamaskAddTokenUrl = `https://metamask.app.link/add-token?address=${currentTokenData.address}&symbol=${currentTokenData.symbol}&decimals=${currentTokenData.decimals}&image=${encodeURIComponent(currentTokenData.logoUrl || '')}`;
                    console.log('Add token link (Method 2):', metamaskAddTokenUrl);
                    document.body.removeChild(tokenAddOptions);

                    // 跳转前提示
                    alert('Using alternative method to add token. Please follow the instructions in the MetaMask app.');

                    // 跳转到MetaMask
                    window.location.href = metamaskAddTokenUrl;
                } catch (error) {
                    console.error('Error building alternative add token link:', error);
                    alert('Failed to create link: ' + error.message);
                }
            });

            // 方法3: 手动添加说明
            const manualAddButton = document.createElement('button');
            manualAddButton.textContent = 'Method 3: Copy Info for Manual Add';
            manualAddButton.style.display = 'block';
            manualAddButton.style.width = '100%';
            manualAddButton.style.margin = '10px 0';
            manualAddButton.style.padding = '12px';
            manualAddButton.style.backgroundColor = '#28a745';
            manualAddButton.style.color = 'white';
            manualAddButton.style.border = 'none';
            manualAddButton.style.borderRadius = '5px';
            manualAddButton.style.cursor = 'pointer';

            manualAddButton.addEventListener('click', () => {
                // 创建可复制的信息
                const copyInfo = `
Token Information:
Address: ${currentTokenData.address}
Symbol: ${currentTokenData.symbol}
Decimals: ${currentTokenData.decimals}
${currentTokenData.logoUrl ? 'Image URL: ' + currentTokenData.logoUrl : ''}
                `.trim();

                // 创建复制信息的文本区域
                const textAreaContainer = document.createElement('div');
                textAreaContainer.style.margin = '15px 0';

                const textArea = document.createElement('textarea');
                textArea.value = copyInfo;
                textArea.style.width = '100%';
                textArea.style.height = '120px';
                textArea.style.padding = '8px';
                textArea.style.borderRadius = '5px';
                textArea.style.border = '1px solid #ddd';
                textArea.style.resize = 'none';
                textAreaContainer.appendChild(textArea);

                const copyButton = document.createElement('button');
                copyButton.textContent = 'Copy to Clipboard';
                copyButton.style.marginTop = '10px';
                copyButton.style.padding = '8px 15px';
                copyButton.style.backgroundColor = '#6c757d';
                copyButton.style.color = 'white';
                copyButton.style.border = 'none';
                copyButton.style.borderRadius = '5px';
                copyButton.style.cursor = 'pointer';

                copyButton.addEventListener('click', () => {
                    textArea.select();
                    document.execCommand('copy');
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => {
                        copyButton.textContent = 'Copy to Clipboard';
                    }, 2000);
                });

                // 动态添加文本区域和复制按钮
                if (!document.getElementById('copy-container')) {
                    const copyContainer = document.createElement('div');
                    copyContainer.id = 'copy-container';
                    copyContainer.appendChild(textAreaContainer);
                    copyContainer.appendChild(copyButton);

                    // 添加手动添加说明
                    const manualInstructions = document.createElement('div');
                    manualInstructions.style.marginTop = '15px';
                    manualInstructions.style.fontSize = '14px';
                    manualInstructions.style.backgroundColor = '#f8f9fa';
                    manualInstructions.style.padding = '10px';
                    manualInstructions.style.borderRadius = '5px';
                    manualInstructions.style.border = '1px solid #ddd';
                    manualInstructions.style.textAlign = 'left';
                    manualInstructions.innerHTML = `
                        <p><strong>Manual Add Steps:</strong></p>
                        <ol style="padding-left: 20px; margin-top: 5px;">
                            <li>Open MetaMask wallet</li>
                            <li>Click "Import Token" or "Add Token" button</li>
                            <li>Select "Custom Token"</li>
                            <li>Paste the token contract address</li>
                            <li>Token symbol and decimals should auto-fill</li>
                            <li>Click "Add" to complete</li>
                        </ol>
                    `;
                    copyContainer.appendChild(manualInstructions);
                    optionsContainer.appendChild(copyContainer);
                }
            });

            // 添加取消按钮
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.display = 'block';
            cancelButton.style.width = '100%';
            cancelButton.style.margin = '20px 0 10px 0';
            cancelButton.style.padding = '12px';
            cancelButton.style.backgroundColor = '#6c757d';
            cancelButton.style.color = 'white';
            cancelButton.style.border = 'none';
            cancelButton.style.borderRadius = '5px';
            cancelButton.style.cursor = 'pointer';

            cancelButton.addEventListener('click', () => {
                document.body.removeChild(tokenAddOptions);
            });

            optionsContainer.appendChild(standardLinkButton);
            optionsContainer.appendChild(alternativeLinkButton);
            optionsContainer.appendChild(manualAddButton);
            optionsContainer.appendChild(cancelButton);

            tokenAddOptions.appendChild(optionsContainer);
            document.body.appendChild(tokenAddOptions);
        }

        // 检测URL参数，支持从MetaMask应用返回后恢复状态
        window.addEventListener('DOMContentLoaded', () => {
            // 检查URL参数
            const urlParams = new URLSearchParams(window.location.search);

            // 从MetaMask返回 - 可能是连接或添加代币操作返回
            if (urlParams.has('metamask_return') || urlParams.has('theme') || urlParams.has('redirectUrl') || urlParams.has('connectType')) {
                console.log('Detected return from MetaMask app');

                // 显示提示信息
                const returnNotice = document.createElement('div');
                returnNotice.style.position = 'fixed';
                returnNotice.style.top = '10px';
                returnNotice.style.left = '10px';
                returnNotice.style.right = '10px';
                returnNotice.style.backgroundColor = '#4CAF50';
                returnNotice.style.color = 'white';
                returnNotice.style.padding = '10px';
                returnNotice.style.borderRadius = '5px';
                returnNotice.style.textAlign = 'center';
                returnNotice.style.zIndex = '1000';
                returnNotice.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                returnNotice.textContent = 'Returned from MetaMask, attempting to reconnect...';
                document.body.appendChild(returnNotice);

                // 尝试重新连接
                setTimeout(async () => {
                    try {
                        // 检查是否有保存的连接状态
                        const savedState = loadConnectionState();
                        if (savedState && savedState.connecting && savedState.method === 'walletconnect') {
                            console.log('Attempting to restore WalletConnect connection');
                            await initWalletConnect();
                        } else {
                            // 尝试直接连接MetaMask
                            if (window.ethereum) {
                                await connectMetaMaskExtension();
                            } else {
                                // 如果ethereum对象不存在，重新显示连接选项
                                openMetaMaskMobile();
                            }
                        }

                        // 3秒后移除提示
                        setTimeout(() => {
                            document.body.removeChild(returnNotice);
                        }, 3000);
                    } catch (error) {
                        console.error('Reconnection failed:', error);
                        updateStatusText('Reconnection failed, please try again');
                        document.body.removeChild(returnNotice);
                    }
                }, 1000);
            }
        });

        // 保存连接状态到localStorage
        function saveConnectionState(state) {
            try {
                localStorage.setItem('metamask_connection_state', JSON.stringify(state));
                console.log('Connection state saved:', state);
            } catch (error) {
                console.error('Failed to save connection state:', error);
            }
        }

        // 从localStorage加载连接状态
        function loadConnectionState() {
            try {
                const stateJson = localStorage.getItem('metamask_connection_state');
                if (stateJson) {
                    const state = JSON.parse(stateJson);
                    console.log('Loaded connection state:', state);
                    return state;
                }
            } catch (error) {
                console.error('Failed to load connection state:', error);
            }
            return null;
        }

        // 添加这些辅助函数，它们在代码中被调用但未定义
        function formatAddress(address) {
            if (!address) return '';
            return address.slice(0, 6) + '...' + address.slice(-4);
        }

        function updateUIForConnectedWallet() {
            // 更新连接按钮文本
            const connectButton = document.getElementById('connect-button');
            if (connectButton) {
                connectButton.textContent = 'Connected: ' + formatAddress(userAccount);
            }

            // 显示代币表单
            const tokenForm = document.getElementById('token-form');
            if (tokenForm) {
                tokenForm.style.display = 'block';
            }

            // 生成代币按钮列表
            createTokenButtons();
        }

        function resetUI() {
            // 更新连接按钮文本
            const connectButton = document.getElementById('connect-button');
            if (connectButton) {
                connectButton.textContent = 'Connect Wallet';
            }

            // 隐藏代币表单
            const tokenForm = document.getElementById('token-form');
            if (tokenForm) {
                tokenForm.style.display = 'none';
            }

            // 隐藏代币信息
            const tokenInfo = document.getElementById('token-info');
            if (tokenInfo) {
                tokenInfo.style.display = 'none';
            }
        }

        // 修复代码中引用但未定义的updateConnectButtonText函数
        function updateConnectButtonText() {
            const connectButton = document.getElementById('connect-button');
            if (connectButton) {
                if (accounts.length > 0) {
                    connectButton.textContent = 'Connected: ' + formatAddress(accounts[0]);
                } else {
                    connectButton.textContent = 'Connect Wallet';
                }
            }
        }

        // 修复代码中引用但未定义的resetConnection函数
        function resetConnection() {
            if (walletConnectProvider) {
                try {
                    walletConnectProvider.disconnect();
                } catch (e) {
                    console.error('Error disconnecting WalletConnect:', e);
                }
                walletConnectProvider = null;
            }
            accounts = [];
            userAccount = null;
            web3 = null;
            resetUI();
            updateStatusText('Wallet disconnected');
        }

        // 添加这个缺失的函数 - 连接 MetaMask 浏览器扩展
        async function connectMetaMaskExtension() {
            updateStatusText('Connecting to MetaMask extension...');
            console.log('Attempting to connect to MetaMask browser extension');

            // 确保ethereum对象存在
            if (!window.ethereum) {
                throw new Error('MetaMask extension not detected');
            }

            // 请求用户授权
            accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error('Failed to get MetaMask accounts, please ensure MetaMask is unlocked');
            }

            // 使用 window.ethereum 作为 provider
            web3 = new Web3(window.ethereum);

            // 监听账户变化
            window.ethereum.on('accountsChanged', (newAccounts) => {
                accounts = newAccounts;
                updateConnectButtonText();
                if (accounts.length === 0) {
                    resetUI();
                } else {
                    userAccount = accounts[0]; // 确保更新userAccount
                    updateUIForConnectedWallet();
                }
            });

            // 监听链变化
            window.ethereum.on('chainChanged', (chainId) => {
                console.log('Chain ID changed to:', chainId);
                // 重新查询当前代币（如果有）
                if (currentTokenData) {
                    queryToken(currentTokenData.address);
                }
            });

            // 保存连接状态
            saveConnectionState({
                connected: true,
                timestamp: Date.now(),
                address: userAccount
            });

            // 更新UI
            userAccount = accounts[0];
            updateUIForConnectedWallet();
            updateStatusText(`Connected to account: ${formatAddress(userAccount)}`);
        }

        // 使用MetaMask SDK连接钱包
        async function connectWithMetaMaskSDK() {
            try {
                updateStatusText('Connecting to MetaMask...');
                
                if (!metamaskSDK) {
                    throw new Error('MetaMask SDK not initialized');
                }
                
                const ethereum = metamaskSDK.getProvider();
                if (!ethereum) {
                    throw new Error('Failed to get MetaMask provider');
                }
                
                // 将ethereum对象附加到window以保持兼容性
                window.ethereum = ethereum;
                
                // 请求连接钱包
                console.log('Requesting MetaMask connection');
                const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                
                if (!accounts || accounts.length === 0) {
                    throw new Error('Failed to get MetaMask accounts');
                }
                
                // 初始化Web3
                web3 = new Web3(ethereum);
                
                // 保存账户信息
                userAccount = accounts[0];
                
                // 更新界面
                updateUIForConnectedWallet();
                updateStatusText(`Connected to MetaMask: ${formatAddress(userAccount)}`);
                
                // 添加事件监听
                ethereum.on('accountsChanged', handleAccountsChanged);
                ethereum.on('chainChanged', handleChainChanged);
                ethereum.on('disconnect', handleDisconnect);
                
                // 保存连接状态
                saveConnectionState({
                    connected: true,
                    method: 'metamask-sdk',
                    timestamp: Date.now(),
                    address: userAccount
                });
                
                return true;
            } catch (error) {
                console.error('MetaMask SDK connection failed:', error);
                updateStatusText(`Connection failed: ${error.message || 'Unknown error'}`);
                
                // 如果是用户拒绝或取消，显示重试按钮
                if (error.code === 4001) {
                    showRetryConnectButton();
                } else {
                    // 其他错误，显示备用连接选项
                    showFallbackConnectionOptions();
                }
                
                return false;
            }
        }

        // 处理账户变更
        function handleAccountsChanged(accounts) {
            console.log('Accounts changed:', accounts);
            if (accounts.length === 0) {
                // 用户断开了连接
                userAccount = null;
                resetUI();
                updateStatusText('MetaMask disconnected');
            } else if (accounts[0] !== userAccount) {
                userAccount = accounts[0];
                updateUIForConnectedWallet();
                updateStatusText(`Account changed: ${formatAddress(userAccount)}`);
            }
        }

        // 处理链变更
        function handleChainChanged(chainId) {
            console.log('Chain changed:', chainId);
            updateStatusText(`Chain changed: ${chainId}`);
            
            // 如果有当前查看的代币，重新查询
            if (currentTokenData) {
                queryToken(currentTokenData.address);
            }
            
            // 更新网络显示
            updateNetworkDisplay(chainId);
        }

        // 处理断开连接
        function handleDisconnect(error) {
            console.log('MetaMask disconnected:', error);
            userAccount = null;
            resetUI();
            updateStatusText('MetaMask disconnected');
            
            // 清除连接状态
            localStorage.removeItem('metamask_connection_state');
        }

        // 显示重试连接按钮
        function showRetryConnectButton() {
            const container = document.getElementById('metamask-container');
            if (!container) return;
            
            const retryButton = document.createElement('button');
            retryButton.className = 'metamask-button';
            retryButton.textContent = 'Retry MetaMask Connection';
            retryButton.style.margin = '10px 0';
            retryButton.onclick = () => connectWithMetaMaskSDK();
            container.appendChild(retryButton);
        }

        // 显示备用连接选项
        function showFallbackConnectionOptions() {
            const container = document.getElementById('metamask-container');
            if (!container) return;
            
            const optionsDiv = document.createElement('div');
            optionsDiv.innerHTML = `
                <p style="margin-bottom:15px">Connection failed, please try the following options:</p>
                <button class="metamask-button walletconnect-button"><img src="https://cdn.jsdelivr.net/gh/WalletConnect/walletconnect-assets/svg/original/walletconnect-logo.svg" style="height: 20px; margin-right: 8px;" /> Connect with WalletConnect</button>
                <button class="metamask-button">⬇️ Install MetaMask</button>
            `;
            
            const wcButton = optionsDiv.querySelector('.walletconnect-button');
            wcButton.onclick = () => initWalletConnect();
            
            const installButton = optionsDiv.querySelector('.metamask-button:not(.walletconnect-button)');
            installButton.onclick = () => window.open('https://metamask.io/download/', '_blank');
            
            container.appendChild(optionsDiv);
        }

        // 更新网络显示
        function updateNetworkDisplay(chainId) {
            const networkIndicator = document.getElementById('network-indicator');
            if (!networkIndicator) return;
            
            const networkMap = {
                '0x1': { name: 'Ethereum Mainnet', color: '#28a745' },
                '0x38': { name: 'Binance Smart Chain', color: '#f6851b' },
                '0x89': { name: 'Polygon', color: '#8247e5' },
                '0x5': { name: 'Goerli Testnet', color: '#ffc107' },
                '0xaa36a7': { name: 'Sepolia Testnet', color: '#ffc107' }
            };
            
            const network = networkMap[chainId] || { name: `Chain ID: ${chainId}`, color: '#6c757d' };
            networkIndicator.textContent = network.name;
            networkIndicator.style.backgroundColor = network.color;
            networkIndicator.style.display = 'inline-block';
        }

        // 替换连接钱包按钮的点击事件处理
        const existingConnectButton = document.getElementById('connect-button');
        if (existingConnectButton) {
            // 移除旧的事件监听器
            const newConnectButton = existingConnectButton.cloneNode(true);
            existingConnectButton.parentNode.replaceChild(newConnectButton, existingConnectButton);
            // 添加新的事件监听器，使用已有的连接逻辑
            newConnectButton.addEventListener('click', async () => {
                // 如果已连接，断开连接
                if (userAccount) {
                    resetConnection();
                    return;
                }

                // 检测环境并选择合适的连接方式
                if (isMobile()) {
                    // 移动设备 - 提供选择
                    if (window.ethereum && window.ethereum.isMetaMask) {
                        // 移动设备上的浏览器中已安装MetaMask插件
                        await connectMetaMaskExtension();
                    } else {
                        // 直接调用MetaMask连接选项
                        openMetaMaskMobile();
                    }
                } else {
                    // PC设备
                    if (typeof window.ethereum !== 'undefined') {
                        await connectMetaMaskExtension();
                    } else {
                        // PC上未安装MetaMask插件，使用WalletConnect
                        await initWalletConnect();
                    }
                }
            });
        }

        // 使用SDK添加代币的函数
        async function addTokenViaSDK() {
            try {
                if (!window.ethereum || !currentTokenData) {
                    throw new Error('MetaMask not connected or token data missing');
                }
                updateStatusText('Adding token...');
                
                const wasAdded = await window.ethereum.request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: 'ERC20',
                        options: {
                            address: currentTokenData.address,
                            symbol: currentTokenData.symbol,
                            decimals: parseInt(currentTokenData.decimals),
                            image: currentTokenData.logoUrl || undefined
                        }
                    }
                });
                
                if (wasAdded) {
                    updateStatusText('Token added successfully!');
                } else {
                    updateStatusText('User cancelled token addition');
                }
            } catch (error) {
                console.error('Failed to add token via SDK:', error);
                updateStatusText(`Failed to add token: ${error.message || 'Unknown error'}`);
                throw error;
            }
        }
    });
} catch (error) {
    console.error('Error loading script:', error);
}

// 添加函数：检查MetaMask授权状态
async function checkMetaMaskAuthorizationStatus() {
    // 检查是否已经从MetaMask返回
    const urlParams = new URLSearchParams(window.location.search);
    
    // 如果没有从MetaMask返回，则不执行检查
    if (!urlParams.has('metamask_return')) return;
    
    try {
        const savedState = loadConnectionState();
        if (!savedState || !savedState.pendingAuthorization) return;
        
        // 添加连接超时检查
        const now = Date.now();
        const connectionTimeout = 5 * 60 * 1000; // 5分钟超时
        
        if (now - savedState.timestamp > connectionTimeout) {
            console.log('Connection attempt timed out, clearing state');
            localStorage.removeItem('metamask_connection_state');
            updateStatusText('Connection attempt timed out. Please try again.');
            return;
        }
        
        console.log('Checking MetaMask authorization status');
        
        // 尝试检查连接状态
        if (window.ethereum) {
            // 首先尝试获取账户但不弹出提示
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            
            if (accounts && accounts.length > 0) {
                console.log('Already authorized:', accounts[0]);
                userAccount = accounts[0];
                updateUIForConnectedWallet();
                updateStatusText(`Connected to account: ${formatAddress(userAccount)}`);
                
                // 更新连接状态
                saveConnectionState({
                    connected: true,
                    address: userAccount,
                    pendingAuthorization: false
                });
            } else {
                // 需要请求授权
                console.log('Authorization needed, requesting accounts');
                try {
                    const requestedAccounts = await window.ethereum.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    
                    if (requestedAccounts && requestedAccounts.length > 0) {
                        userAccount = requestedAccounts[0];
                        updateUIForConnectedWallet();
                        updateStatusText(`Connected to account: ${formatAddress(userAccount)}`);
                        
                        // 更新连接状态
                        saveConnectionState({
                            connected: true,
                            address: userAccount,
                            pendingAuthorization: false
                        });
                    }
                } catch (authError) {
                    console.error('User rejected authorization:', authError);
                    updateStatusText('Connection rejected. Please try again.');
                    
                    // 清除待处理状态
                    localStorage.removeItem('metamask_connection_state');
                }
            }
        }
    } catch (error) {
        console.error('Error checking authorization status:', error);
    }
}

// 在页面加载时检查授权状态
window.addEventListener('DOMContentLoaded', () => {
    // 检查是否是从MetaMask返回
    setTimeout(() => {
        checkMetaMaskAuthorizationStatus();
    }, 500);
});