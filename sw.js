// 근시관리 트래커 서비스 워커
//
// 역할: 앱으로 설치할 수 있게 하고, 인터넷이 잠깐 끊겼을 때 빈 화면 대신 마지막 화면을 보여준다.
//
// ⚠️ 화면(index.html)은 항상 '인터넷 먼저'로 가져온다.
//    캐시를 먼저 쓰면 GitHub에 수정본을 올려도 휴대폰에는 예전 화면이 계속 뜬다.
// ⚠️ 환자 기록(Firebase)은 여기서 저장하지 않는다. 의료 정보가 기기에 남지 않도록.

const CACHE = 'myopia-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  // 버전이 바뀌면 예전 캐시를 지운다
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 같은 사이트 파일만 다룬다 (Firebase·구글 API·글꼴 등 외부 요청은 그대로 통과)
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // 화면: 인터넷 먼저 → 실패하면 저장해 둔 화면
    event.respondWith(
      fetch(req)
        .then(res => {
          // 정상 응답만 저장 (오류 페이지가 저장돼 오프라인 때 뜨는 것 방지)
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 아이콘 등 정적 파일: 저장본 먼저, 없으면 인터넷
  if (SHELL.some(p => url.pathname.endsWith(p.replace('./', '/')) && p !== './')) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
