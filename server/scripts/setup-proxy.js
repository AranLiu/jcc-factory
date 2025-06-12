#!/usr/bin/env node
/**
 * 代理配置向导
 * 帮助用户快速配置代理服务器设置
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

class ProxySetupWizard {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.envPath = path.join(__dirname, '../.env');
        this.envExamplePath = path.join(__dirname, '../env.example');
    }

    async question(text) {
        return new Promise((resolve) => {
            this.rl.question(text, resolve);
        });
    }

    async runWizard() {
        console.log('🚀 欢迎使用代理配置向导！');
        console.log('='.repeat(50));
        console.log('这个向导将帮助您为JCC Factory项目配置代理服务器。');
        console.log('主要用途：解决在受限地区无法访问Google Gemini API的问题。\n');

        // 检查是否需要代理
        console.log('❓ 请选择您的部署环境：');
        console.log('1. 中国大陆地区（通常需要代理）');
        console.log('2. 其他地区（一般不需要代理）');
        console.log('3. 不确定（将测试连接性）\n');

        const regionChoice = await this.question('请输入选项 (1-3): ');

        let needsProxy = false;
        
        switch (regionChoice.trim()) {
            case '1':
                needsProxy = true;
                console.log('\n✅ 中国大陆地区确实需要代理才能访问Google服务。');
                break;
            case '2':
                console.log('\n✅ 其他地区通常可以直接访问，但您仍可以配置代理作为备选。');
                break;
            case '3':
                console.log('\n🔍 将在稍后进行连接测试...');
                break;
            default:
                console.log('\n⚠️ 无效选择，默认为需要代理配置。');
                needsProxy = true;
        }

        // 询问是否配置代理
        const shouldSetupProxy = await this.question('\n是否要配置代理服务器？(y/n): ');
        
        if (!shouldSetupProxy.toLowerCase().startsWith('y')) {
            console.log('\n✅ 跳过代理配置。如果后续连接失败，可以重新运行此向导。');
            this.rl.close();
            return;
        }

        console.log('\n📝 开始配置代理信息...\n');

        // 收集代理信息
        const proxyInfo = await this.collectProxyInfo();
        
        // 创建或更新.env文件
        await this.updateEnvFile(proxyInfo);
        
        // 测试代理连接
        console.log('\n🔧 配置完成！现在测试代理连接...\n');
        await this.testProxyConnection();
        
        this.rl.close();
    }

    async collectProxyInfo() {
        const proxyInfo = {};

        console.log('🔗 代理服务器信息配置：\n');

        // HTTP代理地址
        const httpProxy = await this.question('HTTP代理地址 (格式: http://host:port): ');
        if (httpProxy.trim()) {
            proxyInfo.HTTP_PROXY = httpProxy.trim();
        }

        // HTTPS代理地址
        const httpsProxy = await this.question('HTTPS代理地址 (回车使用HTTP代理): ');
        proxyInfo.HTTPS_PROXY = httpsProxy.trim() || proxyInfo.HTTP_PROXY;

        // 询问是否需要认证
        const needAuth = await this.question('代理是否需要用户名密码认证？(y/n): ');
        
        if (needAuth.toLowerCase().startsWith('y')) {
            const username = await this.question('用户名: ');
            const password = await this.question('密码: ');
            
            if (username && password) {
                // 更新代理URL包含认证信息
                if (proxyInfo.HTTP_PROXY) {
                    const url = new URL(proxyInfo.HTTP_PROXY);
                    url.username = username;
                    url.password = password;
                    proxyInfo.HTTP_PROXY = url.toString();
                }
                
                if (proxyInfo.HTTPS_PROXY) {
                    const url = new URL(proxyInfo.HTTPS_PROXY);
                    url.username = username;
                    url.password = password;
                    proxyInfo.HTTPS_PROXY = url.toString();
                }
            }
        }

        // 其他配置
        const noProxy = await this.question('不使用代理的地址 (默认: localhost,127.0.0.1): ');
        proxyInfo.NO_PROXY = noProxy.trim() || 'localhost,127.0.0.1';

        const forceProxy = await this.question('强制使用代理？(y/n): ');
        proxyInfo.FORCE_PROXY = forceProxy.toLowerCase().startsWith('y') ? 'true' : 'false';

        const enableDebug = await this.question('启用调试模式？(y/n): ');
        proxyInfo.GEMINI_DEBUG = enableDebug.toLowerCase().startsWith('y') ? 'true' : 'false';

        console.log('\n📋 代理配置总结：');
        console.log('-'.repeat(30));
        Object.entries(proxyInfo).forEach(([key, value]) => {
            // 隐藏密码信息
            const displayValue = key.includes('PROXY') && value.includes('@') 
                ? value.replace(/:([^:@]+)@/, ':****@')
                : value;
            console.log(`${key}: ${displayValue}`);
        });

        const confirm = await this.question('\n确认配置正确？(y/n): ');
        
        if (!confirm.toLowerCase().startsWith('y')) {
            console.log('❌ 配置已取消。');
            process.exit(0);
        }

        return proxyInfo;
    }

    async updateEnvFile(proxyInfo) {
        try {
            // 读取现有的.env文件或创建新的
            let envContent = '';
            
            if (fs.existsSync(this.envPath)) {
                envContent = fs.readFileSync(this.envPath, 'utf8');
                console.log('📄 更新现有的.env文件...');
            } else if (fs.existsSync(this.envExamplePath)) {
                envContent = fs.readFileSync(this.envExamplePath, 'utf8');
                console.log('📄 基于env.example创建.env文件...');
            } else {
                console.log('📄 创建新的.env文件...');
            }

            // 更新或添加代理配置
            const lines = envContent.split('\n');
            const updatedLines = [];
            const processedKeys = new Set();

            // 处理现有行
            for (const line of lines) {
                if (line.includes('=') && !line.startsWith('#')) {
                    const [key] = line.split('=');
                    if (key in proxyInfo) {
                        updatedLines.push(`${key}=${proxyInfo[key]}`);
                        processedKeys.add(key);
                    } else {
                        updatedLines.push(line);
                    }
                } else {
                    updatedLines.push(line);
                }
            }

            // 添加新的代理配置
            Object.entries(proxyInfo).forEach(([key, value]) => {
                if (!processedKeys.has(key)) {
                    updatedLines.push(`${key}=${value}`);
                }
            });

            // 写入文件
            const finalContent = updatedLines.join('\n');
            fs.writeFileSync(this.envPath, finalContent, 'utf8');
            
            console.log('✅ 代理配置已保存到.env文件');

        } catch (error) {
            console.error('❌ 更新.env文件失败:', error.message);
            throw error;
        }
    }

    async testProxyConnection() {
        try {
            const { spawn } = require('child_process');
            const testScriptPath = path.join(__dirname, '../test-proxy-connection.js');
            
            console.log('🧪 运行代理连接测试...\n');
            
            const testProcess = spawn('node', [testScriptPath], {
                stdio: 'inherit',
                cwd: path.dirname(testScriptPath)
            });
            
            return new Promise((resolve) => {
                testProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log('\n🎉 代理配置测试通过！您的项目现在可以正常访问Gemini API了。');
                    } else {
                        console.log('\n⚠️ 代理测试失败。请检查代理配置或网络连接。');
                        console.log('您可以手动运行以下命令进行测试：');
                        console.log(`node ${testScriptPath}`);
                    }
                    resolve(code === 0);
                });
            });
            
        } catch (error) {
            console.error('❌ 测试代理连接时出错:', error.message);
            return false;
        }
    }
}

// 主函数
async function main() {
    const wizard = new ProxySetupWizard();
    
    try {
        await wizard.runWizard();
    } catch (error) {
        console.error('❌ 配置过程中出错:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = ProxySetupWizard; 