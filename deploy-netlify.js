#!/usr/bin/env node
/**
 * Netlify部署脚本
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class NetlifyDeployer {
    constructor() {
        this.projectRoot = process.cwd();
        this.netlifyDir = path.join(this.projectRoot, 'netlify');
        this.functionsDir = path.join(this.netlifyDir, 'functions');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = {
            info: '📝',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        }[type] || '📝';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    checkPrerequisites() {
        this.log('检查部署前提条件...');
        
        // 检查Netlify CLI
        try {
            execSync('netlify --version', { stdio: 'pipe' });
            this.log('Netlify CLI 已安装', 'success');
        } catch (error) {
            this.log('Netlify CLI 未安装，请运行: npm install -g netlify-cli', 'error');
            return false;
        }

        // 检查文件结构
        if (!fs.existsSync(this.netlifyDir)) {
            this.log('netlify目录不存在', 'error');
            return false;
        }

        if (!fs.existsSync(this.functionsDir)) {
            this.log('netlify/functions目录不存在', 'error');
            return false;
        }

        if (!fs.existsSync(path.join(this.functionsDir, 'v1.mjs'))) {
            this.log('v1.mjs函数文件不存在', 'error');
            return false;
        }

        if (!fs.existsSync(path.join(this.projectRoot, 'netlify.toml'))) {
            this.log('netlify.toml配置文件不存在', 'error');
            return false;
        }

        this.log('所有前提条件检查通过', 'success');
        return true;
    }

    installDependencies() {
        this.log('安装Netlify函数依赖...');
        
        try {
            process.chdir(this.functionsDir);
            execSync('npm install', { stdio: 'inherit' });
            this.log('依赖安装完成', 'success');
            process.chdir(this.projectRoot);
            return true;
        } catch (error) {
            this.log(`依赖安装失败: ${error.message}`, 'error');
            process.chdir(this.projectRoot);
            return false;
        }
    }

    checkNetlifyAuth() {
        this.log('检查Netlify认证状态...');
        
        try {
            const result = execSync('netlify status', { encoding: 'utf8' });
            if (result.includes('Not logged in')) {
                this.log('未登录Netlify，请运行: netlify login', 'warning');
                return false;
            }
            this.log('Netlify认证正常', 'success');
            return true;
        } catch (error) {
            this.log('请先登录Netlify: netlify login', 'warning');
            return false;
        }
    }

    deployToNetlify() {
        this.log('开始部署到Netlify...');
        
        try {
            // 首先尝试链接到现有站点
            try {
                execSync('netlify link', { stdio: 'inherit' });
            } catch (error) {
                this.log('链接站点失败，将创建新站点', 'warning');
            }

            // 部署
            const deployResult = execSync('netlify deploy --prod', { encoding: 'utf8' });
            
            // 提取部署URL
            const urlMatch = deployResult.match(/Website URL:\s*(https?:\/\/[^\s]+)/);
            if (urlMatch) {
                const deployUrl = urlMatch[1];
                this.log(`部署成功！站点URL: ${deployUrl}`, 'success');
                return deployUrl;
            } else {
                this.log('部署完成，但无法提取URL', 'warning');
                return true;
            }
            
        } catch (error) {
            this.log(`部署失败: ${error.message}`, 'error');
            return false;
        }
    }

    testDeployment(siteUrl) {
        if (!siteUrl || typeof siteUrl !== 'string') {
            this.log('跳过部署测试（无有效URL）', 'warning');
            return;
        }

        this.log('测试部署的函数...');
        
        const https = require('https');
        
        return new Promise((resolve) => {
            const testUrl = `${siteUrl}/.netlify/functions/v1/models`;
            
            https.get(testUrl, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        this.log('函数测试成功！', 'success');
                        resolve(true);
                    } else {
                        this.log(`函数测试失败，状态码: ${res.statusCode}`, 'error');
                        resolve(false);
                    }
                });
            }).on('error', (error) => {
                this.log(`函数测试失败: ${error.message}`, 'error');
                resolve(false);
            });
        });
    }

    async deploy() {
        this.log('🚀 开始Netlify部署流程');
        this.log('=' * 50);

        // 检查前提条件
        if (!this.checkPrerequisites()) {
            this.log('前提条件检查失败，部署终止', 'error');
            return false;
        }

        // 安装依赖
        if (!this.installDependencies()) {
            this.log('依赖安装失败，部署终止', 'error');
            return false;
        }

        // 检查认证
        if (!this.checkNetlifyAuth()) {
            this.log('请先完成Netlify认证', 'error');
            return false;
        }

        // 部署
        const deployResult = this.deployToNetlify();
        if (!deployResult) {
            this.log('部署失败', 'error');
            return false;
        }

        // 测试部署
        if (typeof deployResult === 'string') {
            await this.testDeployment(deployResult);
        }

        this.log('🎉 部署流程完成！', 'success');
        return true;
    }

    showInstructions() {
        console.log(`
📋 Netlify部署说明：

1. 安装Netlify CLI（如果未安装）：
   npm install -g netlify-cli

2. 登录Netlify：
   netlify login

3. 运行此脚本：
   node deploy-netlify.js

4. 设置环境变量：
   在Netlify后台设置 GEMINI_API_KEY 环境变量

5. 测试部署：
   访问 https://your-site.netlify.app/.netlify/functions/v1/models

🔧 手动部署步骤：
   netlify init     # 初始化项目
   netlify deploy   # 预览部署
   netlify deploy --prod  # 生产部署

📝 注意事项：
   - 确保netlify.toml配置正确
   - 确保函数依赖已安装
   - 在Netlify后台设置环境变量
        `);
    }
}

// 运行部署
async function main() {
    const deployer = new NetlifyDeployer();
    
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        deployer.showInstructions();
        return;
    }

    if (args.includes('--instructions')) {
        deployer.showInstructions();
        return;
    }

    try {
        await deployer.deploy();
    } catch (error) {
        console.error('💥 部署过程中发生错误:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = NetlifyDeployer; 