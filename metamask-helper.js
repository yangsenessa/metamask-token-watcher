/**
 * MetaMask助手工具
 * 提供MetaMask相关功能，包括检测网络、添加代币和验证结果
 */

// 检测用户当前网络
async function detectCurrentNetwork() {
    try {
        if (!window.ethereum) {
            console.warn('未检测到MetaMask');
            return null;
        }

        // 获取当前链ID
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log('当前链ID:', chainId);
        
        // 常见网络
        const networks = {
            '0x1': { name: 'Ethereum Mainnet', symbol: 'ETH', explorer: 'https://etherscan.io' },
            '0x3': { name: 'Ropsten Testnet', symbol: 'ETH', explorer: 'https://ropsten.etherscan.io' },
            '0x4': { name: 'Rinkeby Testnet', symbol: 'ETH', explorer: 'https://rinkeby.etherscan.io' },
            '0x5': { name: 'Goerli Testnet', symbol: 'ETH', explorer: 'https://goerli.etherscan.io' },
            '0x38': { name: 'Binance Smart Chain', symbol: 'BNB', explorer: 'https://bscscan.com' },
            '0x89': { name: 'Polygon Mainnet', symbol: 'MATIC', explorer: 'https://polygonscan.com' },
            '0xa86a': { name: 'Avalanche C-Chain', symbol: 'AVAX', explorer: 'https://snowtrace.io' }
        };

        return networks[chainId] || { name: '未知网络', chainId };
    } catch (error) {
        console.error('检测网络时出错:', error);
        return null;
    }
}

// 检测代币是否已添加到MetaMask
async function checkIfTokenExists(tokenAddress) {
    try {
        if (!window.ethereum) {
            return false;
        }

        // 获取当前账户
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) {
            console.warn('未连接到MetaMask账户');
            return false;
        }

        // 检查代币是否已添加（这是一个间接方法，MetaMask API不直接支持此功能）
        const account = accounts[0];
        const tokenAddresses = await window.ethereum.request({
            method: 'eth_call',
            params: [{
                to: tokenAddress,
                data: `0x70a08231000000000000000000000000${account.slice(2)}`  // balanceOf
            }, 'latest']
        }).catch(() => null);

        // 如果调用成功，代币可能存在
        return tokenAddresses !== null;
    } catch (error) {
        console.error('检查代币是否存在时出错:', error);
        return false;
    }
}

// 增强型添加代币函数
async function enhancedAddToken(tokenData) {
    try {
        if (!window.ethereum) {
            throw new Error('未检测到MetaMask');
        }

        console.log('正在添加代币:', tokenData);

        // 标准化代币参数
        const tokenParams = {
            type: 'ERC20',
            options: {
                address: tokenData.address,
                symbol: tokenData.symbol,
                decimals: parseInt(tokenData.decimals),
                image: tokenData.logoUrl
            }
        };

        // 获取当前网络
        const network = await detectCurrentNetwork();
        console.log('当前网络:', network);

        // 使用wallet_watchAsset方法添加代币
        const wasAdded = await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: tokenParams
        });

        if (wasAdded) {
            console.log('代币添加成功!');
            
            // 尝试验证代币是否真的添加了
            setTimeout(async () => {
                const exists = await checkIfTokenExists(tokenData.address);
                console.log('代币验证结果:', exists ? '已添加' : '未找到');
            }, 2000);
            
            return true;
        } else {
            console.log('用户拒绝添加代币');
            return false;
        }
    } catch (error) {
        console.error('添加代币失败:', error);
        throw error;
    }
}

// 监听网络变化
function watchNetworkChanges(callback) {
    if (!window.ethereum) {
        console.warn('未检测到MetaMask，无法监听网络变化');
        return false;
    }
    
    window.ethereum.on('chainChanged', (chainId) => {
        console.log('网络已变更:', chainId);
        if (typeof callback === 'function') {
            callback(chainId);
        }
    });
    
    return true;
}

// 导出功能
window.MetaMaskHelper = {
    detectCurrentNetwork,
    checkIfTokenExists,
    enhancedAddToken,
    watchNetworkChanges
}; 