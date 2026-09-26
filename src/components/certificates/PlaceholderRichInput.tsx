// FILE: src/components/certificates/PlaceholderRichInput.tsx
//
// A contentEditable field for composing certificate wording that contains
// {{token}} placeholders. Rather than showing the raw "{{full_name}}"
// syntax — which non-technical staff read as code, not a fill-in-the-blank
// — each placeholder renders as a small removable chip (e.g. "Full Name ×")
// inline in the sentence. Nothing about storage or the PDF renderer
// changes: `onChange` still emits a plain string like
// "This is to certify that {{full_name}}, ..." — TEMPLATE_PLACEHOLDERS'
// tokens are just displayed differently while editing.
//
// This is intentionally uncontrolled after mount (like a plain
// `defaultValue`, not a `value`): the parent page already remounts this
// whole editor via a React `key` whenever the template switches or is
// saved/reset (see certificates/templates/page.tsx), so there's no case
// where the canonical string needs to be pushed back into the DOM mid-edit
// — doing that on every keystroke is what causes cursor-jumping bugs in
// contentEditable inputs.
"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { TEMPLATE_PLACEHOLDERS } from "@/lib/mock/certificateTemplates";

export interface PlaceholderRichInputHandle {
  /** Insert a placeholder chip for `token` (bare, no braces) at the last
   * known cursor position in this field, or at the end if the field has
   * never been focused yet. */
  insertToken: (token: string) => void;
}

interface PlaceholderRichInputProps {
  initialValue: string;
  onChange: (templateString: string) => void;
  onFocus?: () => void;
  rows?: number;
  className?: string;
  placeholder?: string;
  /** false for single-line fields (e.g. Title) — Enter is swallowed instead
   * of inserting a line break. Defaults to true. */
  multiline?: boolean;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function chipLabelFor(token: string): string {
  return TEMPLATE_PLACEHOLDERS.find((p) => p.token === `{{${token}}}`)?.label ?? token;
}

// Renders the stored plain string (with {{token}} markers) into the initial
// HTML for the editable div, turning each token into a chip.
function buildHtmlFromTemplate(text: string): string {
  const parts = text.split(/(\{\{\w+\}\})/g);
  return parts
    .map((part) => {
      const m = part.match(/^\{\{(\w+)\}\}$/);
      if (m) return chipHtml(m[1]);
      return escapeHtml(part).replace(/\n/g, "<br>");
    })
    .join("");
}

function chipHtml(token: string): string {
  const label = escapeHtml(chipLabelFor(token));
  return (
    `<span contenteditable="false" data-token="${token}" title="{{${token}}} — double-click to change, × to remove" ` +
    `class="inline-flex items-center gap-1 mx-0.5 align-baseline select-none rounded-md ` +
    `bg-[#EBF3FF] dark:bg-blue-500/15 px-2 py-0.5 text-[12px] font-semibold ` +
    `text-[#1D4ED8] dark:text-[#93C5FD] cursor-pointer">` +
    `${label}` +
    `<button type="button" data-chip-remove="1" aria-label="Remove ${label} placeholder" ` +
    `class="ml-0.5 rounded-full px-1 leading-none text-[#1D4ED8]/60 hover:text-[#1D4ED8] ` +
    `hover:bg-blue-500/10 dark:text-[#93C5FD]/60 dark:hover:text-[#93C5FD]">×</button>` +
    `</span>`
  );
}

function buildChipNode(token: string): HTMLElement {
  const tmp = document.createElement("div");
  tmp.innerHTML = chipHtml(token);
  return tmp.firstElementChild as HTMLElement;
}

const SWAP_MENU_ID = "tpl-chip-swap-menu";

// Floating list of alternate placeholders, positioned under the
// double-clicked chip. Lives in document.body rather than inside the
// contentEditable field so it's never mistaken for editable content.
function openSwapMenu(chip: HTMLElement, onPick: (token: string) => void) {
  closeSwapMenu();

  const currentToken = chip.dataset.token;
  const rect = chip.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.id = SWAP_MENU_ID;
  menu.setAttribute(
    "class",
    "fixed z-50 max-h-64 w-56 overflow-auto rounded-lg border border-[#E9EAEC] dark:border-[#262626] " +
      "bg-white dark:bg-[#1F1F1F] p-1 shadow-lg"
  );
  menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
  menu.style.left = `${rect.left + window.scrollX}px`;

  TEMPLATE_PLACEHOLDERS.forEach((p) => {
    const bareToken = p.token.replace(/[{}]/g, "");
    const item = document.createElement("button");
    item.type = "button";
    item.setAttribute(
      "class",
      "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] " +
        (bareToken === currentToken
          ? "bg-[#EBF3FF] dark:bg-blue-500/15 font-semibold text-[#1D4ED8] dark:text-[#93C5FD]"
          : "text-[#1F2937] dark:text-white hover:bg-[#F4F5F7] dark:hover:bg-[#262626]")
    );
    item.innerHTML =
      `<span>${escapeHtml(p.label)}</span>` +
      `<span class="font-mono text-[10px] text-[#9CA3AF] dark:text-[#6B7280]">${escapeHtml(p.token)}</span>`;
    item.addEventListener("mousedown", (ev) => {
      // mousedown (not click) so this fires before the editor's blur/click
      // handling can interfere.
      ev.preventDefault();
      onPick(bareToken);
      closeSwapMenu();
    });
    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  // Close on outside click or Escape.
  const onDocMouseDown = (ev: MouseEvent) => {
    if (!menu.contains(ev.target as Node)) closeSwapMenu();
  };
  const onKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") closeSwapMenu();
  };
  // Deferred so the same click that opened the menu doesn't immediately close it.
  setTimeout(() => {
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
  }, 0);
  menu.dataset.cleanup = "1";
  (menu as any)._cleanup = () => {
    document.removeEventListener("mousedown", onDocMouseDown);
    document.removeEventListener("keydown", onKeyDown);
  };
}

function closeSwapMenu() {
  const existing = document.getElementById(SWAP_MENU_ID) as (HTMLElement & { _cleanup?: () => void }) | null;
  if (existing) {
    existing._cleanup?.();
    existing.remove();
  }
}

// Walks the edited DOM back into the plain {{token}} string that gets
// saved and sent through renderTemplate() for the live preview / PDF.
function serializeToTemplate(root: HTMLElement): string {
  let out = "";
  function walk(node: ChildNode) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.dataset.token) {
      out += `{{${el.dataset.token}}}`;
      return; // don't descend into the chip's label/remove-button children
    }
    if (el.tagName === "BR") {
      out += "\n";
      return;
    }
    const isBlock = el.tagName === "DIV" || el.tagName === "P";
    if (isBlock && out.length > 0 && !out.endsWith("\n")) out += "\n";
    el.childNodes.forEach(walk);
  }
  root.childNodes.forEach(walk);
  return out;
}

