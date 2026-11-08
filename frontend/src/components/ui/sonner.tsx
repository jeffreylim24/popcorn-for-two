import { Toaster as Sonner, type ToasterProps } from 'sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react'

/**
 * shadcn's Sonner wrapper, edited: the theme is pinned to light (the app has
 * no dark mode) instead of following the OS through `next-themes`.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      position="top-center"
      style={
        {
          '--normal-bg': 'var(--card)',
          '--normal-text': 'var(--card-foreground)',
          '--normal-border':
            'color-mix(in oklch, var(--primary) 30%, transparent)',
          '--border-radius': 'var(--radius-2xl)',
        } as React.CSSProperties
      }
      toastOptions={{
        // `!` (Tailwind important): Sonner's own `[data-sonner-toast]` rules win otherwise.
        classNames: {
          toast:
            'cn-toast border-2! shadow-lg! font-heading! text-base! gap-3!',
          icon: 'text-primary!',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
