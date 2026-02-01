/**
 * OpenClaw Preview Annotations
 * 
 * Inject into any HTML preview to enable inline feedback.
 * Pure client-side - no backend required.
 * Works on desktop and mobile (iOS Safari, etc.)
 * 
 * Usage: Include this script at the end of your HTML body.
 */

(function() {
  'use strict';

  // Generate or retrieve preview ID
  const PREVIEW_ID = new URLSearchParams(window.location.search).get('preview_id') 
    || window.location.pathname.split('/').pop().replace('.html', '')
    || 'preview_' + Date.now();
  
  const STORAGE_KEY = `openclaw_annotations_${PREVIEW_ID}`;
  
  // State
  let annotations = [];
  let annotationCounter = 0;
  let currentSelection = null;

  // Load existing annotations
  function loadAnnotations() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        annotations = JSON.parse(stored);
        annotationCounter = annotations.length;
      }
    } catch (e) {
      console.warn('Failed to load annotations:', e);
    }
  }

  // Save annotations
  function saveAnnotations() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
    } catch (e) {
      console.warn('Failed to save annotations:', e);
    }
  }

  // Get text context around selection
  function getTextContext(text, fullText, chars = 80) {
    const startIdx = fullText.indexOf(text);
    if (startIdx === -1) return text;
    
    const contextStart = Math.max(0, startIdx - chars);
    const contextEnd = Math.min(fullText.length, startIdx + text.length + chars);
    
    let context = '';
    if (contextStart > 0) context += '...';
    context += fullText.slice(contextStart, contextEnd);
    if (contextEnd < fullText.length) context += '...';
    
    return context;
  }

  // Find the nearest heading above an element
  function findNearestHeading(element) {
    if (!element) return null;
    
    // Walk backwards through previous siblings and parents
    let node = element;
    while (node) {
      // Check previous siblings
      let sibling = node.previousElementSibling;
      while (sibling) {
        if (/^H[1-6]$/.test(sibling.tagName)) {
          return sibling.textContent.trim();
        }
        // Check inside sibling for headings (last one)
        const headings = sibling.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length > 0) {
          return headings[headings.length - 1].textContent.trim();
        }
        sibling = sibling.previousElementSibling;
      }
      node = node.parentElement;
    }
    return null;
  }

  // Get element location description
  function getElementLocation(element) {
    if (!element) return null;
    
    const parts = [];
    
    // Check if in a table
    const cell = element.closest('td, th');
    if (cell) {
      const row = cell.closest('tr');
      const table = cell.closest('table');
      if (row && table) {
        const rowIndex = Array.from(table.querySelectorAll('tr')).indexOf(row) + 1;
        const cellIndex = Array.from(row.children).indexOf(cell) + 1;
        const isHeader = cell.tagName === 'TH';
        parts.push(`Table Row ${rowIndex}, ${isHeader ? 'Header' : 'Column'} ${cellIndex}`);
      }
    }
    
    // Check if in a code block
    const codeBlock = element.closest('pre, code');
    if (codeBlock) {
      parts.push('Code block');
    }
    
    // Check if in a list
    const listItem = element.closest('li');
    if (listItem) {
      const list = listItem.closest('ul, ol');
      if (list) {
        const index = Array.from(list.children).indexOf(listItem) + 1;
        parts.push(`List item ${index}`);
      }
    }
    
    // Get nearest heading
    const heading = findNearestHeading(element);
    if (heading) {
      parts.push(`Section: "${heading}"`);
    }
    
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  // Get surrounding text for context
  function getSurroundingText(element, selectedText, chars = 40) {
    if (!element) return null;
    
    // Get the text content of the parent paragraph/cell/block
    const block = element.closest('p, td, th, li, pre, div, span') || element;
    const fullText = block.textContent || '';
    
    if (fullText.length <= selectedText.length + 20) {
      return null; // Not enough context to add
    }
    
    const idx = fullText.indexOf(selectedText);
    if (idx === -1) return null;
    
    const before = fullText.slice(Math.max(0, idx - chars), idx).trim();
    const after = fullText.slice(idx + selectedText.length, idx + selectedText.length + chars).trim();
    
    if (!before && !after) return null;
    
    let context = '';
    if (before) context += '...' + before + ' ';
    context += `**[${selectedText}]**`;
    if (after) context += ' ' + after + '...';
    
    return context;
  }

  // Inject styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Annotation highlights in the document */
      .openclaw-highlight {
        background: rgba(253, 224, 71, 0.25);
        border-bottom: 2px solid rgba(253, 224, 71, 0.8);
        color: inherit;
        cursor: pointer;
        border-radius: 2px;
        transition: background 0.15s;
      }
      .openclaw-highlight:hover {
        background: rgba(253, 224, 71, 0.4);
      }

      /* Floating annotate button - appears when text is selected */
      .openclaw-annotate-btn {
        position: fixed;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 25px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        z-index: 10000;
        display: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        transition: transform 0.15s, box-shadow 0.15s;
        -webkit-tap-highlight-color: transparent;
      }
      .openclaw-annotate-btn:active {
        transform: scale(0.95);
      }
      .openclaw-annotate-btn.visible {
        display: block;
        animation: openclaw-pop 0.2s ease;
      }
      @keyframes openclaw-pop {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
      }

      /* Popover */
      .openclaw-popover {
        position: fixed;
        background: #1a1a2e;
        border: 1px solid #444;
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 10px 50px rgba(0,0,0,0.6);
        z-index: 10001;
        width: calc(100vw - 32px);
        max-width: 380px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #e0e0e0;
        display: none;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      }
      .openclaw-popover.visible {
        display: block;
        animation: openclaw-slide 0.25s ease;
      }
      @keyframes openclaw-slide {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      .openclaw-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: none;
      }
      .openclaw-overlay.visible {
        display: block;
      }
      .openclaw-popover-header {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        justify-content: center;
      }
      .openclaw-selected-text {
        background: #252525;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
        font-size: 14px;
        color: #aaa;
        max-height: 80px;
        overflow: hidden;
        border-left: 4px solid #6366f1;
        line-height: 1.5;
      }
      .openclaw-textarea {
        width: 100%;
        min-height: 100px;
        padding: 12px;
        border: 2px solid #444;
        border-radius: 10px;
        background: #252525;
        color: #e0e0e0;
        font-size: 16px;
        resize: none;
        font-family: inherit;
        -webkit-appearance: none;
      }
      .openclaw-textarea:focus {
        outline: none;
        border-color: #6366f1;
      }
      .openclaw-textarea::placeholder {
        color: #666;
      }
      .openclaw-popover-actions {
        display: flex;
        gap: 10px;
        margin-top: 12px;
      }
      .openclaw-btn {
        flex: 1;
        padding: 14px 20px;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        font-size: 15px;
        font-weight: 600;
        transition: all 0.15s;
        -webkit-tap-highlight-color: transparent;
      }
      .openclaw-btn:active {
        transform: scale(0.95);
      }
      .openclaw-btn-primary {
        background: #6366f1;
        color: white;
      }
      .openclaw-btn-secondary {
        background: #333;
        color: #ccc;
      }

      /* Floating toolbar - top right corner */
      .openclaw-toolbar {
        position: fixed;
        top: 16px;
        right: 16px;
        display: flex;
        gap: 8px;
        z-index: 9999;
      }
      .openclaw-toolbar-btn {
        padding: 10px 16px;
        border-radius: 20px;
        border: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
        -webkit-tap-highlight-color: transparent;
      }
      .openclaw-toolbar-btn:active {
        transform: scale(0.95);
      }
      .openclaw-send-btn {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
      }
      .openclaw-clear-btn {
        background: #333;
        color: #888;
        padding: 10px 12px;
      }
      .openclaw-count {
        background: rgba(255,255,255,0.2);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 12px;
      }

      /* Export modal */
      .openclaw-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        z-index: 10002;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .openclaw-modal.visible {
        display: flex;
      }
      .openclaw-modal-content {
        background: #1a1a2e;
        border-radius: 16px;
        padding: 20px;
        width: 100%;
        max-width: 500px;
        max-height: 80vh;
        overflow: auto;
        border: 1px solid #333;
      }
      .openclaw-modal h2 {
        margin: 0 0 16px;
        color: #fff;
        font-size: 1.2rem;
      }
      .openclaw-export-preview {
        background: #0d0d0d;
        border-radius: 10px;
        padding: 16px;
        font-family: 'SF Mono', Monaco, monospace;
        font-size: 12px;
        white-space: pre-wrap;
        max-height: 250px;
        overflow: auto;
        margin-bottom: 16px;
        border: 1px solid #333;
        line-height: 1.5;
      }
      .openclaw-modal-actions {
        display: flex;
        gap: 10px;
      }

      /* Toast */
      .openclaw-toast {
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a1a2e;
        border: 1px solid #333;
        padding: 14px 24px;
        border-radius: 10px;
        color: #e0e0e0;
        font-size: 15px;
        z-index: 10003;
        animation: openclaw-pop 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      /* Instructions hint */
      .openclaw-hint {
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(99, 102, 241, 0.9);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 9998;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
      }
      .openclaw-hint.visible {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  // Show toast notification
  function showToast(message, duration = 2000) {
    const existing = document.querySelector('.openclaw-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'openclaw-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }

  // Generate export text
  function generateExport() {
    if (annotations.length === 0) return 'No annotations yet.';

    const lines = [
      `## Preview Feedback`,
      `**Preview:** ${document.title || PREVIEW_ID}`,
      `**Date:** ${new Date().toLocaleString()}`,
      `**Annotations:** ${annotations.length}`,
      '',
      '---',
      ''
    ];

    annotations.forEach((ann, idx) => {
      lines.push(`### ${idx + 1}.`);
      
      // Add location context
      if (ann.location) {
        lines.push(`📍 ${ann.location}`);
      }
      lines.push('');
      
      // Show surrounding text if available, otherwise just the selection
      if (ann.surroundingText) {
        lines.push(ann.surroundingText);
      } else {
        lines.push(`> ${ann.selectedText}`);
      }
      lines.push('');
      
      if (ann.comment) {
        lines.push(ann.comment);
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    });

    return lines.join('\n');
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Apply highlight to current selection
  function applyHighlight(annotationId) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    
    try {
      const range = selection.getRangeAt(0);
      const highlight = document.createElement('mark');
      highlight.className = 'openclaw-highlight';
      highlight.dataset.annotationId = annotationId;
      range.surroundContents(highlight);
      selection.removeAllRanges();
      return true;
    } catch (e) {
      // surroundContents fails if selection crosses element boundaries
      console.warn('Could not apply highlight:', e);
      return false;
    }
  }

  // Remove highlight from DOM
  function removeHighlight(annotationId) {
    const highlight = document.querySelector(`.openclaw-highlight[data-annotation-id="${annotationId}"]`);
    if (highlight) {
      const parent = highlight.parentNode;
      while (highlight.firstChild) {
        parent.insertBefore(highlight.firstChild, highlight);
      }
      parent.removeChild(highlight);
    }
  }

  // Try to restore highlights on page load by finding text
  function restoreHighlights() {
    annotations.forEach(ann => {
      // Use fullText if available (not truncated), fall back to selectedText
      const searchText = ann.fullText || ann.selectedText;
      if (!searchText || searchText.length < 3) return;
      
      // Skip if already highlighted
      if (document.querySelector(`.openclaw-highlight[data-annotation-id="${ann.id}"]`)) return;

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      let found = false;
      while ((node = walker.nextNode()) && !found) {
        // Skip if inside toolbar/popover/etc
        if (node.parentElement.closest('.openclaw-toolbar, .openclaw-popover, .openclaw-modal, nav, footer')) continue;
        
        const idx = node.textContent.indexOf(searchText);
        if (idx !== -1) {
          // Check if parent is already a highlight
          if (node.parentElement.classList.contains('openclaw-highlight')) continue;
          
          try {
            const range = document.createRange();
            range.setStart(node, idx);
            range.setEnd(node, idx + searchText.length);
            
            const highlight = document.createElement('mark');
            highlight.className = 'openclaw-highlight';
            highlight.dataset.annotationId = ann.id;
            range.surroundContents(highlight);
            found = true;
            console.log('Restored highlight for annotation', ann.id, ':', searchText.slice(0, 30));
          } catch (e) {
            console.warn('Could not restore highlight for:', searchText.slice(0, 30), e.message);
          }
        }
      }
      
      if (!found) {
        console.warn('Could not find text to highlight:', searchText.slice(0, 50));
      }
    });
  }

  // Initialize
  function init() {
    injectStyles();
    loadAnnotations();
    
    // Restore highlights after a short delay (let page render)
    setTimeout(restoreHighlights, 100);

    // Create elements
    const annotateBtn = document.createElement('button');
    annotateBtn.className = 'openclaw-annotate-btn';
    annotateBtn.textContent = '✏️ Annotate';
    document.body.appendChild(annotateBtn);

    const overlay = document.createElement('div');
    overlay.className = 'openclaw-overlay';
    document.body.appendChild(overlay);

    const popover = document.createElement('div');
    popover.className = 'openclaw-popover';
    popover.innerHTML = `
      <div class="openclaw-selected-text"></div>
      <textarea class="openclaw-textarea" placeholder="Add a comment, question, or suggestion..."></textarea>
      <div class="openclaw-popover-actions">
        <button class="openclaw-btn openclaw-btn-secondary openclaw-cancel-btn">Cancel</button>
        <button class="openclaw-btn openclaw-btn-delete openclaw-delete-btn" style="display:none; background:#dc2626; color:white;">Delete</button>
        <button class="openclaw-btn openclaw-btn-primary openclaw-save-btn">Save</button>
      </div>
    `;
    document.body.appendChild(popover);

    const toolbar = document.createElement('div');
    toolbar.className = 'openclaw-toolbar';
    toolbar.innerHTML = `
      <button class="openclaw-toolbar-btn openclaw-clear-btn">✕</button>
      <button class="openclaw-toolbar-btn openclaw-send-btn">
        Finish
        <span class="openclaw-count">${annotations.length}</span>
      </button>
    `;
    document.body.appendChild(toolbar);

    const hint = document.createElement('div');
    hint.className = 'openclaw-hint';
    hint.textContent = 'Select text to annotate';
    document.body.appendChild(hint);

    // Show hint briefly on load
    setTimeout(() => hint.classList.add('visible'), 500);
    setTimeout(() => hint.classList.remove('visible'), 3000);

    let currentAnnotation = null;
    let hideButtonTimeout = null;

    // Update toolbar count
    function updateCount() {
      toolbar.querySelector('.openclaw-count').textContent = annotations.length;
    }

    // Check for text selection
    function checkSelection() {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text.length > 2 && text.length < 1000) {
        // Get the element containing the selection
        let element = null;
        let range = null;
        if (selection.rangeCount > 0) {
          range = selection.getRangeAt(0).cloneRange(); // Clone immediately!
          element = range.commonAncestorContainer;
          if (element.nodeType === Node.TEXT_NODE) {
            element = element.parentElement;
          }
        }
        
        currentSelection = {
          text: text,
          range: range, // Store the range here, not later
          element: element,
          location: getElementLocation(element),
          surroundingText: getSurroundingText(element, text)
        };
        
        // Position button near bottom of viewport (mobile-friendly)
        annotateBtn.style.bottom = '90px';
        annotateBtn.style.left = '50%';
        annotateBtn.style.transform = 'translateX(-50%)';
        annotateBtn.classList.add('visible');
        
        // Clear any pending hide
        if (hideButtonTimeout) {
          clearTimeout(hideButtonTimeout);
          hideButtonTimeout = null;
        }
      } else {
        // Delay hiding to allow tap on button
        if (!hideButtonTimeout) {
          hideButtonTimeout = setTimeout(() => {
            annotateBtn.classList.remove('visible');
            hideButtonTimeout = null;
          }, 300);
        }
      }
    }

    // Listen for selection changes (works on mobile!)
    document.addEventListener('selectionchange', checkSelection);

    let pendingHighlightRange = null;
    let editingAnnotation = null;

    // Annotate button click
    annotateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!currentSelection) return;
      
      // Use the range we stored earlier (selection may be gone by now on mobile)
      pendingHighlightRange = currentSelection.range;
      
      editingAnnotation = null;
      currentAnnotation = {
        id: ++annotationCounter,
        selectedText: currentSelection.text.length > 200 
          ? currentSelection.text.slice(0, 200) + '...' 
          : currentSelection.text,
        fullText: currentSelection.text,
        location: currentSelection.location,
        surroundingText: currentSelection.surroundingText,
        comment: '',
        createdAt: new Date().toISOString()
      };

      // Populate popover
      popover.querySelector('.openclaw-selected-text').textContent = currentAnnotation.selectedText;
      popover.querySelector('.openclaw-textarea').value = '';
      popover.querySelector('.openclaw-delete-btn').style.display = 'none'; // Hide delete for new

      // Show popover
      overlay.classList.add('visible');
      popover.classList.add('visible');
      annotateBtn.classList.remove('visible');
      
      // Clear selection
      window.getSelection().removeAllRanges();
    });
    
    // Click on existing highlight to edit
    document.addEventListener('click', (e) => {
      const highlight = e.target.closest('.openclaw-highlight');
      if (!highlight) return;
      
      const annId = parseInt(highlight.dataset.annotationId, 10);
      const ann = annotations.find(a => a.id === annId);
      if (!ann) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      editingAnnotation = ann;
      currentAnnotation = { ...ann };
      pendingHighlightRange = null; // Not a new annotation
      
      // Populate popover with existing values
      popover.querySelector('.openclaw-selected-text').textContent = ann.selectedText;
      popover.querySelector('.openclaw-textarea').value = ann.comment || '';
      popover.querySelector('.openclaw-delete-btn').style.display = 'block'; // Show delete for edit
      
      // Show popover
      overlay.classList.add('visible');
      popover.classList.add('visible');
      annotateBtn.classList.remove('visible');
    });

    // Reaction buttons
    // Save button
    popover.querySelector('.openclaw-save-btn').addEventListener('click', () => {
      currentAnnotation.comment = popover.querySelector('.openclaw-textarea').value.trim();
      
      if (!currentAnnotation.comment) {
        showToast('Add a comment');
        return;
      }

      if (editingAnnotation) {
        // Update existing annotation
        const idx = annotations.findIndex(a => a.id === editingAnnotation.id);
        if (idx >= 0) {
          annotations[idx] = currentAnnotation;
        }
      } else {
        // New annotation
        annotations.push(currentAnnotation);
        
        // Apply highlight if we have a range
        if (pendingHighlightRange) {
          try {
            const highlight = document.createElement('mark');
            highlight.className = 'openclaw-highlight';
            highlight.dataset.annotationId = currentAnnotation.id;
            pendingHighlightRange.surroundContents(highlight);
            console.log('Applied highlight directly for annotation', currentAnnotation.id);
          } catch (e) {
            console.warn('surroundContents failed, will try restore:', e.message);
            // If surroundContents fails (crosses elements), fall back to restore
            setTimeout(() => restoreHighlights(), 50);
          }
          pendingHighlightRange = null;
        } else {
          console.warn('No pending range, will try restore');
          setTimeout(() => restoreHighlights(), 50);
        }
      }
      
      saveAnnotations();
      updateCount();
      
      overlay.classList.remove('visible');
      popover.classList.remove('visible');
      showToast('✓ Annotation saved');
    });

    // Delete button (only shown when editing)
    popover.querySelector('.openclaw-delete-btn').addEventListener('click', () => {
      if (!editingAnnotation) return;
      
      // Remove from array
      annotations = annotations.filter(a => a.id !== editingAnnotation.id);
      
      // Remove highlight from DOM
      removeHighlight(editingAnnotation.id);
      
      saveAnnotations();
      updateCount();
      
      overlay.classList.remove('visible');
      popover.classList.remove('visible');
      showToast('Annotation deleted');
    });

    // Cancel button
    popover.querySelector('.openclaw-cancel-btn').addEventListener('click', () => {
      overlay.classList.remove('visible');
      popover.classList.remove('visible');
    });

    // Close on overlay tap
    overlay.addEventListener('click', () => {
      overlay.classList.remove('visible');
      popover.classList.remove('visible');
    });

    // Send button - show export modal
    toolbar.querySelector('.openclaw-send-btn').addEventListener('click', () => {
      if (annotations.length === 0) {
        showToast('No annotations to send');
        return;
      }

      const exportText = generateExport();
      
      const modal = document.createElement('div');
      modal.className = 'openclaw-modal visible';
      modal.innerHTML = `
        <div class="openclaw-modal-content">
          <h2>📤 Send Feedback</h2>
          <div class="openclaw-export-preview">${escapeHtml(exportText)}</div>
          <div class="openclaw-modal-actions">
            <button class="openclaw-btn openclaw-btn-secondary">Close</button>
            <button class="openclaw-btn openclaw-btn-primary">Copy to Clipboard</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const buttons = modal.querySelectorAll('.openclaw-btn');
      buttons[0].addEventListener('click', () => modal.remove());
      buttons[1].addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(exportText);
          showToast('✓ Copied! Paste in chat');
          setTimeout(() => modal.remove(), 1000);
        } catch (e) {
          // Fallback
          const textarea = document.createElement('textarea');
          textarea.value = exportText;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          textarea.remove();
          showToast('✓ Copied! Paste in chat');
          setTimeout(() => modal.remove(), 1000);
        }
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });
    });

    // Clear button
    toolbar.querySelector('.openclaw-clear-btn').addEventListener('click', () => {
      if (annotations.length === 0) {
        showToast('No annotations');
        return;
      }
      if (confirm('Clear all annotations?')) {
        annotations = [];
        saveAnnotations();
        updateCount();
        showToast('Cleared');
      }
    });

    console.log('🐾 OpenClaw Annotations loaded. Select text to annotate.');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
