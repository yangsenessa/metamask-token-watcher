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
            console.error('导入Web3失败:', err);
        });
    } catch (error) {
        console.error('加载Web3时出错:', error);
    }
}

// 使用动态导入避免构造函数错误
// import WalletConnectProvider from '@walletconnect/web3-provider';

// ABI最小接口定义
const minABI = [
    // balanceOf
    {
        constant: true,
        inputs: [{ name: "_owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "balance", type: "uint256" }],
        type: "function",
    },
    // decimals
    {
        constant: true,
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        type: "function",
    },
    // symbol
    {
        constant: true,
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", type: "string" }],
        type: "function",
    }
];

// 静态代币列表
const TOKEN_LIST = {
    'REVERSE': {
        name: 'Reverse',
        address: '0x556E698869b476D91Fa7afe3FD1781f576D8a999',
        logoUrl: 'https://bafkreihnvooqmaucqaxir3avw5wkcfc5zmcnkxxo4kjiir2ijzqamyrgwi.ipfs.w3s.link/?filename=tokenlogo.jpg'
    }
    // 您可以继续添加更多代币
};

// 检测设备类型
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 显示加载指示器
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

// 更新设备信息显示
function updateDeviceInfo() {
    const deviceInfo = document.getElementById('device-info');
    if (deviceInfo) {
        if (isMobile()) {
            deviceInfo.innerHTML = '<p>检测到移动设备 - 支持MetaMask应用和WalletConnect</p>';
        } else {
            deviceInfo.innerHTML = '<p>检测到桌面设备 - 支持MetaMask浏览器扩展和WalletConnect</p>';
        }
    }
}

// 更新WalletConnect相关函数
async function loadWalletConnectProvider() {
    console.log('加载WalletConnect提供商...');

    try {
        // 首先尝试使用全局预加载的提供商
        if (window.WalletConnectProvider) {
            console.log('使用预加载的WalletConnectProvider');
            return window.WalletConnectProvider;
        }

        console.log('尝试从CDN动态导入WalletConnectProvider...');
        // 如果全局变量不存在，动态导入
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@walletconnect/web3-provider@1.8.0/dist/umd/index.min.js';
            script.onload = () => {
                console.log('WalletConnectProvider从CDN加载成功');
                if (window.WalletConnectProvider) {
                    resolve(window.WalletConnectProvider);
                } else {
                    reject(new Error('加载成功但WalletConnectProvider未定义'));
                }
            };
            script.onerror = () => reject(new Error('加载WalletConnectProvider失败'));
            document.head.appendChild(script);
        });
    } catch (error) {
        console.error('加载WalletConnectProvider时出错:', error);
        throw error;
    }
}

// 初始化MetaMask专用WalletConnect方法
async function initMetaMaskWalletConnect() {
    try {
        console.log('初始化MetaMask专用WalletConnect...');
        updateStatusText('正在初始化WalletConnect连接...');
        
        // 加载WalletConnect Provider
        const WalletConnectProvider = await loadWalletConnectProvider();
        console.log('WalletConnectProvider加载成功:', WalletConnectProvider);
        
        // 创建WalletConnect提供商实例 - 特别配置为MetaMask
        const provider = new WalletConnectProvider({
            infuraId: "9aa3d95b3bc440fa88ea12eaa4456161",
            rpc: {
                1: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
                56: "https://bsc-dataseed.binance.org/",
                137: "https://polygon-rpc.com"
            },
            qrcodeModalOptions: {
                mobileLinks: ["metamask"]  // 仅显示MetaMask选项
            }
        });
        
        console.log('WalletConnect提供商已创建:', provider);
        updateStatusText('请在弹出的二维码窗口中使用MetaMask扫码');
        
        // 启用会话（显示QR码）
        await provider.enable();
        console.log('WalletConnect会话已启用');
        
        // 创建Web3实例
        window.web3 = new Web3(provider);
        walletConnectProvider = provider;
        
        // 获取连接的账户
        const accounts = await window.web3.eth.getAccounts();
        if (accounts.length > 0) {
            userAccount = accounts[0];
            updateUIForConnectedWallet();
            updateStatusText(`已连接到MetaMask账户: ${formatAddress(userAccount)}`);
        }
        
        // 监听账户变更
        provider.on("accountsChanged", (accounts) => {
            if (accounts.length > 0) {
                userAccount = accounts[0];
                updateUIForConnectedWallet();
                updateStatusText(`账户已变更: ${formatAddress(userAccount)}`);
            } else {
                resetUI();
                updateStatusText('没有连接账户');
            }
        });
        
        // 监听链变更
        provider.on("chainChanged", (chainId) => {
            console.log('链已变更:', chainId);
            updateStatusText(`链已变更: ${chainId}`);
        });
        
        // 监听断开连接
        provider.on("disconnect", (code, reason) => {
            console.log('断开连接:', code, reason);
            userAccount = null;
            resetUI();
            updateStatusText('MetaMask已断开连接');
        });
        
        return provider;
    } catch (error) {
        console.error('初始化MetaMask专用WalletConnect出错:', error);
        updateStatusText(`连接失败: ${error.message || error}`);
        
        // 显示错误信息并提供替代连接选项
        updateStatusText('连接MetaMask失败，请尝试其他连接方式');
        
        // 如果在移动设备上，展示多种连接选项
        if (isMobile()) {
            setTimeout(() => {
                openMetaMaskMobile(); // 这已经提供了多种连接选项
            }, 1000);
        } else {
            // 在桌面上，告知用户安装MetaMask扩展
            alert('连接失败。请安装MetaMask浏览器扩展，或尝试在移动设备上使用。');
        }
        
        throw error;
    }
}

