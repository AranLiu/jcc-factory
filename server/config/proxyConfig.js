const url = require('url');

class ProxyConfig {
    constructor() {
        this.httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
        this.httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
        this.socksProxy = process.env.SOCKS_PROXY || process.env.socks_proxy;
        this.noProxy = process.env.NO_PROXY || process.env.no_proxy || 'localhost,127.0.0.1';
        this.forceProxy = process.env.FORCE_PROXY === 'true';
        
        console.log('🔗 代理配置初始化:');
        console.log('  HTTP代理:', this.httpProxy || '未配置');
        console.log('  HTTPS代理:', this.httpsProxy || '未配置');
        console.log('  SOCKS代理:', this.socksProxy || '未配置');
        console.log('  强制代理:', this.forceProxy);
    }

    /**
     * 检查是否需要使用代理
     */
    shouldUseProxy() {
        return !!(this.httpProxy || this.httpsProxy || this.socksProxy);
    }

    /**
     * 获取适用于Python环境的代理配置
     */
    getPythonProxyEnv() {
        const env = {};
        
        if (this.httpProxy) {
            env.HTTP_PROXY = this.httpProxy;
            env.http_proxy = this.httpProxy;
        }
        
        if (this.httpsProxy) {
            env.HTTPS_PROXY = this.httpsProxy;
            env.https_proxy = this.httpsProxy;
        }
        
        if (this.socksProxy) {
            env.SOCKS_PROXY = this.socksProxy;
            env.socks_proxy = this.socksProxy;
        }
        
        if (this.noProxy) {
            env.NO_PROXY = this.noProxy;
            env.no_proxy = this.noProxy;
        }
        
        return env;
    }

    /**
     * 获取Node.js HTTP客户端使用的代理配置
     */
    getNodeProxyConfig() {
        if (!this.shouldUseProxy()) {
            return null;
        }

        // 优先使用HTTPS代理，然后是HTTP代理
        const proxyUrl = this.httpsProxy || this.httpProxy;
        
        if (proxyUrl) {
            const parsed = url.parse(proxyUrl);
            return {
                host: parsed.hostname,
                port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
                protocol: parsed.protocol,
                auth: parsed.auth
            };
        }

        return null;
    }

    /**
     * 检查URL是否在NO_PROXY列表中
     */
    isNoProxy(targetUrl) {
        if (!this.noProxy) return false;
        
        const noProxyList = this.noProxy.split(',').map(item => item.trim());
        const parsed = url.parse(targetUrl);
        const hostname = parsed.hostname;
        
        return noProxyList.some(pattern => {
            if (pattern === '*') return true;
            if (pattern === hostname) return true;
            if (pattern.startsWith('.') && hostname.endsWith(pattern)) return true;
            return false;
        });
    }

    /**
     * 获取代理状态信息
     */
    getStatus() {
        return {
            enabled: this.shouldUseProxy(),
            httpProxy: this.httpProxy,
            httpsProxy: this.httpsProxy,
            socksProxy: this.socksProxy,
            noProxy: this.noProxy,
            forceProxy: this.forceProxy
        };
    }
}

module.exports = new ProxyConfig(); 