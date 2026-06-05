import { useEffect, useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

const DISPLAY_SECONDS = 5

export function ReadCarefullyModal() {
  const [open, setOpen] = useState(true)
  const [remainingSeconds, setRemainingSeconds] = useState(DISPLAY_SECONDS)
  const [readyToClose, setReadyToClose] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          setReadyToClose(true)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [open])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !readyToClose) {
      return
    }

    setOpen(nextOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md rounded-[28px] border border-white/10 bg-slate-950/95 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.5)] backdrop-blur-xl">
        <AlertDialogHeader className="text-center sm:text-left">
          <AlertDialogTitle className="text-3xl font-semibold tracking-tight text-amber-300">
            Please Read Carefully
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            This website is newly developed, so you may notice reviews without bookings or client counts — these are genuine reviews from previous clients who took sessions before online booking was available.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-6 rounded-3xl border border-slate-800/80 bg-slate-900/90 px-4 py-4 text-center text-sm text-slate-200 shadow-sm shadow-slate-950/40">
          {readyToClose ? (
            <span className="font-medium text-slate-100">You may now close this message.</span>
          ) : (
            <span className="font-medium text-slate-100">Please wait {remainingSeconds} second{remainingSeconds === 1 ? "" : "s"}…</span>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400 sm:max-w-xs">
            {readyToClose
              ? "Tap I Understand to continue browsing."
              : "The button will appear once the countdown finishes."}
          </p>
          {readyToClose && (
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setOpen(false)}>
              I Understand
            </Button>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
