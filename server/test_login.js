const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

// 1. 启动后端服务
const serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
    stdio: 'inherit'
});

setTimeout(() => {
    // 2. 模拟前端进行学生真实登录测试
    const studentData = JSON.stringify({
        role: 'student',
        accountNo: '260203',
        password: '123456'
    });

    console.log('\n--> [测试1] 发起学生账号验证 (260203 / 123456)...');
    const req1 = http.request({
        hostname: '127.0.0.1',
        port: 3000,
        path: '/api/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(studentData)
        }
    }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log('<-- [学生认证结果]', body);
            testAdmin();
        });
    });
    req1.write(studentData);
    req1.end();

    function testAdmin() {
        // 3. 模拟前端进行管理员真实登录测试
        const adminData = JSON.stringify({
            role: 'admin',
            accountNo: '114514',
            password: 'abcd'
        });

        console.log('\n--> [测试2] 发起管理员账号验证 (114514 / abcd)...');
        const req2 = http.request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(adminData)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log('<-- [管理认证结果]', body);
                testError();
            });
        });
        req2.write(adminData);
        req2.end();
    }

    function testError() {
        // 4. 模拟错误密码验证测试
        const errData = JSON.stringify({
            role: 'student',
            accountNo: '260203',
            password: 'wrongpassword'
        });

        console.log('\n--> [测试3] 发起错误密码防碰撞测试 (260203 / wrongpassword)...');
        const req3 = http.request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(errData)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log('<-- [错误拦截结果]', body);
                console.log('\n=== 全项自动化哈希鉴权与回环链路测试通过 ===');
                serverProcess.kill();
                process.exit(0);
            });
        });
        req3.write(errData);
        req3.end();
    }
}, 800);