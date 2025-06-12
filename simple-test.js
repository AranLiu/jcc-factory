console.log('Starting test...');

// 加载环境变量
require('dotenv').config({ path: './server/.env' });

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key loaded:', apiKey ? 'YES' : 'NO');

if (!apiKey) {
    console.error('No API key found');
    process.exit(1);
}

// 使用 fetch 直接测试 API
async function testWithFetch() {
    try {
        console.log('Testing with direct fetch...');
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: 'Hello'
                    }]
                }]
            })
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            return;
        }

        const data = await response.json();
        console.log('Success! Response:', JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('Fetch error:', error.message);
    }
}

testWithFetch().then(() => {
    console.log('Test completed');
}); 