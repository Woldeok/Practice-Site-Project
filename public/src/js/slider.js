const slides = document.getElementById('slides');
const totalSlides = document.querySelectorAll('.slides img').length;
let currentIndex = 0;
const slideWidth = 100; // 각 슬라이드의 너비를 100%로 설정 (즉, 100vw)

let slideInterval = setInterval(nextSlide, 60000); // 자동 슬라이드, 1분마다 전환

// 이전 슬라이드로 이동
document.getElementById('prev').addEventListener('click', function() {
    clearInterval(slideInterval); // 자동 슬라이드 중지
    prevSlide();
    slideInterval = setInterval(nextSlide, 60000); // 다시 자동 슬라이드 시작
});

// 다음 슬라이드로 이동
document.getElementById('next').addEventListener('click', function() {
    clearInterval(slideInterval); // 자동 슬라이드 중지
    nextSlide();
    slideInterval = setInterval(nextSlide, 60000); // 다시 자동 슬라이드 시작
});

// 슬라이드 다음으로 이동
function nextSlide() {
    currentIndex = (currentIndex + 1) % totalSlides; // 현재 슬라이드 인덱스를 증가
    updateSlidePosition(); // 슬라이드 이동
}

// 슬라이드 이전으로 이동
function prevSlide() {
    currentIndex = (currentIndex - 1 + totalSlides) % totalSlides; // 현재 슬라이드 인덱스를 감소
    updateSlidePosition(); // 슬라이드 이동
}

// 슬라이드 위치 업데이트
function updateSlidePosition() {
    slides.style.transform = `translateX(-${currentIndex * slideWidth}%)`; // 슬라이드를 이동
}
