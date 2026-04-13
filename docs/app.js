/* ============================================================
   ZeeSpec App — app.js
   ============================================================ */
'use strict';

// ── DATA ──────────────────────────────────────────────────────────────────────
const DIMENSIONS = [
    {
        id: 'what', label: 'WHAT', emoji: '🔵',
        subtitle: 'What the system is',
        color: '#3B82F6',
        desc: 'Define what exists and what doesn\'t. Establish the domain model of your system.',
        questions: [
            'What does the system do?',
            'What are the main things in the system?',
            'What can exist in the system?',
            'What cannot exist in the system?',
            'What information must always be present?',
            'What information is optional?',
            'What states can each thing be in?',
            'What changes are allowed?',
            'What changes are not allowed?',
            'What should never be stored?',
        ]
    },
    {
        id: 'where', label: 'WHERE', emoji: '🟢',
        subtitle: 'Where things happen',
        color: '#10B981',
        desc: 'Define boundaries and limits. Where data lives, where it cannot go, where access is restricted.',
        questions: [
            'Where can the system be accessed from?',
            'Where are actions performed (user vs system)?',
            'Where is data allowed to go?',
            'Where is data NOT allowed to go?',
            'Where are system boundaries?',
            'Where do external systems connect?',
            'Where is access restricted?',
            'Where can failures occur?',
            'Where must the system always respond?',
            'Where is behavior different based on location?',
        ]
    },
    {
        id: 'when', label: 'WHEN', emoji: '🟡',
        subtitle: 'When things happen',
        color: '#F59E0B',
        desc: 'Define timing and triggers. When is something created, updated, deleted, or blocked?',
        questions: [
            'When is something created?',
            'When is something updated?',
            'When is something deleted?',
            'When does a process start?',
            'When does a process stop?',
            'When must the system respond immediately?',
            'When can it respond later?',
            'When should the system retry?',
            'When should the system block actions?',
            'When does something expire?',
        ]
    },
    {
        id: 'who', label: 'WHO', emoji: '🟠',
        subtitle: 'Who can act',
        color: '#F97316',
        desc: 'Define ownership and access. Who can use, see, create, update, or delete things.',
        questions: [
            'Who can use the system?',
            'Who can see what?',
            'Who can create things?',
            'Who can update things?',
            'Who can delete things?',
            'Who cannot access certain data?',
            'Who approves important actions?',
            'Who triggers key events?',
            'Who is responsible for actions?',
            'Who should never be allowed to act?',
        ]
    },
    {
        id: 'why', label: 'WHY', emoji: '🔴',
        subtitle: 'Why rules exist',
        color: '#EF4444',
        desc: 'Define intent and constraints. Why does the system exist and why are rules enforced?',
        questions: [
            'Why does this system exist?',
            'Why does each feature exist?',
            'Why are certain actions allowed?',
            'Why are certain actions blocked?',
            'Why is some data restricted?',
            'Why are validations needed?',
            'Why does timing matter?',
            'Why are some actions irreversible?',
            'Why are these constraints enforced?',
            'Why should the system fail instead of guessing?',
        ]
    },
    {
        id: 'how', label: 'HOW', emoji: '🟣',
        subtitle: 'How the system behaves',
        color: '#8B5CF6',
        desc: 'Define behavior under all conditions. How it responds, recovers, and enforces rules.',
        questions: [
            'How does the system respond to user actions?',
            'How does it behave when data is missing?',
            'How does it handle invalid input?',
            'How does it handle errors?',
            'How does it behave when something fails?',
            'How does it recover from failure?',
            'How does it enforce rules?',
            'How does it prevent unexpected behavior?',
            'How does it behave under stress?',
            'How does it stay consistent?',
        ]
    }
];

const TOTAL_QUESTIONS = 60;

// ── STATE ─────────────────────────────────────────────────────────────────────
let state = {
    checked: {},    // { 'what_0': true, 'where_3': true, ... }
    answers: {},    // { 'what_0': 'text...', ... }
    activeDrawer: null,
    activeBuilderTab: 'what',
};

function loadState() {
    try {
        const saved = localStorage.getItem('zeespec_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            state.checked = parsed.checked || {};
            state.answers = parsed.answers || {};
        }
    } catch (e) { }
}

