import type { ReactNode } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'green' | 'ghost-dark' | 'ghost'
  icon?: ReactNode
}

export function Button({ variant = 'green', className = '', icon, children, ...props }: ButtonProps) {
  const withIcon = icon != null
  return (
    <button className={`btn btn-${variant}${withIcon ? ' btn-with-icon' : ''} ${className}`.trim()} {...props}>
      {icon}
      {children}
    </button>
  )
}
