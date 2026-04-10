// ================================================================
// app-users.js — 사용자 관리 / 내 정보 / 로그 조회
// 흥진파트너스 전자결재 v1.0
// ================================================================

const USER_COLORS = ['#007AFF','#34C759','#FF9500','#FF3B30','#5856D6','#FF2D55','#AC8E68','#00BCD4'];

// ── 사용자 목록 렌더 ──────────────────────────────────────────
function renderUsers() {
    if (!currentUser?.isMaster) return;

    // 대기 신청 영역
    const pendingSection = document.getElementById('pending-requests-section');
    const pendingList    = document.getElementById('pending-list');
    if (pendingRequests.length > 0) {
        pendingSection.classList.remove('hidden');
        pendingList.innerHTML = pendingRequests.map(r => `
            <div class="bg-[var(--card-bg)] border border-orange-300/50 p-4 rounded-2xl flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <p class="font-black text-sm text-[var(--text-main)]">${r.name} <span class="text-xs font-bold opacity-50">@${r.username}</span></p>
                    <p class="text-xs opacity-50 truncate">${r.jobTitle||'직함 미지정'} · ${r.phone||'-'} · ${r.email||'-'}</p>
                    <p class="text-[10px] opacity-30 mt-1">${new Date(r.requestedAt).toLocaleString('ko-KR')}</p>
                </div>
                <div class="flex space-x-2 shrink-0">
                    <button onclick="approveRequest('${r.id}')" class="bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-black">승인</button>
                    <button onclick="rejectRequest('${r.id}')" class="bg-red-500/20 text-red-500 px-3 py-2 rounded-xl text-xs font-black">거절</button>
                </div>
            </div>`).join('');
    } else {
        pendingSection.classList.add('hidden');
    }

    // 사용자 카드
    document.getElementById('user-cards').innerHTML = users.map((u,i) => `
        <div class="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 cursor-pointer hover:shadow-md transition-shadow" onclick="showUserDetail('${u.id}')">
            <div class="flex items-center gap-4 mb-3">
                <div class="w-14 h-14 rounded-full flex items-center justify-center font-black text-xl text-white shrink-0" style="background:${USER_COLORS[i%USER_COLORS.length]}">${u.name.slice(-2)}</div>
                <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <p class="font-black text-[var(--text-main)]">${u.name}</p>
                        ${u.isMaster?'<span class="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded font-black">MASTER</span>':''}
                    </div>
                    <p class="text-xs opacity-50 mt-0.5">@${u.username}</p>
                </div>
            </div>
            <div class="text-xs opacity-60 space-y-1">
                <p>${u.jobTitle||'직함 없음'} &nbsp;·&nbsp; ${u.phone||'-'}</p>
                <p class="num-font opacity-40 font-bold">${u.empNo||'-'}</p>
            </div>
        </div>`).join('');

    updatePendingBadge();
    lucide.createIcons();
}

