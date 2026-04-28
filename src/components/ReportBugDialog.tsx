import { useRef, useState } from 'react';
import { Bug, Copy, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  gatherManualReportData,
  buildReportBody,
  submitManualReport,
  type ManualReportData,
} from '@/utils/crashReport';
import { useSettings } from '@/contexts/SettingsContext';

interface ReportBugDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportBugDialog({ isOpen, onClose }: ReportBugDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { settings } = useSettings();
  const actionIdRef = useRef(0);

  const resetForm = () => {
    setName('');
    setEmail('');
    setMessage('');
    setMessageError('');
    setIsSubmitting(false);
    setCopied(false);
  };

  const handleClose = () => {
    actionIdRef.current += 1;
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    if (!message.trim()) {
      setMessageError('Please describe the issue you are experiencing.');
      return false;
    }
    setMessageError('');
    return true;
  };

  const buildAndGather = async (): Promise<ManualReportData | null> => {
    if (!validate()) return null;

    const actionId = actionIdRef.current + 1;
    actionIdRef.current = actionId;
    setIsSubmitting(true);

    try {
      const data = await gatherManualReportData(
        name.trim() || undefined,
        email.trim() || undefined,
        message.trim(),
        settings?.current_model || null
      );

      return actionId === actionIdRef.current ? data : null;
    } catch (err) {
      if (actionId === actionIdRef.current) {
        console.error('Failed to gather report data:', err);
        toast.error('Failed to gather report data');
      }
      return null;
    } finally {
      if (actionId === actionIdRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleSubmitReport = async () => {
    const data = await buildAndGather();
    if (!data) return;

    const actionId = actionIdRef.current;
    setIsSubmitting(true);

    try {
      const result = await submitManualReport(data);

      if (actionId !== actionIdRef.current) return;

      if (result.success) {
        toast.success('Report submitted. Thank you.');
        handleClose();
        return;
      }

      toast.error(result.message || 'Failed to submit report. Please use Copy Report instead.');
    } finally {
      if (actionId === actionIdRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleCopyReport = async () => {
    const data = await buildAndGather();
    if (!data) return;

    const body = buildReportBody(data);

    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      toast.success('Report copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy report:', err);
      toast.error('Failed to copy report');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Report a Bug
          </DialogTitle>
          <DialogDescription>
            Tell us what happened. VoiceTypr will include your system info and the
            latest app log excerpt, then submit the report directly to VoiceTypr
            Support.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-name">Name (optional)</Label>
            <Input
              id="report-name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-email">Email (optional)</Label>
            <Input
              id="report-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="report-message"
              placeholder="Describe what happened, what you expected, and any steps to reproduce..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (messageError) setMessageError('');
              }}
              rows={5}
              aria-required="true"
              aria-invalid={Boolean(messageError)}
              aria-describedby={messageError ? 'report-message-error' : undefined}
              className={messageError ? 'border-destructive' : ''}
            />
            {messageError && (
              <p id="report-message-error" role="alert" className="text-xs text-destructive">
                {messageError}
              </p>
            )}
          </div>

          <div className="rounded-md bg-muted/50 border border-border/40 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>What is included:</strong> Your message, optional contact info,
              system info (app version, OS, architecture, model), and the latest app
              log excerpt.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyReport}
            disabled={isSubmitting}
            className="gap-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy Report'}
          </Button>

          <div className="flex gap-2 sm:ml-auto">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitReport}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Gathering...' : 'Submit'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