// 初始化通用WalletConnect方法
async function initWalletConnect() {
    try {
        updateStatusText('正在初始化WalletConnect...');
        console.log('初始化WalletConnect...');
        
        const WalletConnectProvider = await loadWalletConnectProvider();
        console.log('WalletConnectProvider已加载:', WalletConnectProvider);
        
        // 确保Web3已加载
        if (!Web3) {
            throw new Error('Web3未正确加载，无法初始化WalletConnect');
        }
        
        // 创建WalletConnect提供商实例
        const provider = new WalletConnectProvider({
            infuraId: "9aa3d95b3bc440fa88ea12eaa4456161", // 使用Infura公共ID
            rpc: {
                1: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
                56: "https://bsc-dataseed.binance.org/",
                137: "https://polygon-rpc.com"
            },
            bridge: 'https://bridge.walletconnect.org',
            qrcodeModalOptions: {
                mobileLinks: ["metamask", "trust"]
            }
        });
        
        console.log('WalletConnect提供商已创建:', provider);
        updateStatusText('WalletConnect已初始化，请在弹出的QR码窗口中连接钱包');

        // 启用会话（显示QR码）
        await provider.enable();
        console.log('WalletConnect会话已启用');
        
        // 创建Web3实例
        window.web3 = new Web3(provider);
        walletConnectProvider = provider;
        
        // 获取连接的账户
        const accounts = await window.web3.eth.getAccounts();
        if (accounts.length > 0) {
            userAccount = accounts[0];
            updateUIForConnectedWallet();
            updateStatusText(`已通过WalletConnect连接到账户: ${formatAddress(userAccount)}`);
            console.log('已连接到账户:', userAccount);
        }
        
        // 监听账户变更
        provider.on("accountsChanged", (accounts) => {
            if (accounts.length > 0) {
                userAccount = accounts[0];
                updateUIForConnectedWallet();
                updateStatusText(`账户已变更: ${formatAddress(userAccount)}`);
            } else {
                resetUI();
                updateStatusText('没有连接账户');
            }
        });
        
        // 监听链变更
        provider.on("chainChanged", (chainId) => {
            console.log('链已变更:', chainId);
            updateStatusText(`链已变更: ${chainId}`);
        });
        
        // 监听断开连接
        provider.on("disconnect", (code, reason) => {
            console.log('断开连接:', code, reason);
            userAccount = null;
            resetUI();
            updateStatusText('钱包已断开连接');
        });
        
        // 返回提供商实例
        return provider;
    } catch (error) {
        console.error('初始化WalletConnect时出错:', error);
        updateStatusText(`WalletConnect连接失败: ${error.message || error}`);
        // 显示更详细的错误信息
        console.log('错误详情:', error);
        if (error.toString().includes('User closed modal')) {
            updateStatusText('用户关闭了WalletConnect连接窗口');
        }
        
        // 显示错误信息并提供替代连接选项
        updateStatusText('连接WalletConnect失败，请尝试其他连接方式');
        
        // 如果在移动设备上，展示多种连接选项
        if (isMobile()) {
            setTimeout(() => {
                openMetaMaskMobile(); // 这已经提供了多种连接选项
            }, 1000);
        } else {
            // 在桌面上，告知用户安装MetaMask扩展
            alert('连接失败。请安装MetaMask浏览器扩展，或尝试在移动设备上使用。');
        }
        
        throw error;
    }
}