// ── 사용자 상세 ───────────────────────────────────────────────
function showUserDetail(userId) {
    const u = users.find(x=>x.id===userId);
    if (!u) return;
    const logCount = activityLogs.filter(l=>l.userId===userId).length;

    document.getElementById('user-detail-content').innerHTML = `
        <div class="flex justify-between items-start mb-5">
            <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-full flex items-center justify-center font-black text-xl text-white" style="background:#007AFF">${u.name.slice(-2)}</div>
                <div>
                    <h4 class="text-xl font-black text-[var(--text-main)]">${u.name}</h4>
                    <p class="text-sm opacity-50">@${u.username} · ${u.jobTitle||'직함 없음'}</p>
                </div>
            </div>
            <button onclick="closeModal('user-detail-modal')" class="text-xs opacity-50 hover:opacity-100">닫기</button>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-5">
            <div class="bg-slate-500/5 p-3 rounded-xl"><p class="text-[10px] opacity-40 font-bold uppercase mb-1">사번</p><p class="font-bold text-sm text-[var(--text-main)] num-font">${u.empNo||'-'}</p></div>
            <div class="bg-slate-500/5 p-3 rounded-xl"><p class="text-[10px] opacity-40 font-bold uppercase mb-1">전화번호</p><p class="font-bold text-sm text-[var(--text-main)]">${u.phone||'-'}</p></div>
            <div class="bg-slate-500/5 p-3 rounded-xl col-span-2"><p class="text-[10px] opacity-40 font-bold uppercase mb-1">이메일</p><p class="font-bold text-sm text-[var(--text-main)]">${u.email||'-'}</p></div>
            <div class="bg-slate-500/5 p-3 rounded-xl"><p class="text-[10px] opacity-40 font-bold uppercase mb-1">가입일</p><p class="font-bold text-sm text-[var(--text-main)]">${u.createdAt}</p></div>
            <div class="bg-slate-500/5 p-3 rounded-xl"><p class="text-[10px] opacity-40 font-bold uppercase mb-1">활동 기록</p><p class="font-bold text-sm text-[var(--text-main)]">${logCount}건</p></div>
        </div>
        <div class="flex gap-2">
            <button onclick="viewUserLog('${u.id}','${u.name}')" class="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <i data-lucide="activity" class="w-4 h-4"></i>활동 로그 보기
            </button>
            ${!u.isMaster?`<button onclick="if(confirm('${u.name} 계정을 삭제하시겠습니까?'))deleteUser('${u.id}')" class="py-3 px-4 bg-red-500/20 text-red-500 rounded-xl font-bold text-sm">삭제</button>`:''}
        </div>`;
    lucide.createIcons();
    openModal('user-detail-modal');
}

// ── 활동 로그 보기 ────────────────────────────────────────────
function viewUserLog(userId, name) {
    document.getElementById('log-modal-title').textContent = name + ' 활동 로그';
    const logs = activityLogs.filter(l=>l.userId===userId).reverse();
    if (!logs.length) {
        document.getElementById('user-log-list').innerHTML = '<p class="text-sm opacity-40 font-bold text-center py-8">기록 없음</p>';
    } else {
        document.getElementById('user-log-list').innerHTML = `
            <table class="w-full text-xs border-collapse">
                <thead><tr class="bg-slate-500/10 text-left">
                    <th class="px-3 py-2 font-black opacity-60 border border-[var(--border)] w-40">일시</th>
                    <th class="px-3 py-2 font-black opacity-60 border border-[var(--border)] w-28">행동</th>
                    <th class="px-3 py-2 font-black opacity-60 border border-[var(--border)]">상세</th>
                </tr></thead>
                <tbody>${logs.map(l=>`
                    <tr class="border-b border-[var(--border)] hover:bg-slate-500/5">
                        <td class="px-3 py-1.5 border border-[var(--border)] num-font opacity-60 whitespace-nowrap">${new Date(l.ts).toLocaleString('ko-KR')}</td>
                        <td class="px-3 py-1.5 border border-[var(--border)] font-bold text-[var(--text-main)]">${l.action}</td>
                        <td class="px-3 py-1.5 border border-[var(--border)] opacity-70">${l.detail||''}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
    }
    // 엑셀 다운 버튼 활성화
    document.getElementById('log-excel-btn').onclick = () => exportLogToCSV(userId, name, logs);
    closeModal('user-detail-modal');
    openModal('user-log-modal');
}

// ── 로그 CSV 내보내기 ─────────────────────────────────────────
function exportLogToCSV(userId, name, logs) {
    const rows = [['일시','행동','상세']];
    logs.forEach(l => rows.push([new Date(l.ts).toLocaleString('ko-KR'), l.action, l.detail||'']));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download=`${name}_활동로그.csv`; a.click();
    URL.revokeObjectURL(url);
}

// ── 사용자 삭제 ───────────────────────────────────────────────
function deleteUser(userId) {
    users = users.filter(u=>u.id!==userId);
    saveData('hj_users', users);
    recordLog('사용자 삭제', `userId:${userId}`);
    closeModal('user-detail-modal');
    renderUsers();
}

