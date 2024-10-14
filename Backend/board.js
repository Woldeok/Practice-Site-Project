const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');  // 세션 또는 토큰 인증 미들웨어
const multer = require('multer');
const db = require('../db');  // MySQL 연결
const jwt = require('jsonwebtoken');
const session = require('express-session');

const upload = require('./uploadConfig'); // multer 설정 불러오기





// 사용자 IP 및 ID 로깅 함수
function logUserActivity(req, action) {
    const userId = req.user ? req.user.userId : '비회원';
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`${new Date().toISOString()} [info]: ${action} - 사용자: ${userId}, IP: ${ip}`);
}

router.use(session({
    secret: 'your_session_secret',  // 세션 비밀키
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // HTTPS 사용시 true로 설정
}));


// JWT 토큰 생성 함수
function generateToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
}
// 게시글 목록 조회 (GET 요청)
router.get('/board', async (req, res) => {
    logUserActivity(req, 'GET /board');

    const search = req.query.search || ''; // 검색어를 가져옴
    const currentPage = parseInt(req.query.page) || 1; // 현재 페이지
    const postsPerPage = 10; // 한 페이지에 보여줄 게시글 수

    try {
        // 전체 게시글 수 조회
        const [[{ count }]] = await db.query('SELECT COUNT(*) as count FROM Board WHERE title LIKE ?', [`%${search}%`]);
        const totalPages = Math.ceil(count / postsPerPage); // 전체 페이지 수

        // 현재 페이지에 맞는 게시글 조회
        const [results] = await db.query(
            'SELECT * FROM Board WHERE title LIKE ? ORDER BY created_at DESC LIMIT ?, ?',
            [`%${search}%`, (currentPage - 1) * postsPerPage, postsPerPage]
        );

        // EJS 템플릿에 변수 전달
        res.render('board', { 
            posts: results, 
            user: req.user || null, 
            search, 
            currentPage, 
            totalPages 
        }); // 페이지 관련 변수를 추가하여 전달
    } catch (err) {
        console.error('게시글 조회 오류:', err);
        return res.status(500).json({ message: '게시글 조회 중 오류 발생' });
    }

console.log(`Decoded user info: ${JSON.stringify(req.user)}`);

});


// 게시글 작성 페이지 (GET 요청)
router.get('/board/new', authenticateToken, (req, res) => {
    logUserActivity(req, 'GET /board/new');
    res.render('newPost', { user: req.user });
});

// 게시글 상세보기 (GET 요청)
// 게시글 상세보기 (GET 요청)
// 게시글 상세보기 (GET 요청)

router.get('/board/:postId/comment/:commentId/edit', authenticateToken, async (req, res) => {
    const { postId, commentId } = req.params;
    
    logUserActivity(req, `GET /board/${postId}/comment/${commentId}/edit`);
    
    try {
        // Fetch the post details (for context)
        const [postResults] = await db.query('SELECT * FROM Board WHERE id = ?', [postId]);
        if (postResults.length === 0) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }

        const post = postResults[0];

        // Fetch the comment details
        const [commentResults] = await db.query('SELECT * FROM Comments WHERE id = ?', [commentId]);
        if (commentResults.length === 0) {
            return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
        }

        const comment = commentResults[0];

        // Check if the user is the comment author or an admin
        const isAdmin = req.user ? req.user.role === 'admin' : false;
        if (req.user.userId !== comment.user_id && !isAdmin) {
            return res.status(403).json({ message: '수정 권한이 없습니다.' });
        }

        // Render the comment edit page with the post and comment details
        res.render('editPost_s', {
            post,
            comment,
            user: req.user || null, // Send the logged-in user information if available8790ㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑㅑ
            isAdmin // Send the admin status to the frontend
        });
    } catch (err) {
        console.error('댓글 수정 페이지 제공 오류:', err);
        return res.status(500).json({ message: '댓글 수정 페이지 조회 중 오류 발생' });
    }
});

