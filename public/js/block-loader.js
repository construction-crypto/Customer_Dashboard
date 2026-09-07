let grid = null;
const activeBlockIds = new Set();

const AVAILABLE_BLOCKS = [
  { id: 'account-overview', name: 'Account Overview', category: 'Account', icon: '👤', desc: 'Summary of account status and activity', w: 6, h: 4 },
  { id: 'budget-estimator', name: 'Budget Estimator', category: 'Tools', icon: '🧮', desc: 'Cost calculation and budget breakdown', w: 6, h: 5 },
  { id: 'builder-block', name: 'Custom Project Builder', category: 'Projects', icon: '🛠️', desc: 'Interactive project request builder', w: 6, h: 5 },
  { id: 'checklist-warranty', name: 'Checklist & Warranty', category: 'Account', icon: '🛡️', desc: 'Warranty details and project checklists', w: 6, h: 4 },
  { id: 'color-studio-block', name: 'Color Studio (Compact)', category: 'Design', icon: '🎨', desc: 'Compact palette and swatch visualizer', w: 6, h: 3 },
  { id: 'color-studio', name: 'Color Studio (Full)', category: 'Design', icon: '🖌️', desc: 'Full palette studio and swatch manager', w: 6, h: 5 },
  { id: 'contact-bid-request', name: 'Contact & Bid Request', category: 'Support', icon: '📬', desc: 'Request bids and submit inquiry forms', w: 6, h: 5 },
  { id: 'direct-dispatch', name: 'Direct Dispatch', category: 'Support', icon: '⚡', desc: 'Urgent service dispatch interface', w: 6, h: 4 },
  { id: 'header-greeting', name: 'Header & Greeting', category: 'Header', icon: '👋', desc: 'Customer welcome and notification banner', w: 12, h: 3 },
  { id: 'invoices-block', name: 'Invoices & Billing (Compact)', category: 'Finance', icon: '💳', desc: 'Quick overview of current balance', w: 6, h: 3 },
  { id: 'invoices-payments', name: 'Invoices & Payments (Full)', category: 'Finance', icon: '🧾', desc: 'Detailed invoice history and payment hub', w: 6, h: 5 },
  { id: 'job-photos', name: 'Job Site Photos', category: 'Media', icon: '📷', desc: 'Photo gallery of ongoing job sites', w: 6, h: 4 },
  { id: 'mixer-block', name: 'Paint Mixer Block', category: 'Design', icon: '🧪', desc: 'Custom paint color mixing tool', w: 6, h: 4 },
  { id: 'paint-calculator', name: 'Paint Calculator', category: 'Tools', icon: '📏', desc: 'Gallon and square footage estimator', w: 6, h: 4 },
  { id: 'profile-property', name: 'Profile & Property Settings', category: 'Settings', icon: '⚙️', desc: 'Contacts, pets, preferences, & location', w: 12, h: 8 },
  { id: 'project-bids', name: 'Project Bids', category: 'Projects', icon: '📄', desc: 'Review proposals and incoming bids', w: 6, h: 5 },
  { id: 'projects-block', name: 'Active Projects', category: 'Projects', icon: '📋', desc: 'Track live job statuses and progress', w: 6, h: 4 },
  { id: 'schedule-assessment', name: 'Schedule Assessment', category: 'Tools', icon: '📅', desc: 'Book onsite estimates and consultations', w: 6, h: 5 },
  { id: 'settings-block', name: 'Quick Settings', category: 'Settings', icon: '🔧', desc: 'Compact configuration options', w: 6, h: 3 },
  { id: 'showcase-block', name: 'Showcase Gallery', category: 'Media', icon: '🖼️', desc: 'Featured projects and finish inspiration', w: 6, h: 4 },
  { id: 'tier-block', name: 'Tier & Membership', category: 'Account', icon: '⭐', desc: 'Loyalty tier and benefits status', w: 6, h: 3 },
  { id: 'weather-widget', name: 'Weather Forecast', category: 'Tools', icon: '🌤️', desc: 'Live job site weather forecast', w: 6, h: 3 }
];

document.addEventListener('DOMContentLoaded', () => {
  grid = GridStack.init({
    column: 12,
    cellHeight: 80,
    margin: 8,
    float: true,
    handle: '.drag-handle',
    resizable: { handles: 'e, se, s, w' }
  });

  // Default initial blocks
  loadComponentBlock('header-greeting');
  loadComponentBlock('profile-property');
});

function renderAddBlockModal() {
  const modalContainer = document.getElementById('add-block-modal-content');
  if (!modalContainer) return;

  modalContainer.innerHTML = AVAILABLE_BLOCKS.map(block => {
    const isActive = activeBlockIds.has(block.id);
    return `
      <div class="p-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-indigo-300 rounded-xl flex items-center justify-between transition-all duration-150 shadow-xs group">
        <div class="flex items-center gap-3">
          <span class="text-xl p-2 bg-slate-100 rounded-lg group-hover:bg-indigo-50 transition-colors">${block.icon}</span>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-slate-800 text-xs">${block.name}</h4>
              <span class="text-[9px] font-semibold px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded">${block.category}</span>
            </div>
            <p class="text-[11px] text-slate-400 leading-tight mt-0.5">${block.desc}</p>
          </div>
        </div>
        ${isActive ? `
          <button type="button" onclick="removeComponentBlock('${block.id}')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-lg transition-colors border border-rose-200/60">
            Remove
          </button>
        ` : `
          <button type="button" onclick="loadComponentBlock('${block.id}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs">
            + Add Block
          </button>
        `}
      </div>
    `;
  }).join('');
}

async function loadComponentBlock(componentName) {
  if (activeBlockIds.has(componentName)) return;

  const config = AVAILABLE_BLOCKS.find(b => b.id === componentName) || { w: 6, h: 4 };

  try {
    const response = await fetch(`/api/components/${componentName}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const widgetContent = `
      <div class="h-full flex flex-col relative group">
        <div class="drag-handle bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 border-b border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-semibold select-none transition-colors">
          <span class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path></svg>
            ${config.name || componentName}
          </span>
          <button type="button" onclick="removeComponentBlock('${componentName}')" class="text-slate-400 hover:text-rose-600 font-bold text-xs">✕</button>
        </div>
        <div class="flex-1 overflow-auto p-1">
          ${html}
        </div>
      </div>
    `;

    grid.addWidget({
      id: componentName,
      w: config.w,
      h: config.h,
      content: widgetContent
    });

    activeBlockIds.add(componentName);
    renderAddBlockModal();
  } catch (err) {
    console.error(`Failed to fetch component [${componentName}]:`, err);
  }
}

function removeComponentBlock(componentName) {
  const el = document.querySelector(`[gs-id="${componentName}"]`) || document.getElementById(componentName);
  if (el) {
    grid.removeWidget(el);
  } else {
    // Fallback search
    const widgets = document.querySelectorAll('.grid-stack-item');
    widgets.forEach(w => {
      if (w.innerHTML.includes(componentName)) {
        grid.removeWidget(w);
      }
    });
  }
  activeBlockIds.delete(componentName);
  renderAddBlockModal();
}

function openCatalogModal() {
  const modal = document.getElementById('block-catalog-modal');
  if (modal) {
    modal.classList.remove('hidden');
    renderAddBlockModal();
  }
}

function closeCatalogModal() {
  const modal = document.getElementById('block-catalog-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}
