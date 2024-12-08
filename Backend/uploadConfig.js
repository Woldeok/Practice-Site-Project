const multer = require('multer');
const path = require('path');

// 디스크 저장소 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');  // 파일이 저장될 폴더
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);  // 파일 이름 설정
    }
});

// 파일 필터링 설정
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('이미지 또는 동영상 파일만 업로드 가능합니다.'));
    }
};

// multer 설정 (파일 크기 제한 없음, 필드 크기 제한 추가)
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 최대 파일 크기 50MB
        fieldSize: 10 * 1024 * 1024 // 최대 필드 크기 10MB
    },
    fileFilter: fileFilter
});

module.exports = upload;