function saveState() {
    try {
        localStorage.setItem('zeespec_state', JSON.stringify({
            checked: state.checked,
            answers: state.answers
        }));
    } catch (e) { }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function countCheckedForDim(dimId) {
    return Object.keys(state.checked).filter(k => k.startsWith(dimId + '_') && state.checked[k]).length;
}

function countTotalChecked() {
    return Object.values(state.checked).filter(Boolean).length;
}

// ── DIMENSION CARDS ───────────────────────────────────────────────────────────
function buildDimensionGrid() {
    const grid = document.getElementById('dim-grid');
    if (!grid) return;
    grid.innerHTML = '';

    DIMENSIONS.forEach((dim, dimIdx) => {
        // Card
        const card = document.createElement('div');
        card.className = 'dim-card fade-up fade-up-delay-' + (Math.min(dimIdx + 1, 4));
        card.dataset.dim = dim.id;
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-expanded', 'false');
        card.innerHTML = `
      <span class="dim-emoji">${dim.emoji}</span>
      <div class="dim-name">${dim.label}</div>
      <div class="dim-subtitle">${dim.subtitle}</div>
      <div class="dim-progress-bar"><div class="dim-progress-fill" id="fill-${dim.id}"></div></div>
      <div class="dim-progress-label" id="prog-${dim.id}">0 / 10 answered</div>
      <span class="dim-chevron">▼</span>
    `;
        grid.appendChild(card);

        card.addEventListener('click', () => toggleDrawer(dim.id));
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDrawer(dim.id); } });
    });

    // Drawer (appended after all cards)
    const drawer = document.createElement('div');
    drawer.className = 'questions-drawer';
    drawer.id = 'questions-drawer';
    drawer.innerHTML = '<div class="drawer-inner" id="drawer-inner"></div>';
    grid.appendChild(drawer);
}

