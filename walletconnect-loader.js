/**
 * WalletConnect预加载脚本
 * 在页面加载时预先加载WalletConnectProvider，避免动态加载时的构造函数错误
 */
(function() {
    console.log('WalletConnect预加载脚本已启动');
    
    // 检查是否已经加载
    if (window.WalletConnectProvider) {
        console.log('WalletConnectProvider已存在，无需重复加载');
        return;
    }
    
    // 创建脚本元素
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@walletconnect/web3-provider@1.8.0/dist/umd/index.min.js';
    script.async = false; // 同步加载以确保在页面渲染前完成
    
    // 加载成功处理
    script.onload = function() {
        console.log('WalletConnectProvider预加载成功');
        if (window.WalletConnectProvider) {
            console.log('WalletConnectProvider全局对象已可用');
            
            // 创建一个自定义事件通知应用WalletConnect已加载
            const wcLoadedEvent = new CustomEvent('walletconnect_loaded', {
                detail: { provider: window.WalletConnectProvider }
            });
            window.dispatchEvent(wcLoadedEvent);
        } else {
            console.error('WalletConnectProvider加载成功但全局对象不可用');
        }
    };
    
    // 加载失败处理
    script.onerror = function(error) {
        console.error('WalletConnectProvider预加载失败:', error);
    };
    
    // 添加到文档
    document.head.appendChild(script);
    
    // 添加Web3预加载
    const web3Script = document.createElement('script');
    web3Script.src = 'https://cdn.jsdelivr.net/npm/web3@1.8.0/dist/web3.min.js';
    web3Script.async = false;
    
    web3Script.onload = function() {
        console.log('Web3预加载成功');
        if (window.Web3) {
            console.log('Web3全局对象已可用');
        } else {
            console.error('Web3加载成功但全局对象不可用');
        }
    };
    
    web3Script.onerror = function(error) {
        console.error('Web3预加载失败:', error);
    };
    
    document.head.appendChild(web3Script);
})(); 