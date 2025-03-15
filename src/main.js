import Web3 from 'web3';
import WalletConnectProvider from '@walletconnect/web3-provider';

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

window.addEventListener('load', async () => {
    let web3;
    let provider;
    
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

    // 初始化WalletConnect提供者
    async function initWalletConnect() {
        showLoader();
        
        try {
            walletConnectProvider = new WalletConnectProvider({
                // 注意：您需要在 https://infura.io/ 注册并获取自己的 Infura ID
                infuraId: "665addcac8d2479c86602a534812aa5f", 
                qrcode: true,
                rpc: {
                    1: "https://mainnet.infura.io/v3/665addcac8d2479c86602a534812aa5f"
                    // 添加您需要支持的其他区块链
                }
            });
            
            // 启用会话（弹出二维码）
            await walletConnectProvider.enable();
            
            // 获取 Web3 实例
            web3 = new Web3(walletConnectProvider);
            
            // 获取账户
            accounts = await web3.eth.getAccounts();
            
            if (!accounts || accounts.length === 0) {
                throw new Error('未能获取钱包账户，请重试');
            }
            
            // 设置监听器
            walletConnectProvider.on("accountsChanged", (newAccounts) => {
                accounts = newAccounts;
                updateConnectButtonText();
            });
            
            walletConnectProvider.on("disconnect", () => {
                accounts = [];
                connectButton.textContent = '连接钱包';
                tokenForm.style.display = 'none';
                resetConnection();
            });
            
            walletConnectProvider.on("chainChanged", (chainId) => {
                console.log('链ID已更改为:', chainId);
                // 重新查询当前代币（如果有）
                if (currentTokenData) {
                    queryToken(currentTokenData.address);
                }
            });
            
            updateConnectButtonText();
            tokenForm.style.display = 'block';
            createTokenButtons();
            
            hideLoader();
            return true;
        } catch (error) {
            console.error("WalletConnect连接错误:", error);
            alert("WalletConnect连接失败: " + (error.message || '未知错误'));
            hideLoader();
            
            // 确保清理资源
            if (walletConnectProvider) {
                try {
                    walletConnectProvider.disconnect();
                } catch (e) {
                    console.error('断开WalletConnect连接时出错:', e);
                }
                walletConnectProvider = null;
            }
            
            return false;
        }
    }

    // 连接 MetaMask 浏览器扩展
    async function connectMetaMaskExtension() {
        showLoader();
        
        try {
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
                    tokenForm.style.display = 'none';
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

            updateConnectButtonText();
            tokenForm.style.display = 'block';
            createTokenButtons();
            
            hideLoader();
            return true;
        } catch (error) {
            console.error("MetaMask连接错误:", error);
            alert('连接 MetaMask 失败: ' + (error.message || '未知错误'));
            hideLoader();
            return false;
        }
    }

    // 更新连接按钮文本
    function updateConnectButtonText() {
        if (accounts.length > 0) {
            connectButton.textContent = '已连接: ' + accounts[0].slice(0, 6) + '...' + accounts[0].slice(-4);
        } else {
            connectButton.textContent = '连接钱包';
        }
    }

    // 重置连接状态
    function resetConnection() {
        if (walletConnectProvider) {
            walletConnectProvider.disconnect();
            walletConnectProvider = null;
        }
        
        web3 = null;
        accounts = [];
        updateConnectButtonText();
        tokenList.innerHTML = '';
        document.getElementById('token-info').style.display = 'none';
        hideLoader();
    }

    // 处理MetaMask移动端深度链接
    function openMetaMaskMobile() {
        showLoader();
        
        // 创建当前页面的URL（用于回调）
        const currentUrl = encodeURIComponent(window.location.href);
        // MetaMask移动应用深度链接
        const metamaskDeepLink = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
        
        // 显示指导提示
        alert('即将跳转到MetaMask应用，请在完成操作后返回此页面');
        
        // 重定向到MetaMask
        window.location.href = metamaskDeepLink;
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
                // 创建一个简单的选择UI
                const mobileConnectOptions = document.createElement('div');
                mobileConnectOptions.style.position = 'fixed';
                mobileConnectOptions.style.top = '0';
                mobileConnectOptions.style.left = '0';
                mobileConnectOptions.style.width = '100%';
                mobileConnectOptions.style.height = '100%';
                mobileConnectOptions.style.backgroundColor = 'rgba(0,0,0,0.8)';
                mobileConnectOptions.style.display = 'flex';
                mobileConnectOptions.style.flexDirection = 'column';
                mobileConnectOptions.style.justifyContent = 'center';
                mobileConnectOptions.style.alignItems = 'center';
                mobileConnectOptions.style.zIndex = '999';
                
                const optionsContainer = document.createElement('div');
                optionsContainer.style.backgroundColor = 'white';
                optionsContainer.style.padding = '20px';
                optionsContainer.style.borderRadius = '10px';
                optionsContainer.style.maxWidth = '80%';
                optionsContainer.style.textAlign = 'center';
                
                const title = document.createElement('h3');
                title.textContent = '选择连接方式';
                
                const metamaskButton = document.createElement('button');
                metamaskButton.textContent = 'MetaMask应用';
                metamaskButton.style.display = 'block';
                metamaskButton.style.width = '100%';
                metamaskButton.style.margin = '10px 0';
                metamaskButton.style.padding = '10px';
                
                const walletConnectButton = document.createElement('button');
                walletConnectButton.textContent = 'WalletConnect';
                walletConnectButton.style.display = 'block';
                walletConnectButton.style.width = '100%';
                walletConnectButton.style.margin = '10px 0';
                walletConnectButton.style.padding = '10px';
                
                const cancelButton = document.createElement('button');
                cancelButton.textContent = '取消';
                cancelButton.style.display = 'block';
                cancelButton.style.width = '100%';
                cancelButton.style.margin = '10px 0';
                cancelButton.style.padding = '10px';
                
                optionsContainer.appendChild(title);
                optionsContainer.appendChild(metamaskButton);
                optionsContainer.appendChild(walletConnectButton);
                optionsContainer.appendChild(cancelButton);
                mobileConnectOptions.appendChild(optionsContainer);
                document.body.appendChild(mobileConnectOptions);
                
                // 事件处理
                metamaskButton.addEventListener('click', () => {
                    document.body.removeChild(mobileConnectOptions);
                    openMetaMaskMobile();
                });
                
                walletConnectButton.addEventListener('click', async () => {
                    document.body.removeChild(mobileConnectOptions);
                    await initWalletConnect();
                });
                
                cancelButton.addEventListener('click', () => {
                    document.body.removeChild(mobileConnectOptions);
                });
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

    addTokenButton.addEventListener('click', async () => {
        if (!currentTokenData) {
            alert('请先查询代币信息');
            return;
        }

        try {
            showLoader();
            
            // 确保web3已初始化
            if (!web3) {
                throw new Error('Web3未初始化，请先连接钱包');
            }
            
            // 检测连接类型，并使用相应的方法添加代币
            if (window.ethereum && web3.currentProvider === window.ethereum) {
                // 使用MetaMask浏览器扩展
                const wasAdded = await window.ethereum.request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: 'ERC20',
                        options: {
                            address: currentTokenData.address,
                            symbol: currentTokenData.symbol,
                            decimals: parseInt(currentTokenData.decimals),
                            image: currentTokenData.logoUrl || undefined
                        },
                    },
                });

                if (wasAdded) {
                    alert('代币添加成功！');
                } else {
                    alert('代币添加被取消');
                }
            } else if (isMobile() && !walletConnectProvider) {
                // 移动设备上使用深度链接
                const tokenParams = new URLSearchParams({
                    address: currentTokenData.address,
                    symbol: currentTokenData.symbol,
                    decimals: currentTokenData.decimals,
                    image: currentTokenData.logoUrl || ''
                });
                
                // 显示指导提示
                alert('即将跳转到MetaMask应用添加代币，请在完成操作后返回此页面');
                
                // 构建MetaMask深度链接添加代币的URL
                const metamaskAddTokenUrl = `https://metamask.app.link/add-token?${tokenParams.toString()}`;
                window.location.href = metamaskAddTokenUrl;
            } else if (walletConnectProvider) {
                // 使用WalletConnect
                // WalletConnect目前没有标准化的添加代币方法
                // 一些钱包可能支持wallet_watchAsset方法
                try {
                    const wasAdded = await walletConnectProvider.request({
                        method: 'wallet_watchAsset',
                        params: {
                            type: 'ERC20',
                            options: {
                                address: currentTokenData.address,
                                symbol: currentTokenData.symbol,
                                decimals: parseInt(currentTokenData.decimals),
                                image: currentTokenData.logoUrl || undefined
                            },
                        },
                    });
                    
                    if (wasAdded) {
                        alert('代币添加成功！');
                    } else {
                        alert('代币添加被取消');
                    }
                } catch (error) {
                    // 如果不支持wallet_watchAsset方法，显示手动添加信息
                    console.error('WalletConnect添加代币错误:', error);
                    alert(`您的钱包不支持自动添加代币。请手动添加以下信息：\n地址: ${currentTokenData.address}\n符号: ${currentTokenData.symbol}\n小数位: ${currentTokenData.decimals}`);
                }
            } else {
                throw new Error('未检测到支持的钱包连接');
            }
            
            hideLoader();
        } catch (error) {
            console.error('添加代币时发生错误:', error);
            alert('添加代币失败: ' + error.message);
            hideLoader();
        }
    });
    
    // 检测URL参数，支持从MetaMask应用返回后恢复状态
    window.addEventListener('DOMContentLoaded', () => {
        // 检查是否有返回标记
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('metamask_return')) {
            // 尝试重新连接
            if (isMobile()) {
                setTimeout(() => {
                    connectButton.click();
                }, 1000);
            }
        }
    });
});