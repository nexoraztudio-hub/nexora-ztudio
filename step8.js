/* NEXORA ZTUDIO STEP 8 — Open saved projects in their own studio.
   Installs edit mode only for ?edit=<existing project id>.
   Preserves normal Create New behavior when no edit parameter is present. */
(() => {
  'use strict';
  const KEY = 'nexora_ztudio_projects_v1';
  const $ = id => document.getElementById(id);
  const file = location.pathname.split('/').pop().toLowerCase();
  const studioType = file === 'caption-studio.html' ? 'Caption'
    : file === 'ad-script-studio.html' ? 'Ad Script'
    : file === 'video-storyboard.html' ? 'Storyboard' : null;
  if (!studioType) return;

  const editId = new URLSearchParams(location.search).get('edit');
  if (!editId) return; // Normal new-project workflow remains untouched.

  const targetType = value => {
    const v = String(value || '').trim().toLowerCase();
    if (v === 'caption') return 'Caption';
    if (v === 'ad script' || v === 'adscript') return 'Ad Script';
    if (v === 'video storyboard' || v === 'storyboard') return 'Storyboard';
    return 'Other';
  };
  const read = () => {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(parsed)) throw Error('Project storage is not a list.');
    return parsed;
  };
  const banner = document.createElement('div');
  banner.style.cssText = 'padding:16px;margin:18px 0;background:#20203c;border:1px solid #a78bfa;border-radius:14px;color:white;line-height:1.6';
  banner.setAttribute('role', 'status');
  const head = document.createElement('strong');
  head.textContent = '✏️ Editing saved project';
  const message = document.createElement('p');
  message.style.cssText = 'margin:8px 0;color:#dad3fb';
  const back = document.createElement('a');
  back.href = 'projects.html';
  back.textContent = '← Back to Project Manager';
  back.style.cssText = 'color:#c4b5fd;display:inline-block;margin-top:7px';
  banner.append(head, message, back);
  const firstContent = document.querySelector('main, .wrap, body');
  firstContent.prepend(banner);
  const fail = text => {message.textContent = text; message.style.color = '#ffb4bf';};

  let original;
  try {
    original = read().find(p => String(p.id) === editId);
    if (!original) { fail('Project not found in this browser. Open Project Manager from the same Safari browser. No records were changed.'); return; }
    if (targetType(original.type) !== studioType) { fail('This project belongs to a different studio. Open it using Project Manager.'); return; }
  } catch (e) { fail('Cannot read saved projects: ' + e.message); return; }

  const editor = studioType === 'Storyboard' ? $('output') : $('result');
  if (!editor) { fail('This studio has no editable output field. No changes were made.'); return; }

  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'Project title (editing this saved record)';
  titleLabel.htmlFor = 'step8Title';
  titleLabel.style.cssText = 'display:block;font-weight:bold;margin-top:14px';
  const titleInput = document.createElement('input');
  titleInput.id = 'step8Title';
  titleInput.value = String(original.title || 'Untitled project');
  titleInput.style.cssText = 'display:block;width:100%;padding:13px;margin-top:7px;border-radius:11px;background:#0c1020;color:#fff;border:1px solid #6b67a1;font:inherit';
  editor.before(titleLabel, titleInput);

  // Reopen EXACT saved content without regenerating it or losing custom edits.
  editor.readOnly = false;
  editor.value = String(original.content || '');
  if (studioType === 'Caption') {
    const outputSection = $('outputSection');
    if (outputSection) outputSection.style.display = 'block';
  }
  if (studioType === 'Storyboard') {
    // The saved project text is authoritative. Scene cards were generated before
    // editing and would otherwise be misleading, so the text editor is primary.
    const scenes = $('scenes');
    if (scenes) scenes.replaceChildren();
    const summary = $('summary');
    if (summary) summary.textContent = 'Editing existing storyboard text. Scene cards are not regenerated automatically.';
  }

  // Extract only clearly available info; content remains unchanged.
  const productLine = String(original.content || '').match(/^Product:\s*(.+)$/mi);
  if ($('product') && productLine) $('product').value = productLine[1].trim();
  const productField = $('product');
  if (studioType === 'Caption' && productField && !productLine) {
    productField.value = String(original.business || productField.value || '');
  }
  const rawBusiness = String(original.content || '').match(/^Business:\s*(.+)$/mi);
  const businessSelect = studioType === 'Ad Script' ? $('category') : studioType === 'Storyboard' ? $('business') : null;
  if (businessSelect && rawBusiness) {
    const candidate = [...businessSelect.options].find(opt => opt.value === rawBusiness[1].trim() || opt.text === rawBusiness[1].trim());
    if (candidate) businessSelect.value = candidate.value;
  }
  const platform = String(original.content || '').match(/^Platform:\s*(.+)$/mi);
  if ($('platform') && platform) {
    const option = [...$('platform').options].find(o => o.value === platform[1].trim() || o.text === platform[1].trim());
    if (option) $('platform').value = option.value;
  }

  message.textContent = 'Opened: ' + (original.title || 'Untitled project') + '. Edit the text, then tap Update saved project. Your original project ID will be retained.';

  // Existing Step 7 buttons were added dynamically and already have click handlers.
  // Capture phase stops the old create-new listener only in edit mode.
  const buttons = [...document.querySelectorAll('button')];
  let saveButton = buttons.find(b => b.textContent.includes('Save to Projects'));
  if (!saveButton) {
    saveButton = document.createElement('button');
    saveButton.type = 'button';
    editor.insertAdjacentElement('afterend', saveButton);
  }
  saveButton.textContent = '💾 Update saved project';
  saveButton.style.cssText += ';background:linear-gradient(90deg,#7c3aed,#2563eb);color:white;min-height:48px;';

  const saveExisting = event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    const title = titleInput.value.trim();
    const content = editor.value.trim();
    if (!title || !content) { alert('Please enter a project title and some content.'); return; }
    try {
      const all = read(); // Always reload latest data so other saved projects stay intact.
      const index = all.findIndex(p => String(p.id) === editId);
      if (index === -1) { fail('Project no longer exists here. No new duplicate was created.'); return; }
      const existing = all[index];
      if (targetType(existing.type) !== studioType) throw Error('Project type changed.');
      all[index] = {
        ...existing, // preserve ID, original type, and any unknown fields
        title,
        content,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(KEY, JSON.stringify(all));
      original = all[index];
      message.textContent = '✅ Updated existing project: ' + title + '. No duplicate created. Return to Project Manager to verify.';
      message.style.color = '#a7edce';
      alert('✅ Existing project updated. No duplicate created!');
    } catch(e) {
      fail('Update failed: ' + e.message + '. Existing records were not intentionally overwritten.');
      alert('Unable to update: ' + e.message);
    }
  };
  saveButton.addEventListener('click', saveExisting, true);

  // Safeguard against generating a fresh draft on top of an opened existing project.
  // This is still possible, but must be intentional.
  const generate = [...document.querySelectorAll('button')].find(b => /Generate (caption|ad script|storyboard)/i.test(b.textContent));
  if (generate) generate.addEventListener('click', e => {
    if (!confirm('Generate a new draft? This replaces the text currently in the editor. Your saved version will stay unchanged until you tap Update.')) {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);
})();
