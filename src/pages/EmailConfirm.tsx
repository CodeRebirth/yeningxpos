// src/pages/EmailConfirm.tsx
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { type EmailOtpType } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client';


export default function EmailConfirm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const verifyToken = async () => {
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type') as EmailOtpType | null;

      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type,
        })

        if (!error) {
          navigate('/business-setup')
        } else {
          navigate('/unauthorized') // You can customize this
        }
      } else {
        navigate('/unauthorized')
      }
    }

    verifyToken()
  }, [searchParams, navigate])

return (
    <div className="h-screen flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600">Verifying your email...</p>
    </div>
)
}
