// ================================================================
// app-ui.js — UI 유틸: 탭/테마/줌/모달/세무일정
// 흥진파트너스 전자결재 v1.1
// ================================================================

// ── 테마 ─────────────────────────────────────────────────────
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const label = document.getElementById('theme-label');
    if (label) label.innerText = isDark ? 'Dark Mode' : 'Light Mode';
    document.querySelectorAll('#theme-icon, #theme-icon-mob').forEach(el => {
        el.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
    });
    lucide.createIcons();
}

function toggleTheme() {
    const isDark = !document.body.classList.contains('dark-mode');
    applyTheme(isDark);
    // 현재 유저 테마 저장
    if (currentUser) {
        const prefs = loadData('hj_prefs', {});
        prefs[currentUser.id] = { ...(prefs[currentUser.id]||{}), darkMode: isDark };
        saveData('hj_prefs', prefs);
    }
}

// ── 탭 전환 ──────────────────────────────────────────────────
function changeTab(tab) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById('tab-'+tab).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('pc-'+tab)?.classList.add('active');
    document.querySelectorAll('.mobile-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('mob-'+tab)?.classList.add('active');

    if (tab==='users') renderUsers();
    recordLog('메뉴 접속', tab);
    lucide.createIcons();
}

// ── 줌 ───────────────────────────────────────────────────────
function setZoom(val) {
    currentZoom = parseFloat(val);
    document.getElementById('zoom-wrapper').style.transform = `scale(${currentZoom})`;
    document.getElementById('zoom-val').innerText = Math.round(currentZoom*100);
}
function adjustZoom(delta) { setZoom(currentZoom+delta); }

// ── 모달 ─────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.replace('hidden','flex'); }
function closeModal(id) { document.getElementById(id).classList.replace('flex','hidden'); }

// ── 전체 체크박스 ─────────────────────────────────────────────
function toggleAll(src) { document.querySelectorAll('.doc-check').forEach(c => c.checked=src.checked); }

// ── 직인 / 승인PW ─────────────────────────────────────────────
function handleSealRegister(input) {
    const reader = new FileReader();
    reader.onload = e => { registeredSeal=e.target.result; saveData('hj_seal',registeredSeal); alert('직인 등록 완료'); };
    reader.readAsDataURL(input.files[0]);
}
function updatePassword() {
    approvalPassword = document.getElementById('set-approve-pw').value;
    saveData('hj_approve_pw', approvalPassword);
    alert('승인 비밀번호가 변경되었습니다.');
}

// ── 세무 일정 ─────────────────────────────────────────────────
function renderTax() {
    const list = [
        {d:'2026-04-25',t:'부가세 신고'},
        {d:'2026-05-10',t:'원천세 신고'},
        {d:'2026-05-31',t:'종합소득세'}
    ];
    const el = document.getElementById('dash-tax-list');
    if (!el) return;
    el.innerHTML = list.map(s => {
        const dday = Math.ceil((new Date(s.d)-TODAY)/86400000);
        return `<div class="p-3 bg-slate-500/5 border border-[var(--border)] rounded-2xl flex justify-between items-center">
            <div><p class="text-[10px] opacity-40 font-bold uppercase">${s.d}</p><p class="text-sm font-bold">${s.t}</p></div>
            <span class="text-xs font-black ${dday<7?'text-red-500':'text-orange-500'}">D-${dday}</span>
        </div>`;
    }).join('');
}

// ── 공람 btn 클릭 바인딩 (DOM 로드 후) ───────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-circular');
    if (btn) btn.addEventListener('click', openCircularSetup);
});

// ── 직인 섹션: 마스터만 표시 ─────────────────────────────────
function applySealVisibility() {
    const sealSection = document.getElementById('seal-section');
    if (!sealSection) return;
    if (currentUser?.isMaster) sealSection.classList.remove('hidden');
    else sealSection.classList.add('hidden');
}

// ── 초기화 ────────────────────────────────────────────────────
window.addEventListener('load', async () => {
    await initMaster();

    // 버전 표기
    document.querySelectorAll('.app-version').forEach(el => el.textContent = APP_VERSION);

    // 세션 복원
    const session = sessionStorage.getItem('hj_session');
    if (session) {
        const s = JSON.parse(session);
        const user = users.find(u=>u.id===s.id);
        if (user) { currentUser=user; enterApp(); return; }
    }
    lucide.createIcons();
});