window.addEventListener('load', async () => {
    let web3;
    let provider;
    let userAccount = null;
    
    const connectButton = document.getElementById('connect-button');
    const tokenForm = document.getElementById('token-form');
    const tokenList = document.getElementById('token-list');
    const addTokenButton = document.getElementById('add-token');
    const tokenInfo = document.getElementById('token-info');

    let accounts = [];
    let currentTokenData = null;
    let walletConnectProvider = null;

    // 更新设备信息
    updateDeviceInfo();

    // 显示网络信息
    if (window.ethereum) {
        try {
            const networkIndicator = document.getElementById('network-indicator');
            if (networkIndicator) {
                const updateNetworkDisplay = async () => {
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
                };
                
                // 初始更新
                updateNetworkDisplay();
                
                // 监听网络变化
                window.MetaMaskHelper.watchNetworkChanges(updateNetworkDisplay);
            }
        } catch (e) {
            console.error('更新网络显示时出错:', e);
        }
    }

    // 生成代币按钮列表
    function createTokenButtons() {
        // 先清空现有按钮列表
        tokenList.innerHTML = '';
        
        // 创建所有代币的按钮，使用最简单的方式
        const tokens = Object.values(TOKEN_LIST);
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            // 创建容器
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
            
            // 将按钮添加到容器
            buttonContainer.appendChild(button);
            
            // 将容器添加到列表
            tokenList.appendChild(buttonContainer);
            
            // 使用独立的方式绑定事件，避免在循环中创建闭包
            document.getElementById('token-button-' + i).onclick = function() {
                handleTokenClick(token.address);
            };
        }
    }

    // 简化的代币点击处理函数
    function handleTokenClick(address) {
        try {
            if (!address) {
                console.error('缺少代币地址');
                alert('无法查询代币: 地址无效');
                return;
            }
            console.log('查询代币地址:', address); // 添加日志，帮助调试
            queryToken(address);
        } catch (error) {
            console.error('处理代币点击出错:', error);
            alert('处理代币点击时出错: ' + error.message);
        }
    }

    // 查询代币信息
    async function queryToken(tokenAddress) {
        // 参数验证
        if (!tokenAddress || typeof tokenAddress !== 'string') {
            console.error('查询代币: 无效的代币地址', tokenAddress);
            alert('请提供有效的代币地址');
            return;
        }
        
        // 显示加载中状态
        document.getElementById('token-info').style.display = 'none';
        showLoader();
        
        try {
            // 确保web3已初始化
            if (!web3) {
                throw new Error('Web3未初始化，请先连接钱包');
            }
            
            console.log('开始查询代币信息:', tokenAddress);
            
            // 创建代币合约实例
            let tokenContract;
            try {
                tokenContract = new web3.eth.Contract(minABI, tokenAddress);
            } catch (err) {
                console.error('创建合约实例失败:', err);
                throw new Error('无法创建代币合约实例: ' + err.message);
            }
            
            // 获取代币符号
            let symbol;
            try {
                symbol = await tokenContract.methods.symbol().call();
                console.log('代币符号:', symbol);
            } catch (err) {
                console.error('获取代币符号失败:', err);
                throw new Error('无法获取代币符号，可能不是标准ERC20代币');
            }
            
            // 获取小数位数
            let decimals;
            try {
                decimals = await tokenContract.methods.decimals().call();
                console.log('代币小数位:', decimals);
            } catch (err) {
                console.error('获取代币小数位失败:', err);
                throw new Error('无法获取代币小数位，可能不是标准ERC20代币');
            }
            
            // 从静态配置查找代币信息
            const foundTokenInfo = Object.values(TOKEN_LIST).find(
                t => t.address.toLowerCase() === tokenAddress.toLowerCase()
            );
            console.log('找到代币信息:', foundTokenInfo);
            
            const logoUrl = foundTokenInfo ? foundTokenInfo.logoUrl : '';
            
            // 更新当前代币数据
            currentTokenData = {
                address: tokenAddress,
                symbol: symbol,
                decimals: decimals,
                logoUrl: logoUrl
            };
            
            // 安全地更新UI
            try {
                // 更新文本显示
                document.getElementById('token-symbol-display').textContent = symbol;
                document.getElementById('token-decimals-display').textContent = decimals;
                document.getElementById('token-logo-url-display').textContent = logoUrl || '未提供';
                
                // 更新logo预览
                const logoPreview = document.getElementById('token-logo-preview');
                if (logoUrl) {
                    logoPreview.src = logoUrl;
                    logoPreview.style.display = 'block';
                    logoPreview.onerror = () => {
                        logoPreview.style.display = 'none';
                        document.getElementById('token-logo-url-display').textContent = 'Logo加载失败';
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
                console.error('更新UI时出错:', uiError);
                // UI错误不阻止流程，但要记录
            }
            
            console.log('代币查询完成:', currentTokenData);
            
            // 隐藏加载状态
            hideLoader();
        } catch (error) {
            console.error('查询代币时发生错误:', error, '地址:', tokenAddress);
            alert('查询代币失败: ' + (error.message || '未知错误'));
            document.getElementById('token-info').style.display = 'none';
            hideLoader();
        }
    }

    // 更新MetaMask移动端连接函数
    function openMetaMaskMobile() {
        if (userAccount) {
            console.log("已连接到钱包，无需再次连接");
            return;
        }

        // 创建连接选项容器
        const connectionOptionsContainer = document.createElement('div');
        connectionOptionsContainer.className = 'connection-options';
        connectionOptionsContainer.style.marginTop = '20px';
        connectionOptionsContainer.style.display = 'flex';
        connectionOptionsContainer.style.flexDirection = 'column';
        connectionOptionsContainer.style.gap = '10px';
        
        // 添加说明
        const instructionsText = document.createElement('p');
        instructionsText.textContent = '请选择连接方式:';
        instructionsText.style.margin = '0 0 10px 0';
        instructionsText.style.fontWeight = 'bold';
        connectionOptionsContainer.appendChild(instructionsText);

        // 添加移动端深度链接选项
        const deepLinkOptions = [
            {
                name: 'MetaMask - 方式1 (推荐)',
                url: `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`,
                icon: '📱'
            },
            {
                name: 'MetaMask - 方式2',
                url: `metamask://dapp/${window.location.host}${window.location.pathname}`,
                icon: '🔗'
            },
            {
                name: 'MetaMask - 方式3',
                url: `https://metamask.io/download/`,
                icon: '⬇️'
            }
        ];

        deepLinkOptions.forEach(option => {
            const button = document.createElement('button');
            button.className = 'metamask-button';
            button.innerHTML = `${option.icon} ${option.name}`;
            button.onclick = () => {
                console.log(`尝试通过 ${option.name} 连接 MetaMask`);
                updateStatusText(`正在尝试连接到 MetaMask (${option.name})...`);
                window.location.href = option.url;
            };
            connectionOptionsContainer.appendChild(button);
        });

        // 添加WalletConnect选项
        const wcButton = document.createElement('button');
        wcButton.className = 'metamask-button walletconnect-button';
        wcButton.innerHTML = '<img src="https://cdn.jsdelivr.net/gh/WalletConnect/walletconnect-assets/svg/original/walletconnect-logo.svg" style="height: 20px; margin-right: 8px;" /> 通过WalletConnect连接MetaMask';
        wcButton.style.backgroundColor = '#3b99fc';
        wcButton.style.color = 'white';
        wcButton.style.display = 'flex';
        wcButton.style.alignItems = 'center';
        wcButton.style.justifyContent = 'center';
        wcButton.onclick = () => {
            console.log('尝试通过WalletConnect连接MetaMask');
            updateStatusText('正在初始化WalletConnect连接...');
            
            // 移除连接选项容器
            if (connectionOptionsContainer.parentNode) {
                connectionOptionsContainer.parentNode.removeChild(connectionOptionsContainer);
            }
            
            // 初始化WalletConnect
            initWalletConnect().catch(error => {
                console.error('WalletConnect连接失败:', error);
                updateStatusText(`WalletConnect连接失败: ${error.message || '未知错误'}`);
                
                // 如果连接失败，重新显示连接选项
                document.getElementById('metamask-container').appendChild(connectionOptionsContainer);
            });
        };
        connectionOptionsContainer.appendChild(wcButton);

        // 清除现有内容并添加选项
        const container = document.getElementById('metamask-container');
        container.innerHTML = '';
        container.appendChild(connectionOptionsContainer);
    }

    // 连接钱包按钮点击事件
    connectButton.addEventListener('click', async () => {
        // 如果已连接，断开连接
        if (accounts.length > 0) {
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
            alert('请先查询代币信息');
            return;
        }

        try {
            showLoader();
            updateStatusText('正在处理添加代币请求...');
            
            console.log('正在添加代币:', currentTokenData);
            
            // 获取当前网络ID
            let chainId;
            try {
                if (window.ethereum) {
                    chainId = await window.ethereum.request({ method: 'eth_chainId' });
                    console.log('当前链ID:', chainId);
                } else if (web3 && web3.eth) {
                    chainId = await web3.eth.getChainId();
                    console.log('当前链ID:', chainId);
                }
            } catch (e) {
                console.warn('无法获取链ID:', e);
            }
            
            // 确保web3已初始化
            if (!web3) {
                throw new Error('Web3未初始化，请先连接钱包');
            }
            
            // 标准化代币参数
            const tokenParams = {
                type: 'ERC20',
                options: {
                    address: currentTokenData.address,
                    symbol: currentTokenData.symbol,
                    decimals: parseInt(currentTokenData.decimals),
                    image: currentTokenData.logoUrl || undefined
                }
            };
            
            console.log('代币添加参数:', tokenParams);
            
            // 检测连接类型，并使用相应的方法添加代币
            if (window.ethereum && web3.currentProvider === window.ethereum) {
                // 使用MetaMask浏览器扩展
                try {
                    updateStatusText('请在MetaMask弹窗中确认添加代币...');
                    
                    const wasAdded = await window.ethereum.request({
                        method: 'wallet_watchAsset',
                        params: tokenParams
                    });

                    if (wasAdded) {
                        updateStatusText('代币添加成功！');
                        alert('代币添加成功！请在MetaMask中查看。');
                    } else {
                        updateStatusText('代币添加被取消');
                        alert('代币添加被取消');
                    }
                } catch (error) {
                    console.error('添加代币到MetaMask插件时出错:', error);
                    alert(`添加代币失败: ${error.message}`);
                    
                    // 尝试使用备用方法
                    showTokenAddOptions();
                }
            } else if (isMobile() && !walletConnectProvider) {
                // 移动设备上使用多种添加代币方法
                updateStatusText('正在打开代币添加选项...');
                showTokenAddOptions();
            } else if (walletConnectProvider) {
                // 使用WalletConnect
                try {
                    updateStatusText('正在通过WalletConnect添加代币...');
                    
                    const wasAdded = await walletConnectProvider.request({
                        method: 'wallet_watchAsset',
                        params: tokenParams
                    });
                    
                    if (wasAdded) {
                        updateStatusText('代币添加成功！');
                        alert('代币添加成功！请在钱包中查看。');
                    } else {
                        updateStatusText('代币添加被取消');
                        alert('代币添加被取消');
                    }
                } catch (error) {
                    // 如果不支持wallet_watchAsset方法，显示手动添加信息
                    console.error('WalletConnect添加代币错误:', error);
                    updateStatusText('您的钱包不支持自动添加代币，请尝试手动添加');
                    showTokenAddOptions();
                }
            } else {
                throw new Error('未检测到支持的钱包连接');
            }
            
            hideLoader();
        } catch (error) {
            console.error('添加代币时发生错误:', error);
            updateStatusText(`添加代币失败: ${error.message}`);
            alert('添加代币失败: ' + error.message);
            hideLoader();
        }
    });

    // 优化代币添加选项界面
    function showTokenAddOptions() {
        // 创建选择界面
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
        title.textContent = '添加代币到MetaMask';
        title.style.marginTop = '0';
        
        const description = document.createElement('p');
        description.textContent = '请选择一种方式将代币添加到MetaMask钱包：';
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
            <p><strong>代币名称:</strong> ${currentTokenData.symbol}</p>
            <p><strong>合约地址:</strong> <span style="word-break: break-all;">${currentTokenData.address}</span></p>
            <p><strong>小数位:</strong> ${currentTokenData.decimals}</p>
        `;
        tokenInfoDiv.appendChild(tokenInfo);
        
        optionsContainer.appendChild(title);
        optionsContainer.appendChild(description);
        optionsContainer.appendChild(tokenInfoDiv);
        
        // 创建不同的添加方式按钮
        
        // 方法1: 标准深度链接
        const standardLinkButton = document.createElement('button');
        standardLinkButton.textContent = '方法1: 在MetaMask中添加';
        standardLinkButton.style.display = 'block';
        standardLinkButton.style.width = '100%';
        standardLinkButton.style.margin = '10px 0';
        standardLinkButton.style.padding = '12px';
        standardLinkButton.style.backgroundColor = '#f6851b';
        standardLinkButton.style.color = 'white';
        standardLinkButton.style.border = 'none';
        standardLinkButton.style.borderRadius = '5px';
        standardLinkButton.style.cursor = 'pointer';
        standardLinkButton.style.fontWeight = 'bold';
        
        standardLinkButton.addEventListener('click', () => {
            try {
                // 构建代币参数
                const tokenParams = {
                    type: 'ERC20', 
                    options: {
                        address: currentTokenData.address,
                        symbol: currentTokenData.symbol,
                        decimals: parseInt(currentTokenData.decimals),
                        image: currentTokenData.logoUrl
                    }
                };
                
                // 使用完整标准格式
                const tokenParamsString = JSON.stringify(tokenParams);
                const encodedParams = encodeURIComponent(tokenParamsString);
                
                // 构建MetaMask深度链接 - 不同格式适用于移动端
                const metamaskAddTokenUrl = `https://metamask.app.link/wallet_watchAsset?params=${encodedParams}`;
                
                console.log('添加代币链接 (方法1):', metamaskAddTokenUrl);
                document.body.removeChild(tokenAddOptions);
                
                // 跳转前提示
                alert('即将跳转到MetaMask应用添加代币，请在MetaMask中点击添加按钮确认。');
                
                // 跳转到MetaMask
                window.location.href = metamaskAddTokenUrl;
            } catch (error) {
                console.error('构建添加代币链接时出错:', error);
                alert('创建链接失败: ' + error.message);
            }
        });
        
        // 方法2: 备用深度链接格式
        const alternativeLinkButton = document.createElement('button');
        alternativeLinkButton.textContent = '方法2: 备用添加方式';
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
                // 使用简化参数格式
                const metamaskAddTokenUrl = `https://metamask.app.link/add-token?address=${currentTokenData.address}&symbol=${currentTokenData.symbol}&decimals=${currentTokenData.decimals}&image=${encodeURIComponent(currentTokenData.logoUrl || '')}`;
                
                console.log('添加代币链接 (方法2):', metamaskAddTokenUrl);
                document.body.removeChild(tokenAddOptions);
                
                // 跳转前提示
                alert('使用备用方式添加代币，请按照MetaMask应用中的提示操作。');
                
                // 跳转到MetaMask
                window.location.href = metamaskAddTokenUrl;
            } catch (error) {
                console.error('构建备用添加代币链接时出错:', error);
                alert('创建链接失败: ' + error.message);
            }
        });
        
        // 方法3: 手动添加说明
        const manualAddButton = document.createElement('button');
        manualAddButton.textContent = '方法3: 复制信息手动添加';
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
代币信息：
地址: ${currentTokenData.address}
符号: ${currentTokenData.symbol}
小数位: ${currentTokenData.decimals}
${currentTokenData.logoUrl ? '图片URL: ' + currentTokenData.logoUrl : ''}
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
            
            // 添加复制按钮
            const copyButton = document.createElement('button');
            copyButton.textContent = '复制到剪贴板';
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
                copyButton.textContent = '已复制!';
                setTimeout(() => {
                    copyButton.textContent = '复制到剪贴板';
                }, 2000);
            });
            
            textAreaContainer.appendChild(copyButton);
            
            // 动态添加文本区域和复制按钮
            if (!document.getElementById('copy-container')) {
                const copyContainer = document.createElement('div');
                copyContainer.id = 'copy-container';
                copyContainer.appendChild(textAreaContainer);
                
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
                    <p><strong>手动添加步骤:</strong></p>
                    <ol style="padding-left: 20px; margin-top: 5px;">
                        <li>打开MetaMask钱包</li>
                        <li>点击"导入代币"或"添加代币"按钮</li>
                        <li>选择"自定义代币"</li>
                        <li>粘贴代币合约地址</li>
                        <li>代币符号和小数位应自动填充</li>
                        <li>点击"添加"完成</li>
                    </ol>
                `;
                
                copyContainer.appendChild(manualInstructions);
                optionsContainer.appendChild(copyContainer);
            }
        });
        
        // 添加取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
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
        
        // 添加所有按钮到容器
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
        
        // 添加MetaMask应用返回检测
        if (isMobile()) {
            console.log('移动设备检测 - 检查回调参数');
            
            // 从MetaMask返回 - 可能是连接或添加代币操作返回
            if (urlParams.has('metamask_return') || urlParams.has('theme') || urlParams.has('redirectUrl')) {
                console.log('检测到从MetaMask应用返回');
                
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
                returnNotice.textContent = '已从MetaMask返回，正在尝试重新连接...';
                
                document.body.appendChild(returnNotice);
                
                // 尝试重新连接
                setTimeout(() => {
                    if (!accounts || accounts.length === 0) {
                        // 如果尚未连接，触发连接按钮
                        connectButton.click();
                    }
                    
                    // 3秒后移除提示
                    setTimeout(() => {
                        document.body.removeChild(returnNotice);
                    }, 3000);
                }, 1000);
            }
        }
    });

    // 添加这个缺失的函数 - 连接 MetaMask 浏览器扩展
    async function connectMetaMaskExtension() {
        try {
            updateStatusText('正在连接MetaMask扩展...');
            console.log('尝试连接MetaMask浏览器扩展');
            
            // 确保ethereum对象存在
            if (!window.ethereum) {
                throw new Error('未检测到MetaMask扩展');
            }
            
            // 请求用户授权
            accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            if (!accounts || accounts.length === 0) {
                throw new Error('未能获取MetaMask账户，请确保已解锁MetaMask');
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
                    updateUIForConnectedWallet();
                }
            });
            
            // 监听链变化
            window.ethereum.on('chainChanged', (chainId) => {
                console.log('链ID已更改为:', chainId);
                // 重新查询当前代币（如果有）
                if (currentTokenData) {
                    queryToken(currentTokenData.address);
                }
            });

            // 更新UI
            userAccount = accounts[0];
            updateUIForConnectedWallet();
            updateStatusText(`已连接到账户: ${formatAddress(userAccount)}`);
            
            return true;
        } catch (error) {
            console.error("MetaMask连接错误:", error);
            updateStatusText(`连接MetaMask失败: ${error.message || '未知错误'}`);
            return false;
        }
    }

    // 添加这些辅助函数，它们在代码中被调用但未定义
    function updateStatusText(text) {
        console.log("状态更新:", text);
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

    function formatAddress(address) {
        if (!address) return '';
        return address.slice(0, 6) + '...' + address.slice(-4);
    }

    function updateUIForConnectedWallet() {
        // 更新连接按钮文本
        const connectButton = document.getElementById('connect-button');
        if (connectButton) {
            connectButton.textContent = '已连接: ' + formatAddress(userAccount);
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
        userAccount = null;
        
        // 更新连接按钮文本
        const connectButton = document.getElementById('connect-button');
        if (connectButton) {
            connectButton.textContent = '连接钱包';
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
                connectButton.textContent = '已连接: ' + formatAddress(accounts[0]);
            } else {
                connectButton.textContent = '连接钱包';
            }
        }
    }

    // 修复代码中引用但未定义的resetConnection函数
    function resetConnection() {
        if (walletConnectProvider) {
            try {
                walletConnectProvider.disconnect();
            } catch (e) {
                console.error('断开WalletConnect连接时出错:', e);
            }
            walletConnectProvider = null;
        }
        
        accounts = [];
        userAccount = null;
        web3 = null;
        resetUI();
        updateStatusText('钱包已断开连接');
    }
});