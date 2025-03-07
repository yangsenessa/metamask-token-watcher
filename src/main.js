import Web3 from 'web3';

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

window.addEventListener('load', async () => {
    let web3;
    
    const connectButton = document.getElementById('connect-button');
    const tokenForm = document.getElementById('token-form');
    const tokenList = document.getElementById('token-list');
    const addTokenButton = document.getElementById('add-token');
    const tokenInfo = document.getElementById('token-info');

    let accounts = [];
    let currentTokenData = null;

    // 生成代币按钮列表
    function createTokenButtons() {
        Object.values(TOKEN_LIST).forEach(token => {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'token-button-container';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.alignItems = 'center';
            buttonContainer.style.gap = '8px';

            if (token.logoUrl) {
                const logo = document.createElement('img');
                logo.src = token.logoUrl;
                logo.style.width = '24px';
                logo.style.height = '24px';
                buttonContainer.appendChild(logo);
            }

            const button = document.createElement('button');
            button.className = 'token-button';
            button.textContent = token.name;
            button.onclick = () => queryToken(token.address);
            
            buttonContainer.appendChild(button);
            tokenList.appendChild(buttonContainer);
        });
    }

    // 查询代币信息
    async function queryToken(tokenAddress) {
        try {
            const tokenContract = new web3.eth.Contract(minABI, tokenAddress);
            
            // 获取基本信息
            const symbol = await tokenContract.methods.symbol().call();
            const decimals = await tokenContract.methods.decimals().call();
            
            // 从静态配置获取logo URL
            const tokenInfo = Object.values(TOKEN_LIST).find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
            const logoUrl = tokenInfo ? tokenInfo.logoUrl : '';

            currentTokenData = {
                address: tokenAddress,
                symbol: symbol,
                decimals: decimals,
                logoUrl: logoUrl
            };

            // 更新UI显示
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

            // 更新按钮状态
            document.querySelectorAll('.token-button').forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent === symbol) {
                    btn.classList.add('active');
                }
            });

        } catch (error) {
            console.error('查询代币时发生错误:', error);
            alert('查询代币失败，请确认地址正确');
            document.getElementById('token-info').style.display = 'none';
        }
    }

    connectButton.addEventListener('click', async () => {
        try {
            // 检查是否存在 ethereum 对象
            if (typeof window.ethereum === 'undefined') {
                alert('请先安装 MetaMask!');
                return;
            }

            // 请求用户授权
            accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // 使用 window.ethereum 作为 provider
            web3 = new Web3(window.ethereum);
            
            // 监听账户变化
            window.ethereum.on('accountsChanged', (newAccounts) => {
                accounts = newAccounts;
                if (accounts.length > 0) {
                    connectButton.textContent = '已连接: ' + accounts[0].slice(0, 6) + '...' + accounts[0].slice(-4);
                } else {
                    connectButton.textContent = '连接 MetaMask';
                    tokenForm.style.display = 'none';
                }
            });

            if (accounts.length > 0) {
                connectButton.textContent = '已连接: ' + accounts[0].slice(0, 6) + '...' + accounts[0].slice(-4);
                tokenForm.style.display = 'block';
                createTokenButtons();
            }
        } catch (error) {
            console.error(error);
            alert('连接 MetaMask 失败: ' + error.message);
        }
    });

    addTokenButton.addEventListener('click', async () => {
        if (!currentTokenData) {
            alert('请先查询代币信息');
            return;
        }

        try {
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
        } catch (error) {
            console.error('添加代币时发生错误:', error);
            alert('添加代币失败: ' + error.message);
        }
    });
});