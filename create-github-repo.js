const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function main() {
    console.log('🚀 GitHub 仓库创建助手\n');
    
    try {
        // 获取用户信息
        const username = await askQuestion('请输入您的 GitHub 用户名: ');
        const repoName = await askQuestion('请输入仓库名称 (默认: jcc-factory): ') || 'jcc-factory';
        const isPrivate = await askQuestion('是否创建私有仓库? (y/N): ');
        
        console.log('\n📋 配置信息:');
        console.log(`   GitHub 用户名: ${username}`);
        console.log(`   仓库名称: ${repoName}`);
        console.log(`   仓库类型: ${isPrivate.toLowerCase() === 'y' ? '私有' : '公开'}`);
        
        const confirm = await askQuestion('\n确认创建? (Y/n): ');
        if (confirm.toLowerCase() === 'n') {
            console.log('❌ 操作已取消');
            rl.close();
            return;
        }
        
        console.log('\n🔧 正在配置 Git...');
        
        // 检查 Git 配置
        try {
            const gitUser = execSync('git config user.name', { encoding: 'utf8' }).trim();
            const gitEmail = execSync('git config user.email', { encoding: 'utf8' }).trim();
            console.log(`   Git 用户: ${gitUser} <${gitEmail}>`);
        } catch (error) {
            console.log('⚠️  Git 用户信息未配置，请先配置:');
            console.log('   git config --global user.name "Your Name"');
            console.log('   git config --global user.email "your.email@example.com"');
            rl.close();
            return;
        }
        
        // 设置远程仓库
        const repoUrl = `https://github.com/${username}/${repoName}.git`;
        
        console.log('\n🔗 配置远程仓库...');
        try {
            // 移除现有的 origin（如果存在）
            try {
                execSync('git remote remove origin', { stdio: 'ignore' });
            } catch (e) {
                // 忽略错误，可能没有 origin
            }
            
            // 添加新的 origin
            execSync(`git remote add origin ${repoUrl}`);
            console.log(`   ✅ 远程仓库已设置: ${repoUrl}`);
            
            // 重命名分支为 main
            try {
                execSync('git branch -M main');
                console.log('   ✅ 分支已重命名为 main');
            } catch (e) {
                console.log('   ⚠️  分支重命名失败，可能已经是 main');
            }
            
        } catch (error) {
            console.log(`   ❌ Git 配置失败: ${error.message}`);
            rl.close();
            return;
        }
        
        console.log('\n📝 接下来的步骤:');
        console.log('1. 访问 GitHub 创建仓库:');
        console.log(`   https://github.com/new`);
        console.log('\n2. 填写仓库信息:');
        console.log(`   - Repository name: ${repoName}`);
        console.log(`   - Description: 剧绕乐 - 短剧本工坊 AI视频/小说解析平台`);
        console.log(`   - Visibility: ${isPrivate.toLowerCase() === 'y' ? 'Private' : 'Public'}`);
        console.log('   - ❌ 不要勾选 "Add a README file"');
        console.log('   - ❌ 不要勾选 "Add .gitignore"');
        console.log('   - ❌ 不要勾选 "Choose a license"');
        console.log('\n3. 创建仓库后，返回这里按 Enter 继续推送代码...');
        
        await askQuestion('仓库创建完成后，按 Enter 继续: ');
        
        console.log('\n🚀 推送代码到 GitHub...');
        try {
            execSync('git push -u origin main', { stdio: 'inherit' });
            console.log('\n✅ 代码推送成功!');
            
            console.log('\n🎉 GitHub 仓库创建完成!');
            console.log(`   仓库地址: https://github.com/${username}/${repoName}`);
            console.log('\n📋 下一步: 配置 Netlify');
            console.log('   请查看 NETLIFY_RECONNECT_GUIDE.md 文件中的详细步骤');
            
        } catch (error) {
            console.log(`\n❌ 推送失败: ${error.message}`);
            console.log('\n🔧 可能的解决方案:');
            console.log('1. 检查 GitHub 仓库是否已创建');
            console.log('2. 检查网络连接');
            console.log('3. 检查 GitHub 认证 (可能需要设置 Personal Access Token)');
            console.log('\n手动推送命令:');
            console.log(`git push -u origin main`);
        }
        
    } catch (error) {
        console.log(`\n❌ 错误: ${error.message}`);
    }
    
    rl.close();
}

main().catch(console.error); 