// ================================================================
// app-docs.js — 문서 열람/기안/승인/공람/PDF 로직
// 흥진파트너스 전자결재 v1.0
// ================================================================

// ── 열람 권한 필터 ────────────────────────────────────────────
function getAccessibleDocs() {
    return docs.filter(d => {
        if (!currentUser) return false;
        if (currentUser.isMaster) return true;
        const inLine     = d.approvalLine?.some(a => a.userId === currentUser.id);
        const inCircular = d.circularUsers?.includes(currentUser.id);
        const isDrafter  = d.drafterId === currentUser.id;
        return inLine || inCircular || isDrafter;
    });
}

// ── 문서함 렌더 ───────────────────────────────────────────────
function renderDocs() {
    const query      = (document.getElementById('doc-search')?.value || '').toLowerCase();
    const accessible = getAccessibleDocs();
    const filtered   = accessible.filter(d =>
        d.title.toLowerCase().includes(query) || (d.tag && d.tag.toLowerCase().includes(query))
    );

    document.getElementById('approval-list').innerHTML = filtered.map(d => {
        const drafter     = users.find(u => u.id === d.drafterId);
        const drafterName = drafter ? drafter.name : '-';
        const hasCircular = d.circularUsers?.length > 0;
        return `
        <tr class="hover:bg-slate-500/5 cursor-pointer transition" onclick="if(event.target.type!=='checkbox')openDocViewer(${d.id})">
            <td class="p-3 text-center"><input type="checkbox" class="doc-check" value="${d.id}"></td>
            <td class="p-3 text-center">
                <span class="px-2 py-1 rounded text-[10px] font-black ${d.status==='결재완료'?'bg-slate-500/10 text-slate-500':'bg-orange-500/20 text-orange-500'}">${d.status}</span>
            </td>
            <td class="p-3">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-[var(--text-main)]">${d.title}</span>
                    ${d.tag ? `<span class="text-[10px] font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">#${d.tag}</span>` : ''}
                    ${hasCircular ? `<span class="text-[10px] font-black text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded">공람</span>` : ''}
                </div>
                <div class="text-[10px] opacity-30 font-bold num-font mt-0.5">${d.docNo}</div>
            </td>
            <td class="p-3 text-center text-xs opacity-50 num-font">${d.draftDate}</td>
            <td class="p-3 text-center text-xs text-blue-500 font-bold num-font">${d.approveDate}</td>
            <td class="p-3 text-center text-xs opacity-70 font-bold">${drafterName}</td>
        </tr>`;
    }).join('');

    const pending = accessible.filter(d=>d.status==='결재대기').slice(0,3);
    document.getElementById('dash-docs').innerHTML = pending.length
        ? pending.map(d=>`<div class="p-3 bg-slate-500/5 rounded-2xl flex justify-between items-center"><span class="text-sm font-bold opacity-80 truncate">${d.title}</span><span class="text-[10px] opacity-40 font-black">${d.draftDate}</span></div>`).join('')
        : '<p class="text-sm opacity-40 font-bold">결재 대기 문서 없음</p>';

    lucide.createIcons();
}

// ── 결재라인 문서 내 렌더 ─────────────────────────────────────
function renderApprovalLineOnDoc(line) {
    const el = document.getElementById('w-approval-line');
    if (!line || line.length === 0) { el.innerHTML=''; return; }

    // 결재라인 박스: 직함(위) / 이름(아래, 결재완료시 볼드, 미결재시 공란)
    const cols = line.map(a => `
        <td style="border:1px solid #bbb; text-align:center; min-width:80px; padding:0;">
            <div style="background:#f7f7f7; border-bottom:1px solid #bbb; padding:4px 8px; font-size:10px; font-weight:700; color:#555;">${a.jobTitle || ''}</div>
            <div style="padding:8px 6px; min-height:32px; font-size:13px; ${a.approved?'font-weight:900;':'color:transparent; user-select:none;'}">${a.approved ? a.name : '&nbsp;'}</div>
        </td>`).join('');

    el.innerHTML = `<table style="border-collapse:collapse; margin:16px auto 0;"><tr>${cols}</tr></table>`;
}

// ── 공람자 문서 내 렌더 ───────────────────────────────────────
function renderCircularOnDoc(circularUserIds) {
    const area    = document.getElementById('w-circular-area');
    const namesEl = document.getElementById('w-circular-names');
    if (!circularUserIds?.length) { area.classList.add('hidden'); return; }
    area.classList.remove('hidden');
    namesEl.innerHTML = circularUserIds.map(uid => {
        const u = users.find(x=>x.id===uid);
        return u ? `<span style="display:inline-block;background:#7C3AED20;color:#7C3AED;border:1px solid #7C3AED40;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:800;">${u.name}</span>` : '';
    }).join('');
}

// ── 문서 열람 ─────────────────────────────────────────────────
function openDocViewer(id) {
    const d = docs.find(x=>x.id===id); currentDocId=id;
    setZoom(1.0);
    const isDone       = d.status==='결재완료';
    const isDrafter    = d.drafterId===currentUser?.id;
    const inApprovalLine = d.approvalLine?.some(a=>a.userId===currentUser?.id);

    document.getElementById('v-mode-title').innerText = `VIEWER (${d.status})`;
    document.getElementById('w-title').innerText   = d.title;
    document.getElementById('w-content').innerText = d.content;
    document.getElementById('w-meta-no').innerText   = isDone ? d.docNo : '(결재 완료 후 부여)';
    document.getElementById('w-meta-date').innerText = d.draftDate;

    if (d.isOffline) {
        document.getElementById('doc-online-area').classList.add('hidden');
        document.getElementById('doc-offline-area').classList.remove('hidden');
        document.getElementById('v-offline-img').src = d.content;
    } else {
        document.getElementById('doc-online-area').classList.remove('hidden');
        document.getElementById('doc-offline-area').classList.add('hidden');
    }

    document.getElementById('w-seal-area').classList.toggle('hidden', !isDone);
    if (isDone && registeredSeal) {
        document.getElementById('w-seal-img').src = registeredSeal;
        document.getElementById('w-seal-img').classList.remove('hidden');
        document.getElementById('w-seal-text').classList.add('hidden');
    }

    document.getElementById('btn-approve').classList.toggle('hidden', isDone || !inApprovalLine);
    document.getElementById('btn-save').classList.add('hidden');

    const canCircular = isDrafter || currentUser?.isMaster || inApprovalLine;
    document.getElementById('btn-circular').classList.toggle('hidden', !canCircular || d.isOffline);

    document.getElementById('w-paper').querySelectorAll('[contenteditable]').forEach(el => el.contentEditable = false);
    renderApprovalLineOnDoc(d.approvalLine || []);
    renderCircularOnDoc(d.circularUsers || []);

    recordLog('문서 열람', d.title);
    openModal('wysiwyg-modal');
    lucide.createIcons();
}

// ── 기안 열기 ─────────────────────────────────────────────────
function openWysiwygDraft() {
    currentDocId=null; setZoom(1.0);
    document.getElementById('v-mode-title').innerText = 'ONLINE DRAFT';
    document.getElementById('w-title').innerText   = '여기에 제목을 입력하세요';
    document.getElementById('w-content').innerText = '1. 귀사의 무궁한 발전을 기원합니다.\n\n2. \n\n끝.';
    document.getElementById('doc-online-area').classList.remove('hidden');
    document.getElementById('doc-offline-area').classList.add('hidden');
    document.getElementById('w-seal-area').classList.add('hidden');
    document.getElementById('btn-approve').classList.add('hidden');
    document.getElementById('btn-circular').classList.add('hidden');
    document.getElementById('btn-save').classList.remove('hidden');
    document.getElementById('w-circular-area').classList.add('hidden');
    document.getElementById('w-paper').querySelectorAll('[contenteditable]').forEach(el => el.contentEditable='true');

    window._draftApprovalLine = null;
    if (approvalLineTemplates.length > 0) {
        renderSelectApprovalLine();
        openModal('select-approval-line-modal');
    } else {
        applyDefaultApprovalLine();
    }
    openModal('wysiwyg-modal');
    lucide.createIcons();
}

function applyDefaultApprovalLine() {
    const master = users.find(u=>u.isMaster);
    const line = [];
    if (currentUser && !currentUser.isMaster)
        line.push({userId:currentUser.id, name:currentUser.name, jobTitle:currentUser.jobTitle||'', approved:false});
    if (master)
        line.push({userId:master.id, name:master.name, jobTitle:master.jobTitle||'대표이사', approved:false});
    window._draftApprovalLine = line;
    renderApprovalLineOnDoc(line);
}

function applyTemplate(templateId) {
    const t = approvalLineTemplates.find(x=>x.id===templateId);
    if (!t) return;
    const line = [];
    if (currentUser && !currentUser.isMaster && !t.approvers.includes(currentUser.id))
        line.push({userId:currentUser.id, name:currentUser.name, jobTitle:currentUser.jobTitle||'', approved:false});
    t.approvers.forEach(uid => {
        const u = users.find(x=>x.id===uid);
        if (u) line.push({userId:u.id, name:u.name, jobTitle:u.jobTitle||'', approved:false});
    });
    window._draftApprovalLine = line;
    renderApprovalLineOnDoc(line);
}

function renderSelectApprovalLine() {
    document.getElementById('select-al-list').innerHTML = [
        `<button onclick="applyDefaultApprovalLine();closeModal('select-approval-line-modal')" class="w-full text-left p-4 bg-slate-500/5 border border-[var(--border)] rounded-xl font-bold hover:bg-blue-500/5 transition text-[var(--text-main)]">
            <p class="text-sm font-black">기본 결재라인</p><p class="text-xs opacity-50 mt-1">기안자 → 대표이사</p>
        </button>`,
        ...approvalLineTemplates.map(t => {
            const names = t.approvers.map(uid=>users.find(u=>u.id===uid)?.name||uid).join(' → ');
            return `<button onclick="applyTemplate('${t.id}');closeModal('select-approval-line-modal')" class="w-full text-left p-4 bg-slate-500/5 border border-[var(--border)] rounded-xl font-bold hover:bg-blue-500/5 transition text-[var(--text-main)]">
                <p class="text-sm font-black">${t.name}</p><p class="text-xs opacity-50 mt-1">${names}</p>
            </button>`;
        })
    ].join('');
}

// ── 상신 ─────────────────────────────────────────────────────
function submitWysiwyg() {
    const date     = TODAY.toISOString().split('T')[0];
    const isMaster = currentUser?.isMaster;
    const status   = isMaster ? '결재완료' : '결재대기';
    const approvalLine = (window._draftApprovalLine||[]).map(a=>({...a, approved: isMaster}));

    // 문서번호: 결재완료면 즉시 부여, 아니면 임시번호
    const dateStr   = date.replace(/-/g,'');
    const todayDone = docs.filter(d=>d.approveDate===date).length + 1;
    const docNo     = isMaster
        ? `HJ-${dateStr}${String(todayDone).padStart(2,'0')}`
        : `DRAFT-${Date.now()}`;

    const newDoc = {
        id: Date.now(), docNo, status, draftDate: date,
        approveDate: isMaster ? date : '-',
        title:   document.getElementById('w-title').innerText,
        content: document.getElementById('w-content').innerText,
        tag:'', isOffline:false,
        drafterId: currentUser?.id,
        approvalLine, circularUsers:[]
    };
    docs.unshift(newDoc);
    saveData('hj_docs', docs);
    window._draftApprovalLine = null;
    recordLog('문서 기안', newDoc.title);
    closeModal('wysiwyg-modal'); renderDocs();
}

// ── 승인 ─────────────────────────────────────────────────────
function openPasswordModal() { openModal('password-modal'); }

async function verifyAndApprove() {
    const inputPw = document.getElementById('approve-pw').value;
    const hash    = await hashPw(inputPw);
    const isMatch = inputPw===approvalPassword || hash===approvalPassword;
    if (!isMatch) { alert('비밀번호 오류'); return; }

    const d = docs.find(x=>x.id===currentDocId);
    const date = TODAY.toISOString().split('T')[0];

    // 결재번호 부여
    if (d.status !== '결재완료') {
        const todayDone = docs.filter(x=>x.approveDate===date&&x.status==='결재완료').length + 1;
        d.docNo = `HJ-${date.replace(/-/g,'')}${String(todayDone).padStart(2,'0')}`;
    }
    d.status='결재완료'; d.approveDate=date;
    if (d.approvalLine) {
        const mine = d.approvalLine.find(a=>a.userId===currentUser?.id);
        if (mine) mine.approved=true;
    }
    saveData('hj_docs', docs);
    recordLog('문서 결재 승인', d.title);
    closeModal('password-modal');
    document.getElementById('approve-pw').value='';
    renderDocs(); openDocViewer(d.id);
}

// ── 공람 ─────────────────────────────────────────────────────
function openCircularSetup() {
    const d = docs.find(x=>x.id===currentDocId);
    if (!d) return;
    const otherUsers = users.filter(u=>u.id!==currentUser?.id);
    document.getElementById('circular-user-list').innerHTML = otherUsers.map(u=>`
        <label class="flex items-center space-x-3 p-3 bg-slate-500/5 rounded-xl cursor-pointer hover:bg-blue-500/5 transition">
            <input type="checkbox" class="circular-check" value="${u.id}" ${d.circularUsers?.includes(u.id)?'checked':''}>
            <div>
                <p class="font-bold text-sm text-[var(--text-main)]">${u.name}</p>
                <p class="text-xs opacity-50">${u.jobTitle||''} · ${u.username}</p>
            </div>
        </label>`).join('');
    openModal('circular-modal');
}

function saveCircular() {
    const d = docs.find(x=>x.id===currentDocId);
    if (!d) return;
    d.circularUsers = [...document.querySelectorAll('.circular-check:checked')].map(c=>c.value);
    saveData('hj_docs', docs);
    recordLog('공람 설정', d.title);
    closeModal('circular-modal');
    renderCircularOnDoc(d.circularUsers);
    renderDocs();
}

// ── 태그 수정 ─────────────────────────────────────────────────
function toggleTagEdit() {
    const d = docs.find(x=>x.id===currentDocId);
    const isEdit = document.getElementById('w-tag-input').classList.toggle('hidden');
    if (isEdit) {
        d.tag = document.getElementById('w-tag-input').value;
        document.getElementById('v-tag-content').innerText = d.tag ? `#${d.tag}` : '#미지정';
        document.getElementById('v-tag-content').classList.remove('hidden');
        saveData('hj_docs', docs); renderDocs();
    } else {
        document.getElementById('w-tag-input').value = d?.tag||'';
        document.getElementById('v-tag-content').classList.add('hidden');
    }
}

// ── 오프라인 ─────────────────────────────────────────────────
function handleOfflineFile(input) {
    if (input.files[0]) { tempOfflineUrl=URL.createObjectURL(input.files[0]); document.getElementById('off-file-name').innerText=input.files[0].name; }
}
function submitOffline() {
    const date   = document.getElementById('off-date').value;
    const master = users.find(u=>u.isMaster);
    const newDoc = {
        id:Date.now(), docNo:`HJ-${date.replace(/-/g,'')}00`, status:'결재완료',
        draftDate:date, approveDate:TODAY.toISOString().split('T')[0],
        title:'[오프라인] '+document.getElementById('off-title').value,
        content:tempOfflineUrl, tag:document.getElementById('off-tag').value,
        isOffline:true, drafterId:currentUser?.id,
        approvalLine: master?[{userId:master.id,name:master.name,jobTitle:master.jobTitle,approved:true}]:[],
        circularUsers:[]
    };
    docs.unshift(newDoc); saveData('hj_docs', docs);
    recordLog('오프라인 문서 등재', newDoc.title);
    renderDocs(); closeModal('offline-modal');
}

// ── PDF ──────────────────────────────────────────────────────
async function saveCurrentToPDF() {
    const {jsPDF} = window.jspdf;
    const el = document.getElementById('w-paper');
    const canvas = await html2canvas(el, {scale:2});
    const pdf = new jsPDF('p','mm','a4');
    pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297);
    pdf.save(`흥진_문서_${currentDocId}.pdf`);
    recordLog('PDF 다운로드', `문서ID:${currentDocId}`);
}
async function downloadSelected() {
    const checks = document.querySelectorAll('.doc-check:checked');
    if (!checks.length) { alert('다운로드할 문서를 선택하세요.'); return; }
    alert(checks.length+'개 문서를 순차 생성합니다. 팝업 차단을 해제해주세요.');
    for (const c of checks) { openDocViewer(parseInt(c.value)); await new Promise(r=>setTimeout(r,500)); await saveCurrentToPDF(); }
}

