import { useCallback, useEffect, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
  disabled?: boolean;
}

interface EditorButtonProps {
  label: string;
  icon: string;
  onClick: () => void;
  italic?: boolean;
  underline?: boolean;
  disabled?: boolean;
}

const EditorButton = ({ label, icon, onClick, italic, underline, disabled }: EditorButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    disabled={disabled}
    className={`rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary ${disabled ? 'cursor-not-allowed opacity-60 hover:border-slate-200 hover:text-slate-400' : ''}`}
  >
    <span className={italic ? 'italic' : underline ? 'underline' : undefined}>{icon}</span>
  </button>
);

const RichTextEditor = ({ value, onChange, minHeight = 240, disabled = false }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '<p><br></p>';
    }
  }, [value]);

  const exec = useCallback(
    (command: string, argument?: string) => {
      if (disabled) {
        return;
      }
      editorRef.current?.focus();
      document.execCommand(command, false, argument);
      onChange(editorRef.current?.innerHTML ?? '');
    },
    [disabled, onChange]
  );

  const handleInput = useCallback(() => {
    if (disabled) {
      return;
    }
    onChange(editorRef.current?.innerHTML ?? '');
  }, [disabled, onChange]);

  const handleInsertLink = () => {
    if (disabled) {
      return;
    }
    const url = window.prompt('Enter link URL');
    if (url) {
      exec('createLink', url);
    }
  };

  const handleInsertImage = () => {
    if (disabled) {
      return;
    }
    const url = window.prompt('Enter image URL');
    if (url) {
      exec('insertImage', url);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <EditorButton label="Bold" onClick={() => exec('bold')} icon="B" disabled={disabled} />
        <EditorButton label="Italic" onClick={() => exec('italic')} icon="I" italic disabled={disabled} />
        <EditorButton label="Underline" onClick={() => exec('underline')} icon="U" underline disabled={disabled} />
        <EditorButton label="Heading" onClick={() => exec('formatBlock', 'h2')} icon="H2" disabled={disabled} />
        <EditorButton label="Paragraph" onClick={() => exec('formatBlock', 'p')} icon="P" disabled={disabled} />
        <EditorButton label="Bullet list" onClick={() => exec('insertUnorderedList')} icon="•" disabled={disabled} />
        <EditorButton label="Numbered list" onClick={() => exec('insertOrderedList')} icon="1." disabled={disabled} />
        <EditorButton label="Quote" onClick={() => exec('formatBlock', 'blockquote')} icon="❝" disabled={disabled} />
        <EditorButton label="Link" onClick={handleInsertLink} icon="🔗" disabled={disabled} />
        <EditorButton label="Image" onClick={handleInsertImage} icon="🖼️" disabled={disabled} />
        <EditorButton label="Clear formatting" onClick={() => exec('removeFormat')} icon="⌫" disabled={disabled} />
      </div>
      <div
        ref={editorRef}
        className={`w-full overflow-auto px-4 py-3 text-sm leading-relaxed focus:outline-none ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : 'bg-white text-slate-700'}`}
        style={{ minHeight }}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
      />
    </div>
  );
};

export default RichTextEditor;
