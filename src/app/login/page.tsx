import { OUR_TEAM_ID } from '@/lib/hockeytech'
import LoginForm from '@/components/LoginForm'

export const metadata = { robots: { index: false, follow: false } }

export default function LoginPage() {
  return <LoginForm teamId={OUR_TEAM_ID} />
}
