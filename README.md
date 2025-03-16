
一个轻量级的Web应用，用于查询ERC20代币信息并轻松添加到MetaMask钱包。支持PC端扩展和移动端应用，以及多种连接方式。

## 功能特性

- 自动检测设备类型，提供最佳连接体验
- 多种钱包连接方式：MetaMask扩展、深度链接、WalletConnect
- 查询ERC20代币信息（符号、小数位、余额）
- 一键添加代币到MetaMask钱包
- 支持多种添加代币方式，确保不同环境下均可使用

## 支持环境

- PC端浏览器 + MetaMask扩展
- 移动端浏览器 + MetaMask应用
- MetaMask内置浏览器
- 任何支持WalletConnect的环境

## 代码逻辑简介

### 核心模块

1. **钱包连接模块**
   - 自动检测设备类型实现最佳连接方式选择
   - 支持MetaMask扩展、深度链接和WalletConnect协议
   - 实现完整的连接状态管理和事件监听

2. **代币查询模块**
   - 使用最小化ABI查询ERC20代币信息
   - 支持预定义代币列表和自定义代币查询
   - 优化错误处理和状态反馈

3. **代币添加模块**
   - 多种添加方式：API调用、深度链接、手动添加指导
   - 针对移动设备优化的多种备选方案
   - 针对MetaMask内置浏览器的特殊处理

## 开发说明

### 安装依赖

```bash
# 克隆代码库后执行
npm install
```

### 开发环境

```bash
npm run dev
```

### 生产环境构建

```bash
npm run build
```

## 部署说明

1. 执行构建命令生成静态文件
   ```bash
   npm run build
   ```

2. 将`dist`目录下的文件部署到Web服务器

3. 确保服务器支持HTTPS（MetaMask和WalletConnect要求安全连接）

## 报错排查建议

### 常见问题和解决方案

1. **WalletConnect连接失败**
   - 错误: `WalletConnectProvider is not a constructor`
   - 解决方案: 
     - 检查浏览器控制台中WalletConnect库加载日志
     - 清除浏览器缓存并重试
     - 尝试使用其他连接方式

2. **MetaMask移动端连接问题**
   - 症状: 跳转到MetaMask应用但未出现授权提示
   - 解决方案: 
     - 尝试不同的深度链接方式（推荐方式1）
     - 确认MetaMask应用为最新版本
     - 检查URL是否完整传递

3. **代币添加失败**
   - 排查步骤:
     - 确认当前网络与代币合约匹配
     - 查看控制台日志中的详细错误信息
     - 在MetaMask内置浏览器中使用手动添加方式

4. **MetaMask内置浏览器中的特殊问题**
   - 特殊限制: MetaMask内置浏览器有独特的安全限制
   - 解决方案:
     - 使用手动添加方式（方法3）
     - 不要在内置浏览器中使用深度链接
     - 关注控制台是否有权限被拒绝的日志

### 日志排查要点

关键日志点及正常输出示例:

```
// 钱包连接成功日志
WalletConnectProvider已加载: [object Object]
WalletConnect提供商已创建: [object Object]
WalletConnect会话已启用
已连接到账户: 0x1234...abcd

// 代币查询成功日志
开始查询代币信息: 0x123...
代币符号: XXX
代币小数位: 18
代币查询完成: {address, symbol, decimals, logoUrl}

// 代币添加参数日志
代币添加参数: {type, options}
```

## 自定义配置

### 添加自定义代币

修改`main.js`中的`TOKEN_LIST`对象:

```javascript
const TOKEN_LIST = {
    'TOKEN_KEY': {
        name: '代币名称',
        address: '代币合约地址',
        logoUrl: '代币logo图片URL'
    },
    // 添加更多代币...
};
```

### 多链支持

在WalletConnect配置中添加RPC端点:

```javascript
rpc: {
    1: "https://mainnet.infura.io/v3/YOUR_INFURA_ID",
    56: "https://bsc-dataseed.binance.org/",
    137: "https://polygon-rpc.com",
    // 添加更多网络...
}
```

## 安全建议

1. 使用公共Infura ID仅供测试，生产环境请使用自己的API密钥
2. 避免将敏感信息硬编码到JavaScript中
3. 使用HTTPS协议部署应用，确保通信安全
4. 定期更新依赖库，特别是Web3和WalletConnect相关依赖

## 优化方向

1. **移动端体验优化**
   - 改进深度链接的跳转成功率
   - 简化UI提高移动端操作体验
   - 增强回调处理机制

2. **性能优化**
   - 实现错误重试机制
   - 添加缓存改善查询性能
   - 减小前端资源体积

3. **功能拓展**
   - 支持更多ERC标准代币(ERC721/ERC1155等)
   - 增加批量添加代币功能
   - 提供更丰富的代币信息展示

---

欢迎贡献代码或提交问题反馈！