const PlaceholderRichInput = forwardRef<PlaceholderRichInputHandle, PlaceholderRichInputProps>(
  function PlaceholderRichInput(
    { initialValue, onChange, onFocus, rows = 6, className, placeholder, multiline = true },
    ref
  ) {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const savedRangeRef = useRef<Range | null>(null);
    const initialValueRef = useRef(initialValue); // snapshot — see file header

    const setEditorRef = useCallback((node: HTMLDivElement | null) => {
      editorRef.current = node;
      if (node && !node.dataset.initialized) {
        node.innerHTML = buildHtmlFromTemplate(initialValueRef.current);
        node.dataset.initialized = "1";
      }
    }, []);

    function emitChange() {
      if (editorRef.current) onChange(serializeToTemplate(editorRef.current));
    }

    function saveSelection() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
    }

    useImperativeHandle(ref, () => ({
      insertToken(token: string) {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();

        const sel = window.getSelection();
        let range = savedRangeRef.current;
        if (!range || !editor.contains(range.startContainer)) {
          range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false); // no prior cursor in this field — insert at the end
        }
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }

        range.deleteContents();
        const chip = buildChipNode(token);
        range.insertNode(chip);
        range.setStartAfter(chip);
        range.setEndAfter(chip);
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        savedRangeRef.current = range.cloneRange();
        emitChange();
      },
    }));

    function handleClick(e: React.MouseEvent<HTMLDivElement>) {
      const target = e.target as HTMLElement;
      const removeBtn = target.closest('[data-chip-remove]');
      if (removeBtn) {
        e.preventDefault();
        removeBtn.closest('[data-token]')?.remove();
        emitChange();
      }
    }

    function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
      const target = e.target as HTMLElement;
      const chip = target.closest('[data-token]') as HTMLElement | null;
      if (!chip || !editorRef.current?.contains(chip)) return;
      e.preventDefault();
      openSwapMenu(chip, (newToken) => {
        const replacement = buildChipNode(newToken);
        chip.replaceWith(replacement);
        emitChange();
      });
    }

    // Make sure a menu opened from this field doesn't linger if the field
    // unmounts (e.g. switching certificate type) while it's open.
    useEffect(() => {
      return () => closeSwapMenu();
    }, []);

    function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (multiline) {
          // Force a plain <br> instead of letting the browser split into a
          // new <div>/<p> block — keeps serialization simple and
          // consistent across browsers.
          document.execCommand("insertLineBreak");
          emitChange();
        }
        // Single-line fields (e.g. Title) just swallow Enter — no line
        // break, matching how a plain <input> behaves.
      }
    }

    function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
      // Strip any rich formatting from pasted content (e.g. from Word) —
      // this field should only ever hold plain wording plus chips.
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      emitChange();
    }

    return (
      <div
        ref={setEditorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitChange}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={onFocus}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onBlur={saveSelection}
        style={{ minHeight: `${rows * 1.6}em` }}
        className={`${className ?? ""} empty:before:content-[attr(data-placeholder)] empty:before:text-[#9CA3AF] dark:empty:before:text-[#6B7280]`}
      />
    );
  }
);

export default PlaceholderRichInput;