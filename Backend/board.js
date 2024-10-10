const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');  // JWT 인증 미들웨어
const db = require('../db');  // MySQL 연결
const jwt = require('jsonwebtoken');
const session = require('express-session');
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

router.get('/board/:id', async (req, res) => {
    const postId = req.params.id;
    logUserActivity(req, `GET /board/${postId}`);

    // 비회원 처리 및 세션에서 사용자 정보 확인
    let userId = req.session.userId || '비회원';
    let isAdmin = req.session.isAdmin || false;

    // 사용자 정보가 세션에 없고, 쿠키에 토큰이 있으면 토큰을 검증하여 사용자 정보 설정
    if (!req.session.userId && req.cookies.token) {
        try {
            const decoded = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET);
            req.session.userId = decoded.userId;
            req.session.nickname = decoded.nickname;
            req.session.isAdmin = decoded.isAdmin || false;

            userId = decoded.userId;
            isAdmin = decoded.isAdmin || false;
        } catch (err) {
            console.log('토큰 검증 실패:', err);
            // 토큰 검증 실패 시 세션 초기화
            req.session.destroy();
        }
    }

    console.log(`${new Date().toISOString()} [info]: 사용자 ID: ${userId}, 관리자 여부: ${isAdmin}로 게시글 상세 요청`);

    try {
        const [results] = await db.query('SELECT * FROM Board WHERE id = ?', [postId]);
        const [comments] = await db.query('SELECT * FROM Comments WHERE post_id = ?', [postId]);

        if (results.length === 0) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }

        const post = results[0];

        // 댓글 작성자 ID를 포함하여 댓글에 추가
        const commentsWithAuthors = comments.map(comment => ({
            ...comment,
            userId: comment.user_id // 댓글 작성자 ID
        }));

        res.render('postDetail', { 
            post, 
            comments: commentsWithAuthors, 
            user: req.session || null,  // req.session으로 로그인 상태를 확인
            authorId: post.author_id,  // 게시글 작성자 ID
            isAdmin  // 관리자 여부도 넘겨줌
        });
    } catch (err) {
        console.error('게시글 상세 조회 오류:', err);
        return res.status(500).json({ message: '게시글 조회 중 오류 발생' });
    }
});

// 게시글 작성 처리 (POST 요청)
router.post('/board', authenticateToken, async (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.userId;
    const nickname = req.user.nickname; // 사용자 닉네임

    logUserActivity(req, `POST /board - 제목: ${title}, 사용자: ${userId}`);

    try {
        await db.query('INSERT INTO Board (title, content, author_id, author) VALUES (?, ?, ?, ?)', 
                       [title, content, userId, nickname]);
        res.redirect('/board');
    } catch (err) {
        console.error('게시글 작성 오류:', err);
        return res.status(500).json({ message: '게시글 작성 중 오류 발생' });
    }
});

router.get('/board/:id/edit', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    logUserActivity(req, `GET /board/${postId}/edit`);
    try {
        const [results] = await db.query('SELECT * FROM Board WHERE id = ?', [postId]);
        if (results.length === 0) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }

        // 수정 페이지로 게시글 데이터 전달
        res.render('editPost', { post: results[0], user: req.user });
    } catch (err) {
        console.error('게시글 수정 페이지 제공 오류:', err);
        return res.status(500).json({ message: '게시글 수정 페이지 조회 중 오류 발생' });
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

// 게시글 삭제 처리 (POST 요청)
router.post('/board/:id/delete', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.userId;

    logUserActivity(req, `POST /board/${postId}/delete - 사용자: ${userId}`);

    try {
        await db.query('DELETE FROM Board WHERE id = ?', [postId]);
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

// 댓글 삭제 처리 (POST 요청)
router.post('/board/:postId/comment/:commentId/delete', authenticateToken, async (req, res) => {
    const { postId, commentId } = req.params;
    const userId = req.user.userId;

    logUserActivity(req, `POST /board/${postId}/comment/${commentId}/delete - 사용자: ${userId}`);

    try {
        await db.query('DELETE FROM Comments WHERE id = ?', [commentId]);
        res.redirect(`/board/${postId}`);
    } catch (err) {
        console.error('댓글 삭제 오류:', err);
        return res.status(500).json({ message: '댓글 삭제 중 오류 발생' });
    }
});

module.exports = router;
