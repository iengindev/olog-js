export type Paint = (s: string) => string

const identity: Paint = (text: string) => text

export const CreateStyler = (enabled: boolean) => {
  const sgr = (open: string, close: string): Paint => enabled ? (text: string) => ['\x1b', '[', open, 'm', text, '\x1b', '[', close, 'm'].join('') : identity

  return {
    bold: sgr('1', '22'),
    dim: sgr('2', '22'),
    italic: sgr('3', '23'),
    underline: sgr('4', '24'),
    fg: (color: number): Paint => sgr(['38;5;', color].join(''), '39'),
    bg: (color: number): Paint => sgr(['48;5;', color].join(''), '49'),
  }
}

export type Styler = ReturnType<typeof CreateStyler>