// ── 계정 신청 승인/거절 ───────────────────────────────────────
async function approveRequest(reqId) {
    const req = pendingRequests.find(r=>r.id===reqId);
    if (!req) return;
    const empNo = 'EMP-'+String(users.length+1).padStart(3,'0');
    users.push({
        id: req.id, username: req.username, passwordHash: req.passwordHash,
        name: req.name, jobTitle: req.jobTitle||'', empNo, phone: req.phone||'',
        email: req.email||'', isMaster:false, mustResetPw:false,
        createdAt: new Date().toISOString().split('T')[0]
    });
    pendingRequests = pendingRequests.filter(r=>r.id!==reqId);
    saveData('hj_users', users);
    saveData('hj_pending', pendingRequests);
    recordLog('계정 신청 승인', `${req.name} (@${req.username})`);
    renderUsers();
}
function rejectRequest(reqId) {
    const req = pendingRequests.find(r=>r.id===reqId);
    pendingRequests = pendingRequests.filter(r=>r.id!==reqId);
    saveData('hj_pending', pendingRequests);
    recordLog('계정 신청 거절', req?.name);
    renderUsers();
}

// ── 사용자 직접 생성 ──────────────────────────────────────────
async function createUser() {
    const name     = document.getElementById('cu-name').value.trim();
    const username = document.getElementById('cu-id').value.trim();
    const pw       = document.getElementById('cu-pw').value;
    const jobTitle = document.getElementById('cu-title').value.trim();
    const phone    = document.getElementById('cu-phone').value.trim();
    const email    = document.getElementById('cu-email').value.trim();
    const errEl    = document.getElementById('cu-err');

    if (!name||!username||!pw) { errEl.textContent='필수 항목(*)을 입력하세요.'; errEl.classList.remove('hidden'); return; }
    if (users.find(u=>u.username===username)) { errEl.textContent='이미 사용 중인 아이디.'; errEl.classList.remove('hidden'); return; }

    const hash  = await hashPw(pw);
    const empNo = 'EMP-'+String(users.length+1).padStart(3,'0');
    users.push({id:'u_'+Date.now(), username, passwordHash:hash, name, jobTitle, empNo, phone, email, isMaster:false, mustResetPw:false, createdAt:new Date().toISOString().split('T')[0]});
    saveData('hj_users', users);
    recordLog('사용자 직접 생성', `${name} (@${username})`);
    errEl.classList.add('hidden');
    closeModal('create-user-modal');
    ['cu-name','cu-id','cu-pw','cu-title','cu-phone','cu-email'].forEach(id => document.getElementById(id).value='');
    renderUsers();
}

// ── 내 정보 ───────────────────────────────────────────────────
function renderMyInfo() {
    if (!currentUser) return;
    document.getElementById('my-name-display').textContent  = currentUser.name||'-';
    document.getElementById('my-title-display').textContent = currentUser.jobTitle||'-';
    document.getElementById('my-empno-display').textContent = currentUser.empNo||'-';
    document.getElementById('my-email-display').textContent = currentUser.email||'-';
}

async function updateMyPassword() {
    const oldPw = document.getElementById('set-old-pw').value;
    const newPw1= document.getElementById('set-new-pw1').value;
    const newPw2= document.getElementById('set-new-pw2').value;
    if (newPw1!==newPw2) { alert('새 비밀번호가 일치하지 않습니다.'); return; }
    if (newPw1.length<6) { alert('6자 이상 입력하세요.'); return; }
    const oldHash = await hashPw(oldPw);
    const user = users.find(u=>u.id===currentUser.id);
    if (user.passwordHash!==oldHash) { alert('현재 비밀번호가 올바르지 않습니다.'); return; }
    user.passwordHash = await hashPw(newPw1);
    saveData('hj_users', users); currentUser=user;
    alert('비밀번호가 변경되었습니다.');
    ['set-old-pw','set-new-pw1','set-new-pw2'].forEach(id => document.getElementById(id).value='');
}
