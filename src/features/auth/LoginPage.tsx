import { useState } from 'react'
import { ChevronDown, ExternalLink, Eye, EyeOff, GitPullRequest, Loader2, Lock, LogIn, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { storeToken, fetchAuthenticatedUser } from '@/services/github-auth'

const PAT_URL = 'https://github.com/settings/tokens/new?scopes=repo&description=PR+Reminder'

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showSso, setShowSso] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = token.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      storeToken(trimmed)
      const user = await fetchAuthenticatedUser(trimmed)
      toast.success(`Welcome, ${user.name ?? user.login}!`)
      onLogin()
    } catch {
      setError('Invalid token or unable to connect. Please check and try again.')
      setLoading(false)
    }
  }

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4'>
      {/* Background decoration */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute -top-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl' />
        <div className='absolute -bottom-1/4 -left-1/4 h-[500px] w-[500px] rounded-full bg-primary/3 blur-3xl' />
      </div>

      <div className='relative z-10 flex w-full max-w-[420px] flex-col gap-8 animate-scale-in'>
        {/* Brand header */}
        <div className='flex flex-col items-center gap-4'>
          <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg glow'>
            <GitPullRequest className='h-8 w-8 text-primary-foreground' />
          </div>
          <div className='text-center'>
            <h1 className='text-2xl font-bold tracking-tight'>PR Reminder</h1>
            <p className='mt-1.5 text-sm text-muted-foreground'>
              Track open pull requests across Daycare repos
            </p>
          </div>
        </div>

        {/* Card */}
        <div className='flex flex-col gap-5 rounded-2xl border border-border/60 bg-card p-6 shadow-xl'>
          {/* Token form */}
          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='pat-input' className='text-sm font-medium'>Personal Access Token</Label>
              <div className='relative'>
                <Input
                  id='pat-input'
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder='ghp_xxxxxxxxxxxxxxxxxxxx'
                  className='h-11 rounded-xl border-border/60 pr-10 font-mono text-sm transition-all focus:border-ring focus:ring-2 focus:ring-ring/20'
                  autoComplete='off'
                  spellCheck={false}
                />
                <button
                  type='button'
                  className='absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground'
                  onClick={() => setShowToken((s) => !s)}
                  tabIndex={-1}
                >
                  {showToken ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                </button>
              </div>
            </div>

            {error && (
              <p className='rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive animate-slide-up'>
                {error}
              </p>
            )}

            <Button
              type='submit'
              size='lg'
              className='w-full cursor-pointer gap-2 rounded-xl font-medium shadow-sm'
              disabled={!token.trim() || loading}
            >
              {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <LogIn className='h-4 w-4' />}
              {loading ? 'Verifying…' : 'Sign in with Token'}
            </Button>
          </form>

          {/* Expandable help sections */}
          <div className='flex flex-col gap-1'>
            {/* Create token accordion */}
            <button
              type='button'
              onClick={() => setShowInstructions((v) => !v)}
              className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-accent/60'
            >
              <Lock className='h-3.5 w-3.5 text-muted-foreground' />
              <span className='flex-1'>How to create a token</span>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', showInstructions && 'rotate-180')} />
            </button>
            {showInstructions && (
              <div className='rounded-xl bg-muted/40 p-3.5 animate-slide-down'>
                <ol className='list-inside list-decimal space-y-1.5 text-[13px] text-muted-foreground'>
                  <li>Click the link below to open GitHub token settings</li>
                  <li>Set expiration (90 days recommended)</li>
                  <li>Ensure <span className='font-medium text-foreground'>repo</span> scope is checked</li>
                  <li>Click <span className='font-medium text-foreground'>Generate token</span></li>
                  <li>Copy the token and paste it above</li>
                </ol>
                <a
                  href={PAT_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline'
                >
                  <ExternalLink className='h-3 w-3' />
                  Open GitHub token settings
                </a>
              </div>
            )}

            {/* SSO accordion */}
            <button
              type='button'
              onClick={() => setShowSso((v) => !v)}
              className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-accent/60'
            >
              <ShieldCheck className='h-3.5 w-3.5 text-amber-500' />
              <span className='flex-1'>Authorize SSO for nelnet-nbs</span>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', showSso && 'rotate-180')} />
            </button>
            {showSso && (
              <div className='rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 animate-slide-down'>
                <p className='text-[13px] text-muted-foreground'>
                  After creating your token, you <span className='font-medium text-foreground'>must</span> authorize it for the <span className='font-medium text-foreground'>nelnet-nbs</span> organization.
                </p>
                <ol className='mt-2 list-inside list-decimal space-y-1.5 text-[13px] text-muted-foreground'>
                  <li>
                    Go to{' '}
                    <a
                      href='https://github.com/settings/tokens'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='font-medium text-primary hover:underline'
                    >
                      GitHub → Settings → Tokens
                    </a>
                  </li>
                  <li>Find your token → click <span className='font-medium text-foreground'>Configure SSO</span></li>
                  <li>Click <span className='font-medium text-foreground'>Authorize</span> next to <span className='font-medium text-foreground'>nelnet-nbs</span></li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Privacy note */}
        <p className='text-center text-[11px] text-muted-foreground/70'>
          Your token is stored locally in your browser and never sent to any server other than GitHub.
        </p>
      </div>
    </div>
  )
}
