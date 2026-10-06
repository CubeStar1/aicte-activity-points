'use client'

import React, { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v3'
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa6'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { resetPassword } from '@/actions/auth'
import { cn } from '@/lib/utils'

const EmailSchema = z.object({
  email: z.string().email({
    message: 'Invalid Email Address',
  }),
})

const ResetSchema = z
  .object({
    otp: z.string().length(6, {
      message: 'Enter the 6-digit code',
    }),
    password: z.string().min(6, {
      message: 'Password is too short',
    }),
    'confirm-pass': z.string(),
  })
  .refine((data) => data['confirm-pass'] === data.password, {
    message: "Password does't match",
    path: ['confirm-pass'],
  })

const sendResetCode = async (email: string) => {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return (await res.json()) as { error: string | null; code?: string }
}

export default function ForgotPassword() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME!
  const appIcon = process.env.NEXT_PUBLIC_APP_ICON!
  const [email, setEmail] = useState<string | null>(null)

  return (
    <div className="w-full sm:w-[26rem] shadow sm:p-5  border dark:border-zinc-800 rounded-md">
      <div className="p-5 space-y-5">
        <div className="text-center space-y-3">
          <Image
            src={appIcon}
            alt={`${appName} Logo`}
            width={50}
            height={50}
            className=" rounded-full mx-auto"
          />
          <h1 className="font-bold">Reset your password</h1>
          <p className="text-sm">
            {email ? (
              <>
                We&apos;ve sent a 6-digit code to <span className="font-bold">{email}</span>.{' '}
                <button
                  type="button"
                  className="text-blue-400 hover:underline"
                  onClick={() => setEmail(null)}
                >
                  Change email
                </button>
              </>
            ) : (
              'Enter your account email and we’ll send you a code to set a new password.'
            )}
          </p>
        </div>
        {email ? (
          <ResetForm email={email} />
        ) : (
          <EmailForm onSent={setEmail} />
        )}
        <div className="text-center text-sm">
          <Link href="/signin" className="text-blue-400">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

function EmailForm({ onSent }: { onSent: (email: string) => void }) {
  const [isPending, startTransition] = useTransition()
  const form = useForm<z.infer<typeof EmailSchema>>({
    resolver: zodResolver(EmailSchema),
    defaultValues: {
      email: '',
    },
  })

  function onSubmit(data: z.infer<typeof EmailSchema>) {
    if (!isPending) {
      startTransition(async () => {
        const { error, code } = await sendResetCode(data.email)
        if (code === 'user_not_found') {
          form.setError('email', { message: error ?? undefined })
        } else if (error) {
          toast.error(error)
        } else {
          onSent(data.email)
        }
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className=" font-semibold  test-sm">Email Address</FormLabel>
              <FormControl>
                <Input className="h-8" placeholder="example@gmail.com" type="email" {...field} />
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full h-8 bg-indigo-500 hover:bg-indigo-600 transition-all text-white flex items-center gap-2"
        >
          <AiOutlineLoading3Quarters className={cn(!isPending ? 'hidden' : 'block animate-spin')} />
          Send code
        </Button>
      </form>
    </Form>
  )
}

function ResetForm({ email }: { email: string }) {
  const [passwordReveal, setPasswordReveal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isSendAgain, startSendAgain] = useTransition()
  const router = useRouter()
  const form = useForm<z.infer<typeof ResetSchema>>({
    resolver: zodResolver(ResetSchema),
    defaultValues: {
      otp: '',
      password: '',
      'confirm-pass': '',
    },
  })
  const inputOptClass = cn({
    ' border-red-500': !!form.formState.errors.otp,
  })

  function sendAgain() {
    if (!isSendAgain) {
      startSendAgain(async () => {
        const { error } = await sendResetCode(email)
        if (error) {
          toast.error('Fail to resend email')
        } else {
          form.setValue('otp', '')
          toast.success('Please check your email.')
        }
      })
    }
  }

  function onSubmit(data: z.infer<typeof ResetSchema>) {
    if (!isPending) {
      startTransition(async () => {
        const { error, codeUsed } = await resetPassword({
          email,
          otp: data.otp,
          password: data.password,
        })
        if (!error) {
          toast.success('Password updated')
          router.push('/')
          router.refresh()
          return
        }
        if (codeUsed) {
          toast.error(`${error} Request a new code to try again.`)
          form.setValue('otp', '')
        } else {
          form.setError('otp', { message: error })
        }
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="otp"
          render={({ field }) => (
            <FormItem className="flex flex-col items-center">
              <FormLabel className="text-sm font-semibold">Verification Code</FormLabel>
              <FormControl>
                <InputOTP pattern={REGEXP_ONLY_DIGITS} maxLength={6} {...field}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className={inputOptClass} />
                    <InputOTPSlot index={1} className={inputOptClass} />
                    <InputOTPSlot index={2} className={inputOptClass} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className={inputOptClass} />
                    <InputOTPSlot index={4} className={inputOptClass} />
                    <InputOTPSlot index={5} className={inputOptClass} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">New Password</FormLabel>
              <FormControl>
                <div className=" relative">
                  <Input
                    className="h-8"
                    type={passwordReveal ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...field}
                  />
                  <div
                    className="absolute right-2 top-[30%] cursor-pointer group"
                    onClick={() => setPasswordReveal(!passwordReveal)}
                  >
                    {passwordReveal ? (
                      <FaRegEye className=" group-hover:scale-105 transition-all" />
                    ) : (
                      <FaRegEyeSlash className=" group-hover:scale-105 transition-all" />
                    )}
                  </div>
                </div>
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm-pass"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">Confirm Password</FormLabel>
              <FormControl>
                <Input
                  className="h-8"
                  type={passwordReveal ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full h-8 bg-indigo-500 hover:bg-indigo-600 transition-all text-white flex items-center gap-2"
        >
          <AiOutlineLoading3Quarters className={cn(!isPending ? 'hidden' : 'block animate-spin')} />
          Update password
        </Button>
      </form>
      <p className="text-sm text-center">
        {"Didn't get the code? "}
        <button
          type="button"
          className="text-blue-400 hover:underline inline-flex items-center gap-2"
          onClick={sendAgain}
        >
          <AiOutlineLoading3Quarters className={`${!isSendAgain ? 'hidden' : 'block animate-spin'}`} />
          Resend
        </button>
      </p>
    </Form>
  )
}
