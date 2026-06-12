import LoginForm from '@/components/LoginForm'

export const metadata = { robots: { index: false, follow: false } }

export default function LoginPage() {
  return <LoginForm teamId={process.env.TEAM_ID ?? '19'} />
}