function toggleDrawer(dimId) {
    const dim = DIMENSIONS.find(d => d.id === dimId);
    const drawer = document.getElementById('questions-drawer');
    const drawerInner = document.getElementById('drawer-inner');
    const cards = document.querySelectorAll('.dim-card');

    if (state.activeDrawer === dimId) {
        // Close
        drawer.classList.remove('open');
        cards.forEach(c => { c.classList.remove('active'); c.setAttribute('aria-expanded', 'false'); });
        state.activeDrawer = null;
        return;
    }

    // Open
    state.activeDrawer = dimId;
    cards.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-expanded', 'false');
    });
    const activeCard = document.querySelector(`.dim-card[data-dim="${dimId}"]`);
    if (activeCard) { activeCard.classList.add('active'); activeCard.setAttribute('aria-expanded', 'true'); }

    drawerInner.innerHTML = `
    <div class="drawer-title">
      <span>${dim.emoji}</span>
      <span style="color:${dim.color}">${dim.label}</span>
      <span>—</span>
      <span>${dim.subtitle}</span>
    </div>
    <div class="questions-list" id="qlist-${dimId}"></div>
  `;

    const qlist = document.getElementById(`qlist-${dimId}`);
    dim.questions.forEach((q, i) => {
        const key = `${dimId}_${i}`;
        const isChecked = !!state.checked[key];
        const item = document.createElement('div');
        item.className = 'question-item' + (isChecked ? ' checked' : '');
        item.dataset.key = key;
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'checkbox');
        item.setAttribute('aria-checked', isChecked ? 'true' : 'false');
        item.innerHTML = `
      <div class="q-checkbox" style="${isChecked ? `background:${dim.color}` : ''}">
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M1 5l3.5 3.5L11 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>
        <div class="q-num">Q${i + 1}</div>
        <div class="q-text">${q}</div>
      </div>
    `;
        item.addEventListener('click', () => toggleQuestion(dimId, i, dim.color));
        item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleQuestion(dimId, i, dim.color); } });
        qlist.appendChild(item);
    });

    drawer.classList.add('open');
    setTimeout(() => drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

function toggleQuestion(dimId, index, color) {
    const key = `${dimId}_${index}`;
    state.checked[key] = !state.checked[key];
    saveState();

    const item = document.querySelector(`.question-item[data-key="${key}"]`);
    if (item) {
        if (state.checked[key]) {
            item.classList.add('checked');
            item.setAttribute('aria-checked', 'true');
            item.querySelector('.q-checkbox').style.background = color;
        } else {
            item.classList.remove('checked');
            item.setAttribute('aria-checked', 'false');
            item.querySelector('.q-checkbox').style.background = '';
        }
    }

    updateProgress(dimId);
    updateRing();

    // Celebrate!
    const total = countTotalChecked();
    if (total === TOTAL_QUESTIONS) {
        setTimeout(celebrate, 300);
    }
}

function updateProgress(dimId) {
    const count = countCheckedForDim(dimId);
    const fill = document.getElementById(`fill-${dimId}`);
    const label = document.getElementById(`prog-${dimId}`);
    if (fill) fill.style.width = (count / 10 * 100) + '%';
    if (label) label.textContent = `${count} / 10 answered`;
}

function updateAllProgress() {
    DIMENSIONS.forEach(d => updateProgress(d.id));
    updateRing();
}

// ── PROGRESS RING ─────────────────────────────────────────────────────────────
function updateRing() {
    const total = countTotalChecked();
    const offset = 283 - (283 * total / TOTAL_QUESTIONS);
    const fill = document.getElementById('ring-fill');
    const num = document.getElementById('ring-num');
    if (fill) fill.style.strokeDashoffset = offset;
    if (num) num.textContent = total;
}

// ── SPEC BUILDER ──────────────────────────────────────────────────────────────
function buildSpecBuilder() {
    const tabsEl = document.getElementById('builder-tabs');
    const panelsEl = document.getElementById('builder-panels');
    if (!tabsEl || !panelsEl) return;

    DIMENSIONS.forEach((dim, i) => {
        // Tab
        const tab = document.createElement('button');
        tab.className = 'builder-tab' + (i === 0 ? ' active' : '');
        tab.dataset.tab = dim.id;
        tab.innerHTML = `
      <span class="tab-dot"></span>
      <span class="tab-label">${dim.label}</span>
      <span class="tab-count">10 Qs</span>
    `;
        tab.addEventListener('click', () => switchBuilderTab(dim.id));
        tabsEl.appendChild(tab);

        // Panel
        const panel = document.createElement('div');
        panel.className = 'builder-panel' + (i === 0 ? ' active' : '');
        panel.id = `panel-${dim.id}`;
        panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-title" style="color:${dim.color}">${dim.emoji} ${dim.label} — ${dim.subtitle}</div>
        <div class="panel-desc">${dim.desc}</div>
      </div>
      <div class="questions-form">
        ${dim.questions.slice(0, 5).map((q, qi) => `
          <div class="form-group">
            <label class="form-label">Q${qi + 1}: ${q}</label>
            <textarea class="form-input" id="ans-${dim.id}-${qi}" rows="2" placeholder="Type your answer..." data-dim="${dim.id}" data-idx="${qi}">${state.answers[`${dim.id}_${qi}`] || ''}</textarea>
          </div>
        `).join('')}
        ${dim.questions.slice(5).map((q, qi) => `
          <div class="form-group">
            <label class="form-label">Q${qi + 6}: ${q}</label>
            <textarea class="form-input" id="ans-${dim.id}-${qi + 5}" rows="2" placeholder="Type your answer..." data-dim="${dim.id}" data-idx="${qi + 5}">${state.answers[`${dim.id}_${qi + 5}`] || ''}</textarea>
          </div>
        `).join('')}
      </div>
    `;
        panelsEl.appendChild(panel);
    });

    // Bind textarea changes
    panelsEl.addEventListener('input', (e) => {
        if (e.target.classList.contains('form-input')) {
            const dim = e.target.dataset.dim;
            const idx = e.target.dataset.idx;
            const key = `${dim}_${idx}`;
            state.answers[key] = e.target.value;
            saveState();
            updatePreview();
        }
    });
}

function switchBuilderTab(dimId) {
    state.activeBuilderTab = dimId;
    document.querySelectorAll('.builder-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === dimId);
    });
    document.querySelectorAll('.builder-panel').forEach(p => {
        p.classList.toggle('active', p.id === `panel-${dimId}`);
    });
}

function updatePreview() {
    const preview = document.getElementById('preview-body');
    if (!preview) return;

    let lines = [];
    let hasContent = false;

    DIMENSIONS.forEach(dim => {
        const dimAnswers = dim.questions.map((q, i) => {
            const key = `${dim.id}_${i}`;
            return state.answers[key] ? { q, a: state.answers[key] } : null;
        }).filter(Boolean);

        if (dimAnswers.length > 0) {
            hasContent = true;
            lines.push(`<span class="pv-section"># ${dim.label} — ${dim.subtitle}</span>`);
            dimAnswers.forEach(({ q, a }) => {
                lines.push(`<span style="color:${dim.color}">## ${q}</span>`);
                lines.push(`<span class="pv-answer">${escapeHtml(a)}</span>`);
                lines.push('');
            });
        }
    });

    if (!hasContent) {
        preview.innerHTML = '<span class="preview-empty">Your spec will appear here as you fill in your answers above...</span>';
    } else {
        preview.innerHTML = lines.join('\n');
    }
}

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── COPY ──────────────────────────────────────────────────────────────────────
function copySpec() {
    let lines = ['# ZeeSpec — System Specification\n'];

    DIMENSIONS.forEach(dim => {
        lines.push(`## ${dim.label} — ${dim.subtitle}`);
        dim.questions.forEach((q, i) => {
            const key = `${dim.id}_${i}`;
            const ans = state.answers[key];
            lines.push(`### Q${i + 1}: ${q}`);
            lines.push(ans ? ans : '_(not answered)_');
            lines.push('');
        });
    });

    const text = lines.join('\n');
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('✅ Spec copied to clipboard!'));
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('✅ Spec copied to clipboard!');
    }
}

