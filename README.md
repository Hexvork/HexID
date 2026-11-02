# HexID Analytics

供接入 HexID 访问统计的网站加载的轻量 JavaScript。这里只发布公开客户端；账户、订阅、网站配置、采集与统计数据库继续由 HexID 后端提供。

## 安装

在 HexID 中添加你的网站，替换下方的 `YOUR_WEBSITE_ID` 为生成的 48 位网站 ID，并将脚本放进网站的 `<head>`：

```html
<script defer
  src="https://cdn.jsdmirror.com/gh/Hexvork/HexID@main/tracker.js"
  data-website-id="YOUR_WEBSITE_ID"
  data-collect-url="https://api.hexvork.com/api/services/analytics/collect"></script>
```

生产使用时，将 `@main` 换为经过验证的完整 Git 提交号以固定版本，避免分支缓存影响升级。GitHub 仓库必须公开后，公共 CDN 才能下载文件；私有仓库地址不能直接用于公共 CDN。

`data-collect-url` 指定采集后端的完整 URL。CDN 只分发文件，不接收访问数据。若需要自己的 HexID 后端，替换这个地址并确认后端允许登记网站的来源。原有从后端 `/api/services/tracker.js` 加载的安装代码仍可用；省略该属性时使用脚本同目录下的 `analytics/collect`。

网站 ID 是公开标识，不是登录凭据。不要把 API 密钥、管理员令牌或私有凭据放入 HTML。HTTPS 网站必须使用 HTTPS 采集地址。

## 页面计数

可选地添加这些元素，采集成功后会显示后台返回的计数；已有的卜算子计数元素也可兼容：

```html
访问量 <span data-hex-site-pv>—</span>
访客数 <span data-hex-site-uv>—</span>
本页访问 <span data-hex-page-pv>—</span>
```

脚本支持 History API 导航；同一页面重复安装相同网站 ID 不会重复上报。不会使用 Cookie，请求不携带凭据；采集页面 URL 去除查询参数与片段，来源只保留 origin。浏览器启用 Do Not Track 或 Global Privacy Control 时不采集。会话标识保存在当前网站的 sessionStorage，闲置 30 分钟后更新。采集端收到网络连接时仍会接触 IP，原始 IP 是否保存由后端实现决定。

## 验证

需要 Node.js，测试不需要安装额外依赖：

```sh
node --check tracker.js
node --test tracker.test.mjs
```
