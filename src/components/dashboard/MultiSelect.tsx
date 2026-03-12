import { useEffect, useRef } from 'react'
import { ChevronDown, X } from 'lucide-react'

type MultiSelectProps = {
  label: string;
  selected: Set<string>;
  options: string[];
  onChange: (next: Set<string>) => void;
  renderOption?: (value: string) => React.ReactNode;
  width?: string;
  disabled?: boolean;
};

export default function MultiSelect({ label, selected, options, onChange, renderOption, width = 'w-40', disabled = false }: MultiSelectProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(next)
  }

  function clear() {
    onChange(new Set())
    if (detailsRef.current) detailsRef.current.open = false
  }

  if (disabled) {
    return (
      <div
        className={`flex h-8 ${width} items-center justify-between rounded-md border bg-muted/50 px-2 text-xs opacity-50 cursor-not-allowed`}
      >
        <span className='truncate text-muted-foreground'>{label}</span>
        <ChevronDown className='h-3 w-3 shrink-0 text-muted-foreground' />
      </div>
    )
  }

  return (
    <details ref={detailsRef} className='relative'>
      <summary
        className={`flex h-8 ${width} cursor-pointer items-center justify-between rounded-md border bg-background px-2 text-xs outline-none list-none`}
      >
        <span className='truncate'>
          {selected.size === 0 ? label : `${label} (${selected.size})`}
        </span>
        <ChevronDown className='h-3 w-3 shrink-0 text-muted-foreground' />
      </summary>
      <div className='absolute left-0 top-9 z-50 min-w-full rounded-md border bg-popover p-1 shadow-md'>
        {selected.size > 0 && (
          <button
            type='button'
            onClick={clear}
            className='mb-1 flex w-full items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent'
          >
            <X className='h-3 w-3' />
            Clear
          </button>
        )}
        {options.map((opt) => (
          <label
            key={opt}
            className='flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent'
          >
            <input
              type='checkbox'
              checked={selected.has(opt)}
              onChange={() => toggle(opt)}
              className='accent-primary'
            />
            {renderOption ? renderOption(opt) : opt}
          </label>
        ))}
      </div>
    </details>
  )
}
