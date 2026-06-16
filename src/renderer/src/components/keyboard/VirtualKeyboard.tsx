interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void
  testedKeys: Set<string>
}

const rows = [
  ['Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
  ['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
  ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'],
  ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
  ['Ctrl', 'Win', 'Alt', ' ', 'Alt', 'Win', 'Fn', 'Ctrl'],
]

const keyWidths: Record<string, string> = {
  Backspace: 'w-20',
  Tab: 'w-16',
  Caps: 'w-18',
  Enter: 'w-20',
  Shift: 'w-24',
  ' ': 'w-72',
  Ctrl: 'w-14',
  Win: 'w-14',
  Alt: 'w-14',
  Fn: 'w-14',
  Esc: 'w-12',
}

const wideKeys = ['Backspace', 'Tab', 'Caps', 'Enter', 'Shift', ' ']

export function VirtualKeyboard({ onKeyPress, testedKeys }: VirtualKeyboardProps) {
  const handlePointerDown = (key: string, e: React.PointerEvent) => {
    e.preventDefault()
    onKeyPress(key)
  }

  return (
    <div className="select-none">
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-1 mb-1 justify-center">
          {row.map((key) => {
            const w = keyWidths[key] || (wideKeys.includes(key) ? 'w-16' : 'w-12')
            const pressed = testedKeys.has(key)
            const isSpace = key === ' '

            return (
              <button
                key={key}
                onPointerDown={(e) => handlePointerDown(key, e)}
                className={`
                  ${w} h-12 rounded-lg text-xs font-medium border border-neutral-200
                  flex items-center justify-center
                  transition-all duration-100 select-none
                  ${pressed
                    ? 'bg-success text-white border-success shadow-sm scale-95'
                    : 'bg-white text-primary-800 hover:bg-primary-50 hover:border-primary-200'
                  }
                  ${isSpace ? 'text-transparent' : ''}
                `}
              >
                {key === ' ' ? 'SPACE' : key}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
