import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Upload as UploadIcon,
  FileText,
  Mail,
  Image,
  PenTool,
  X,
  Loader2,
  CheckCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const supportedFormats = [
  {
    icon: FileText,
    title: 'PDF Invoices',
    description: 'Digital invoices, scanned documents',
    color: 'text-destructive',
    bg: 'bg-destructive/10',
  },
  {
    icon: Mail,
    title: 'Email Attachments',
    description: 'Forward invoices from email',
    color: 'text-chart-2',
    bg: 'bg-chart-2/10',
  },
  {
    icon: Image,
    title: 'Image Files',
    description: 'Photos, screenshots, scans',
    color: 'text-chart-5',
    bg: 'bg-chart-5/10',
  },
  {
    icon: PenTool,
    title: 'Handwritten',
    description: 'Handwritten notes & invoices',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
];

export default function Upload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        // Simulated progress
        const interval = setInterval(() => {
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: Math.min((prev[file.name] || 0) + 10, 90),
          }));
        }, 200);

        const result = await api.uploadInvoice(file);

        clearInterval(interval);
        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));

        // ✅ Notify other components to refresh invoices (e.g., dashboard)
        if (result.success) {
          window.dispatchEvent(new Event('invoiceUploaded'));
        }
      }

      toast({
        title: 'Upload Complete',
        description: `Successfully processed ${files.length} invoice(s)`,
      });

      setTimeout(() => {
        navigate('/invoices');
      }, 1500);
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'An error occurred while processing invoices',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout title="Upload Invoices" subtitle="Upload and process new invoices with AI">
      <div className="max-w-4xl mx-auto">
        {/* Supported Formats */}
        <div className="grid gap-4 md:grid-cols-4">
          {supportedFormats.map((format) => (
            <div
              key={format.title}
              className="rounded-xl border border-border bg-card p-4 card-elevated text-center"
            >
              <div
                className={cn(
                  'mx-auto flex h-12 w-12 items-center justify-center rounded-xl',
                  format.bg
                )}
              >
                <format.icon className={cn('h-6 w-6', format.color)} />
              </div>
              <h3 className="mt-3 font-medium text-foreground">{format.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{format.description}</p>
            </div>
          ))}
        </div>

        {/* Upload Zone */}
        <div
          className={cn(
            'mt-8 rounded-xl border-2 border-dashed bg-card p-12 transition-all duration-200',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50',
            uploading && 'pointer-events-none opacity-50'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 glow animate-pulse-glow">
              <UploadIcon className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-foreground">
              Drop your invoices here
            </h3>
            <p className="mt-2 text-muted-foreground">
              or click to browse from your computer
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
              onChange={handleFileInput}
              className="absolute inset-0 cursor-pointer opacity-0"
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            <label className="relative mt-4">
              <Button variant="outline" className="relative">
                <UploadIcon className="mr-2 h-4 w-4" />
                Browse Files
              </Button>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                onChange={handleFileInput}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <p className="mt-4 text-xs text-muted-foreground">
              Supports PDF, PNG, JPG, JPEG, GIF, WEBP up to 50MB each
            </p>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-card card-elevated overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h3 className="font-semibold text-foreground">
                Selected Files ({files.length})
              </h3>
            </div>
            <div className="divide-y divide-border">
              {files.map((file, index) => {
                const progress = uploadProgress[file.name] || 0;
                const isComplete = progress === 100;

                return (
                  <div key={index} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {uploading && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-chart-2 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {isComplete ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {files.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setFiles([])}
              disabled={uploading}
            >
              Clear All
            </Button>
            <Button
              variant="gradient"
              onClick={handleUpload}
              disabled={uploading}
              className="min-w-40"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Process with AI
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* AI Features */}
        <div className="mt-12 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-chart-2/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-2">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AI-Powered Extraction</h3>
              <p className="text-sm text-muted-foreground">
                Our AI automatically extracts all invoice data with 98%+ accuracy
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" />
              Invoice numbers & dates
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" />
              Line items & totals
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" />
              Vendor information
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" />
              Payment terms
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" />
              Signatures & stamps
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" />
              Handwriting recognition
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