// 게시글 상세보기 라우터에 미들웨어 적용
router.get('/board/:id', authenticateToken, async (req, res) => {
    const postId = req.params.id;

    try {
        const [postResults] = await db.query('SELECT * FROM Board WHERE id = ?', [postId]);

        if (postResults.length === 0) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }

        const post = postResults[0];

        // 댓글 가져오기
        const [commentResults] = await db.query('SELECT * FROM Comments WHERE post_id = ?', [postId]);

        const commentsWithAuthors = commentResults.map(comment => ({
            ...comment,
            userId: comment.user_id
        }));

        const userId = req.user ? req.user.userId : '비회원';
        console.log(`접속자 ID: ${userId}, 게시글 작성자 ID: ${post.author_id}`);

        commentsWithAuthors.forEach(comment => {
            console.log(`댓글 ID: ${comment.id}, 댓글 작성자 ID: ${comment.userId}`);
        });

        res.render('postDetail', { 
            post,
            user: req.user || null,
            authorId: post.author_id, 
            comments: commentsWithAuthors, 
            isAdmin: req.user?.isAdmin || false
        });
    } catch (err) {
        console.error('게시글 조회 오류:', err);
        return res.status(500).json({ message: '게시글 조회 중 오류 발생' });
    }
});


// 게시물 작성 (POST 요청) - 토큰 및 세션 검증 적용
router.post('/board', upload.single('file'), async (req, res) => {
    try {
        const { title, content } = req.body;
        let fileUrl = null;

        // 업로드된 파일이 있는 경우 파일 경로 저장
        if (req.file) {
            fileUrl = `/uploads/${req.file.filename}`;
        }

        // JWT 또는 세션에서 사용자 정보를 추출
        let userId, nickname, userRole;

        // 접속자 정보 기록 (IP)
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // JWT 토큰이 있는 경우 우선 처리
        if (req.cookies.token) {
            try {
                const token = req.cookies.token;
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
                userId = decoded.userId;
                nickname = decoded.nickname;
                userRole = decoded.role;
                console.log(`JWT 사용 - 접속자 IP: ${ip}, ID: ${userId}, 닉네임: ${nickname}, 역할: ${userRole}`);
            } catch (err) {
                console.error('유효하지 않은 토큰:', err);
                return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
            }
        } 
        // 세션에서 사용자 정보를 확인 (JWT가 없는 경우)
        else if (req.session.userId && req.session.nickname) {
            userId = req.session.userId;
            nickname = req.session.nickname;
            userRole = req.session.userRole;
            console.log(`세션 사용 - 접속자 IP: ${ip}, ID: ${userId}, 닉네임: ${nickname}, 역할: ${userRole}`);
        }

        // 사용자 정보가 없을 경우 비회원으로 처리
        if (!userId || !nickname) {
            console.log(`비회원 접속자 IP: ${ip}`);
            return res.status(403).json({ message: '로그인이 필요합니다.' });
        }

        // 제대로 닉네임을 추출했는지 로그 확인
        console.log(`등록자: ${nickname}, 사용자 ID: ${userId}`);

        // 게시글 DB 저장 (작성자 ID 및 닉네임 포함)
        await db.query('INSERT INTO Board (title, content, fileUrl, author_id, author_nickname, author, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                      [title, content, fileUrl, userId, nickname, nickname, ip]);

        // 게시물 작성 후 /board로 리다이렉트
        console.log(`게시물 작성 완료 - 작성자 ID: ${userId}, 닉네임: ${nickname}, 제목: ${title}`);
        res.redirect('/board');
    } catch (error) {
        console.error('게시물 업로드 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});











// 게시물 수정 처리 (POST 요청)
router.post('/board/:id/edit', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const { title, content } = req.body;
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';  // 관리자 여부 확인

    logUserActivity(req, `POST /board/${postId}/edit - 사용자: ${userId}`);

    try {
        const [results] = await db.query('SELECT * FROM Board WHERE id = ?', [postId]);
        if (results.length === 0) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }

        const post = results[0];

        // 게시물 작성자나 관리자가 아닌 경우 권한 거부
        if (post.author_id !== userId && !isAdmin) {
            return res.status(403).json({ message: '수정 권한이 없습니다.' });
        }

        await db.query('UPDATE Board SET title = ?, content = ? WHERE id = ?', [title, content, postId]);
        res.redirect(`/board/${postId}`);
    } catch (err) {
        console.error('게시글 수정 오류:', err);
        return res.status(500).json({ message: '게시글 수정 중 오류 발생' });
    }
});


// 게시글 수정 처리 (POST 요청)
router.post('/board/:id/edit', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const { title, content } = req.body;
    const userId = req.user.userId;

    logUserActivity(req, `POST /board/${postId}/edit - 사용자: ${userId}`);

    try {
        await db.query('UPDATE Board SET title = ?, content = ? WHERE id = ?', [title, content, postId]);
        res.redirect(`/board/${postId}`);
    } catch (err) {
        console.error('게시글 수정 오류:', err);
        return res.status(500).json({ message: '게시글 수정 중 오류 발생' });
    }
});

router.post('/board/:id/delete', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.userId;  // 접속자 ID
    const isAdmin = req.user.role === 'admin';  // 관리자 여부

    // 게시글 작성자 ID를 데이터베이스에서 불러옴
    const [results] = await db.query('SELECT author_id FROM Board WHERE id = ?', [postId]);

    if (results.length === 0) {
        return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    const postAuthorId = results[0].author_id;  // 게시글 작성자 ID

    // 로그로 접속자 ID와 작성자 ID를 출력하여 비교
    console.log(`접속자 ID: ${userId}, 게시글 작성자 ID: ${postAuthorId}`);

    // 작성자 또는 관리자인지 확인
    if (postAuthorId !== userId && !isAdmin) {
        console.log('삭제 권한이 없습니다.');
        return res.status(403).json({ message: '삭제 권한이 없습니다.' });
    }

    try {
        await db.query('DELETE FROM Board WHERE id = ?', [postId]);
        console.log('게시글이 삭제되었습니다.');
        res.redirect('/board');
    } catch (err) {
        console.error('게시글 삭제 오류:', err);
        return res.status(500).json({ message: '게시글 삭제 중 오류 발생' });
    }
});

// 댓글 작성 처리 (POST 요청)
router.post('/board/:id/comment', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.userId;  // 인증된 사용자 ID
    const commentContent = req.body.comment;  // 클라이언트에서 전송된 댓글 내용

    logUserActivity(req, `POST /board/${postId}/comment - 사용자: ${userId}`);

    try {
        await db.query('INSERT INTO Comments (post_id, user_id, content) VALUES (?, ?, ?)', 
                       [postId, userId, commentContent]);
        res.redirect(`/board/${postId}`);
    } catch (err) {
        console.error('댓글 작성 오류:', err);
        return res.status(500).json({ message: '댓글 작성 중 오류 발생' });
    }
});

// 댓글 수정 처리 (POST 요청)
router.post('/board/:postId/comment/:commentId/edit', authenticateToken, async (req, res) => {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    logUserActivity(req, `POST /board/${postId}/comment/${commentId}/edit - 사용자: ${userId}`);

    try {
        await db.query('UPDATE Comments SET content = ? WHERE id = ?', [content, commentId]);
        res.redirect(`/board/${postId}`);
    } catch (err) {
        console.error('댓글 수정 오류:', err);
        return res.status(500).json({ message: '댓글 수정 중 오류 발생' });
    }
});

router.post('/board/:postId/comment/:commentId/delete', authenticateToken, async (req, res) => {
    const { postId, commentId } = req.params;
    const userId = req.user.userId;  // 접속자 ID
    const isAdmin = req.user.role === 'admin';  // 관리자 여부

    const [commentResults] = await db.query('SELECT user_id FROM Comments WHERE id = ?', [commentId]);

    if (commentResults.length === 0) {
        return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    }

    const commentAuthorId = commentResults[0].user_id;  // 댓글 작성자 ID

    // 로그로 접속자 ID와 댓글 작성자 ID 출력하여 비교
    console.log(`접속자 ID: ${userId}, 댓글 작성자 ID: ${commentAuthorId}`);

    if (commentAuthorId != userId && !isAdmin) {  // !=을 사용하여 형변환 비교
        console.log('삭제 권한이 없습니다.');
        return res.status(403).json({ message: '삭제 권한이 없습니다.' });
    }

    try {
        await db.query('DELETE FROM Comments WHERE id = ?', [commentId]);
        res.redirect(`/board/${postId}`);
    } catch (err) {
        console.error('댓글 삭제 오류:', err);
        return res.status(500).json({ message: '댓글 삭제 중 오류 발생' });
    }
});


module.exports = router;
