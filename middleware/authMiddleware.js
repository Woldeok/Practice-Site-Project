const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET || 'your_secret_key';  // 비밀키

// JWT 토큰을 검증하는 미들웨어
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출

    if (token) {
        jwt.verify(token, secretKey, (err, decoded) => {
            if (err) {
                console.error(`유효하지 않은 토큰: ${err}`);
                // 토큰이 유효하지 않을 경우에도 세션을 확인하도록 함
                checkSession(req, res, next);
            } else {
                req.user = decoded;  // 토큰에서 사용자 정보 추출
                next();  // 인증 성공 시 다음 미들웨어 실행
            }
        });
    } else {
        // 토큰이 없으면 세션을 확인하도록 함
        checkSession(req, res, next);
    }
}

// 세션에서 사용자 정보를 확인하는 함수
function checkSession(req, res, next) {
    if (req.session && req.session.userId && req.session.nickname) {
        req.user = {
            userId: req.session.userId,
            nickname: req.session.nickname,
            isAdmin: req.session.isAdmin
        };
        next();
    } else {
        return res.status(401).json({ message: '토큰 또는 세션이 필요합니다.' });
    }
}

module.exports = authenticateToken;
