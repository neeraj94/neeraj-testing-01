import { useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react';

export interface TagsInputProps {
  id?: string;
  name?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  className?: string;
  ariaDescribedBy?: string;
}

const normaliseTag = (tag: string) => tag.trim();

const TagsInput = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  disabled = false,
  maxTags,
  className = '',
  ariaDescribedBy
}: TagsInputProps) => {
  const [draft, setDraft] = useState('');

  const emit = (next: string[]) => {
    onChange(next);
  };

  const addTag = (raw: string) => {
    if (disabled) {
      return;
    }
    const candidate = normaliseTag(raw);
    if (!candidate) {
      return;
    }
    const lowerCandidate = candidate.toLowerCase();
    const exists = value.some((entry) => entry.toLowerCase() === lowerCandidate);
    if (exists) {
      setDraft('');
      return;
    }
    if (maxTags && value.length >= maxTags) {
      setDraft('');
      return;
    }
    emit([...value, candidate]);
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      if (draft.trim()) {
        event.preventDefault();
        addTag(draft);
      }
      return;
    }
    if (event.key === 'Backspace' && !draft && value.length && !disabled) {
      event.preventDefault();
      emit(value.slice(0, -1));
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (event.relatedTarget instanceof HTMLElement && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    if (draft.trim()) {
      addTag(draft);
    }
  };

  const removeTag = (index: number) => {
    if (disabled) {
      return;
    }
    emit(value.filter((_, idx) => idx !== index));
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${className}`.trim()}
    >
      {value.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="text-primary/70 transition hover:text-primary"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          )}
        </span>
      ))}
      <input
        id={id}
        name={name}
        value={draft}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={value.length ? '' : placeholder}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
        className="flex-1 min-w-[6rem] border-none bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
      />
    </div>
  );
};

export default TagsInput;