// ── 결재라인 템플릿 ───────────────────────────────────────────
function renderApprovalLineList() {
    const el = document.getElementById('approval-line-list');
    if (!el) return;
    if (!approvalLineTemplates.length) { el.innerHTML='<p class="text-xs opacity-40 font-bold">저장된 템플릿이 없습니다.</p>'; return; }
    el.innerHTML = approvalLineTemplates.map(t => {
        const names = t.approvers.map(uid=>users.find(u=>u.id===uid)?.name||uid).join(' → ');
        return `<div class="flex items-center justify-between p-3 bg-slate-500/5 rounded-xl">
            <div><p class="font-bold text-sm text-[var(--text-main)]">${t.name}</p><p class="text-xs opacity-50 mt-0.5">${names}</p></div>
            <button onclick="deleteApprovalLineTemplate('${t.id}')" class="text-red-400 hover:text-red-600 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`;
    }).join('');
    lucide.createIcons();
}
function addApproverInput() {
    const cont = document.getElementById('al-approvers');
    const inp  = document.createElement('input');
    inp.type='text'; inp.placeholder=`결재자 아이디 ${cont.children.length+1}`;
    inp.className='al-approver-input w-full p-3 bg-slate-500/5 border border-[var(--border)] rounded-xl text-[var(--text-main)] text-sm';
    cont.appendChild(inp);
}
function saveApprovalLineTemplate() {
    const name = document.getElementById('al-name').value.trim();
    if (!name) { alert('템플릿 이름을 입력하세요.'); return; }
    const approverIds = [...document.querySelectorAll('.al-approver-input')]
        .map(i=>i.value.trim()).filter(Boolean)
        .map(un=>users.find(u=>u.username===un)?.id).filter(Boolean);
    if (!approverIds.length) { alert('유효한 결재자를 입력하세요.'); return; }
    approvalLineTemplates.push({id:'alt_'+Date.now(), name, approvers:approverIds});
    saveData('hj_al_templates', approvalLineTemplates);
    closeModal('approval-line-modal');
    renderApprovalLineList();
}
function deleteApprovalLineTemplate(id) {
    approvalLineTemplates = approvalLineTemplates.filter(t=>t.id!==id);
    saveData('hj_al_templates', approvalLineTemplates);
    renderApprovalLineList();
}