function clearSpec() {
    if (!confirm('Clear all your answers? This cannot be undone.')) return;
    state.answers = {};
    saveState();
    document.querySelectorAll('.form-input').forEach(el => el.value = '');
    updatePreview();
}

function showToast(msg) {
    const toast = document.getElementById('copy-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── CODE COPY ─────────────────────────────────────────────────────────────────
function copyCode(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('✅ Command copied!'));
    } else {
        showToast('📋 Copy: ' + text);
    }
}

// ── CELEBRATE ─────────────────────────────────────────────────────────────────
function celebrate() {
    const colors = ['#6366f1', '#10B981', '#F59E0B', '#F97316', '#EF4444', '#8B5CF6', '#a78bfa', '#34d399'];
    for (let i = 0; i < 80; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.cssText = `
      left: ${Math.random() * 100}vw;
      top: -10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${6 + Math.random() * 10}px;
      height: ${6 + Math.random() * 10}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${2 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 0.5}s;
    `;
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 4000);
    }
    showToast('🎉 All 60 questions answered! Your spec is complete!');
}

// ── INTERSECTION OBSERVER (fade-up) ───────────────────────────────────────────
function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
}

// ── TYPEWRITER ────────────────────────────────────────────────────────────────
function typewriter(el, text, speed = 35) {
    el.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
        el.textContent += text[i];
        i++;
        if (i >= text.length) clearInterval(interval);
    }, speed);
}

function initTypewriters() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.typed) {
                entry.target.dataset.typed = 'true';
                const text = entry.target.dataset.text;
                if (text) typewriter(entry.target, text);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.8 });

    document.querySelectorAll('[data-text]').forEach(el => observer.observe(el));
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function initNav() {
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    if (toggle && links) {
        toggle.addEventListener('click', () => links.classList.toggle('open'));
        links.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => links.classList.remove('open'));
        });
    }
}

// ── ANIMATED COUNTERS ─────────────────────────────────────────────────────────
function animateCounter(el, target, duration = 1200) {
    let start = null;
    const step = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
    };
    requestAnimationFrame(step);
}

function initCounters() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.counted) {
                entry.target.dataset.counted = 'true';
                const target = parseInt(entry.target.dataset.count, 10);
                if (!isNaN(target)) animateCounter(entry.target, target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
}

// ── BUILDER PREVIEW TOGGLE ───────────────────────────────────────────────────
function initPreviewToggle() {
    const btn = document.getElementById('toggle-preview');
    const preview = document.getElementById('spec-preview');
    if (btn && preview) {
        btn.addEventListener('click', () => {
            const isOpen = preview.style.display !== 'none';
            preview.style.display = isOpen ? 'none' : 'block';
            btn.textContent = isOpen ? '👁 Show Preview' : '🙈 Hide Preview';
            if (!isOpen) updatePreview();
        });
    }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    buildDimensionGrid();
    buildSpecBuilder();
    updateAllProgress();
    updateRing();
    updatePreview();
    initNav();
    initCounters();
    initTypewriters();
    initPreviewToggle();

    // Buttons
    document.getElementById('btn-copy-spec')?.addEventListener('click', copySpec);
    document.getElementById('btn-clear-spec')?.addEventListener('click', clearSpec);

    // Code copy buttons
    document.querySelectorAll('[data-copy]').forEach(el => {
        el.addEventListener('click', () => copyCode(el.dataset.copy));
    });

    // Defer animations so elements render first
    setTimeout(initAnimations, 100);

    // Smooth scroll for CTA buttons
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const target = document.querySelector(a.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });
});
