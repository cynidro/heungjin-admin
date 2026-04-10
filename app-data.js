// ================================================================
// app-data.js — 데이터 계층 + 인증 로직
// 흥진파트너스 전자결재 v1.0
// ================================================================

const APP_VERSION = 'v1.0';

// ── 유틸: SHA-256 해시 ─────────────────────────────────────────
async function hashPw(pw) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── localStorage 헬퍼 ──────────────────────────────────────────
function loadData(key, def) { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } }
function saveData(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ── 전역 상태 ─────────────────────────────────────────────────
const TODAY = new Date('2026-04-10');

let users                = loadData('hj_users', []);
let pendingRequests      = loadData('hj_pending', []);
let docs                 = loadData('hj_docs', []);
let activityLogs         = loadData('hj_logs', []);
let approvalLineTemplates= loadData('hj_al_templates', []);
let registeredSeal       = loadData('hj_seal', '');
let approvalPassword     = loadData('hj_approve_pw', '1234');
let currentDocId         = null;
let currentZoom          = 1.0;
let tempOfflineUrl       = null;
let currentUser          = null;

// ── 마스터 계정 초기화 ────────────────────────────────────────
async function initMaster() {
    if (users.length === 0) {
        const hash = await hashPw('master1234');
        users = [{
            id: 'master', username: 'master', passwordHash: hash,
            name: '김진홍', jobTitle: '대표이사', empNo: 'EMP-001',
            phone: '010-3928-6944', email: 'hjpartners@hjpartners.co.kr',
            isMaster: true, mustResetPw: false, createdAt: '2024-01-01'
        }];
        saveData('hj_users', users);
    }
    if (docs.length === 0) {
        docs = [{
            id: 1, docNo: 'HJ-2024070301', title: '제9회차 전환사채 조기상환청구 안내',
            draftDate: '2024-07-03', approveDate: '2024-07-03', status: '결재완료',
            content: '조기상환 청구 본문...', tag: '디딤이앤에프', isOffline: false,
            drafterId: 'master',
            approvalLine: [{userId:'master', name:'김진홍', jobTitle:'대표이사', approved:true}],
            circularUsers: []
        }];
        saveData('hj_docs', docs);
    }
}

// ── 활동 로그 ─────────────────────────────────────────────────
function recordLog(action, detail='') {
    if (!currentUser) return;
    activityLogs.push({ userId: currentUser.id, action, detail, ts: new Date().toISOString() });
    saveData('hj_logs', activityLogs);
}

// ── 로그인 뷰 전환 ────────────────────────────────────────────
function showLoginView(view) {
    ['login','find-pw','request-id','reset-pw'].forEach(v =>
        document.getElementById(v+'-view').classList.add('hidden'));
    document.getElementById(view+'-view').classList.remove('hidden');
}

// ── 로그인 ────────────────────────────────────────────────────
async function doLogin() {
    const username = document.getElementById('login-id').value.trim();
    const pw       = document.getElementById('login-pw').value;
    const errEl    = document.getElementById('login-error');
    if (!username || !pw) { showErr(errEl,'아이디와 비밀번호를 입력하세요.'); return; }

    const hash = await hashPw(pw);
    const user = users.find(u => u.username === username && u.passwordHash === hash);
    if (!user) { showErr(errEl,'아이디 또는 비밀번호가 올바르지 않습니다.'); return; }

    errEl.classList.add('hidden');
    currentUser = user;
    sessionStorage.setItem('hj_session', JSON.stringify({id: user.id, username: user.username}));

    if (user.mustResetPw) { showLoginView('reset-pw'); return; }
    enterApp();
}

function showErr(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }

// ── 비밀번호 찾기 ─────────────────────────────────────────────
async function doFindPw() {
    const username = document.getElementById('fp-id').value.trim();
    const email    = document.getElementById('fp-email').value.trim();
    const msgEl    = document.getElementById('fp-msg');
    const user = users.find(u => u.username === username && u.email === email);
    if (!user) { showErr(msgEl,'일치하는 계정을 찾을 수 없습니다.'); msgEl.style.color='#f87171'; return; }

    const tempPw = 'Temp' + Math.random().toString(36).slice(2,8);
    user.passwordHash = await hashPw(tempPw);
    user.mustResetPw = true;
    saveData('hj_users', users);
    alert(`임시 비밀번호: ${tempPw}\n(실제 서비스: ${email}로 발송됩니다)`);
    msgEl.textContent = '임시 비밀번호가 발급되었습니다. 로그인 후 변경해주세요.';
    msgEl.style.color='#4ade80'; msgEl.classList.remove('hidden');
}

// ── 계정 신청 ─────────────────────────────────────────────────
async function doRequestId() {
    const name     = document.getElementById('req-name').value.trim();
    const username = document.getElementById('req-id').value.trim();
    const pw       = document.getElementById('req-pw').value;
    const phone    = document.getElementById('req-phone').value.trim();
    const email    = document.getElementById('req-email').value.trim();
    const jobTitle = document.getElementById('req-title').value.trim();
    const msgEl    = document.getElementById('req-msg');

    if (!name || !username || !pw) { showErr(msgEl,'필수 항목을 입력하세요.'); msgEl.style.color='#f87171'; return; }
    if (users.find(u=>u.username===username) || pendingRequests.find(r=>r.username===username)) {
        showErr(msgEl,'이미 사용 중인 아이디입니다.'); msgEl.style.color='#f87171'; return;
    }
    const hash = await hashPw(pw);
    pendingRequests.push({ id:'req_'+Date.now(), username, passwordHash:hash, name, jobTitle, phone, email, requestedAt:new Date().toISOString() });
    saveData('hj_pending', pendingRequests);
    msgEl.textContent='신청 완료! 관리자 승인 후 로그인 가능합니다.'; msgEl.style.color='#4ade80'; msgEl.classList.remove('hidden');
}

// ── 비밀번호 재설정 ───────────────────────────────────────────
async function doResetPw() {
    const pw1   = document.getElementById('new-pw1').value;
    const pw2   = document.getElementById('new-pw2').value;
    const msgEl = document.getElementById('reset-msg');
    if (pw1 !== pw2) { showErr(msgEl,'비밀번호가 일치하지 않습니다.'); return; }
    if (pw1.length < 6) { showErr(msgEl,'6자 이상 입력하세요.'); return; }
    const user = users.find(u => u.id === currentUser.id);
    user.passwordHash = await hashPw(pw1);
    user.mustResetPw = false;
    saveData('hj_users', users);
    currentUser = user;
    enterApp();
}

// ── 로그아웃 ─────────────────────────────────────────────────
function doLogout() {
    recordLog('로그아웃','');
    sessionStorage.removeItem('hj_session');
    currentUser = null;
    location.reload();
}

// ── 앱 진입 ──────────────────────────────────────────────────
function enterApp() {
    document.getElementById('login-screen').classList.add('hidden');
    const initials = currentUser.name.slice(-2);
    document.getElementById('sidebar-avatar').textContent = initials;
    document.getElementById('header-avatar').textContent  = initials;
    document.getElementById('sidebar-name').textContent   = currentUser.name;
    document.getElementById('sidebar-role').textContent   = currentUser.jobTitle || (currentUser.isMaster ? '마스터' : '사용자');

    if (currentUser.isMaster) {
        document.getElementById('pc-users').classList.remove('hidden');
        document.getElementById('pc-users').classList.add('flex');
        document.getElementById('mob-users').classList.remove('hidden');
        document.getElementById('mob-users').classList.add('flex');
    }
    updatePendingBadge();
    renderDocs();
    renderTax();
    renderMyInfo();
    renderApprovalLineList();
    lucide.createIcons();
    recordLog('로그인','');
}

// ── 신청 배지 ─────────────────────────────────────────────────
function updatePendingBadge() {
    const cnt = pendingRequests.length;
    const badge = document.getElementById('pending-badge');
    if (cnt > 0 && currentUser?.isMaster) { badge.textContent = cnt; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
}
