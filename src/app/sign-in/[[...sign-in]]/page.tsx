import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center">
      <SignIn />
    </div>
  )
}
