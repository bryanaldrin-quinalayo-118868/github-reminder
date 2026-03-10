import { useState } from 'react'
import { ExternalLink, Eye, EyeOff, GitPullRequest, Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { storeToken, fetchAuthenticatedUser } from '@/services/github-auth'

const PAT_URL = 'https://github.com/settings/tokens/new?scopes=repo&description=PR+Reminder'

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className='flex min-h-screen items-center justify-center bg-background p-4'>
      <div className='flex w-full max-w-md flex-col gap-6 rounded-xl border bg-card p-8 shadow-lg'>
        {/* Header */}
        <div className='flex flex-col items-center gap-3'>
          <div className='flex h-14 w-14 items-center justify-center rounded-xl bg-primary'>
            <GitPullRequest className='h-7 w-7 text-primary-foreground' />
          </div>
          <div className='text-center'>
            <h1 className='text-xl font-semibold'>PR Reminder</h1>
            <p className='mt-1 text-sm text-muted-foreground'>
              Enter your GitHub Personal Access Token to get started
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className='rounded-lg border bg-muted/50 p-4'>
          <p className='text-sm font-medium'>How to create a token:</p>
          <ol className='mt-2 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground'>
            <li>Click the button below to open GitHub token settings</li>
            <li>Set expiration (90 days recommended)</li>
            <li>Make sure <span className='font-medium text-foreground'>repo</span> scope is checked</li>
            <li>Click <span className='font-medium text-foreground'>Generate token</span></li>
            <li>Copy the token and paste it below</li>
          </ol>
          <a
            href={PAT_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline'
          >
            <ExternalLink className='h-3.5 w-3.5' />
            Open GitHub token settings
          </a>
        </div>

        {/* SSO Authorization */}
        <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-4'>
          <p className='text-sm font-medium'>
            ⚠️ Important: Authorize SSO for nelnet-nbs
          </p>
          <p className='mt-1.5 text-sm text-muted-foreground'>
            After creating your token, you <span className='font-medium text-foreground'>must</span> authorize it for the <span className='font-medium text-foreground'>nelnet-nbs</span> organization, or API requests will be denied.
          </p>
          <ol className='mt-2 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground'>
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
            <li>Find your token and click <span className='font-medium text-foreground'>Configure SSO</span> next to it</li>
            <li>Click <span className='font-medium text-foreground'>Authorize</span> next to <span className='font-medium text-foreground'>nelnet-nbs</span></li>
          </ol>
          <a
            href='https://github.com/settings/tokens'
            target='_blank'
            rel='noopener noreferrer'
            className='mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline'
          >
            <ExternalLink className='h-3.5 w-3.5' />
            Open GitHub token settings
          </a>
        </div>

        {/* Token form */}
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='pat-input' className='text-sm font-medium'>Personal Access Token</Label>
            <div className='relative'>
              <Input
                id='pat-input'
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder='ghp_xxxxxxxxxxxxxxxxxxxx'
                className='pr-10 font-mono text-sm'
                autoComplete='off'
                spellCheck={false}
              />
              <button
                type='button'
                className='absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground'
                onClick={() => setShowToken((s) => !s)}
                tabIndex={-1}
              >
                {showToken ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
          </div>

          {error && <p className='text-sm text-red-500'>{error}</p>}

          <Button type='submit' className='w-full cursor-pointer gap-2' disabled={!token.trim() || loading}>
            {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <LogIn className='h-4 w-4' />}
            {loading ? 'Verifying...' : 'Sign in'}
          </Button>
        </form>

        <p className='text-center text-xs text-muted-foreground'>
          Your token is stored locally in your browser and never sent to any server other than GitHub.
        </p>
      </div>
    </div>
  )
}
