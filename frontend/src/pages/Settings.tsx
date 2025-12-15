// This is the Settings.tsx file for configuring application settings in a dashboard layout.'
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api } from '@/services/api';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Server,
  Key,
  Bell,
  Shield,
  Database,
  Zap,
  Globe,
  Save,
} from 'lucide-react';

export default function Settings() {
  return (
    <DashboardLayout title="Settings" subtitle="Configure your invoice processing system">
      <div className="max-w-4xl space-y-8">
        {/* API Configuration */}
        <section className="rounded-xl border border-border bg-card p-6 card-elevated">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">API Configuration</h2>
              <p className="text-sm text-muted-foreground">Connect to your Python backend</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">Backend API URL</Label>
              <Input
                id="api-url"
                placeholder="http://localhost:8000/api"
                defaultValue="http://localhost:8000/api"
              />
              <p className="text-xs text-muted-foreground">
                The base URL for your Python FastAPI backend
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input id="api-key" type="password" placeholder="Enter your API key" />
            </div>
          </div>
        </section>

        {/* AI Settings */}
        <section className="rounded-xl border border-border bg-card p-6 card-elevated">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
              <Zap className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI Processing</h2>
              <p className="text-sm text-muted-foreground">Configure LangChain & Vision models</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>LLM Provider</Label>
              <Select defaultValue="openai">
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                  <SelectItem value="local">Local LLM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vision Model</Label>
              <Select defaultValue="gpt4-vision">
                <SelectTrigger>
                  <SelectValue placeholder="Select vision model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt4-vision">GPT-4 Vision</SelectItem>
                  <SelectItem value="claude-vision">Claude 3 Vision</SelectItem>
                  <SelectItem value="gemini-vision">Gemini Pro Vision</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-process uploads</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically extract data from uploaded invoices
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Handwriting recognition</Label>
                <p className="text-xs text-muted-foreground">
                  Enable AI recognition for handwritten content
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-xl border border-border bg-card p-6 card-elevated">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Bell className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">Manage alert preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive email alerts for new invoices
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Processing alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when processing is complete
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Due date reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Remind before payment due dates
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="rounded-xl border border-border bg-card p-6 card-elevated">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Globe className="h-5 w-5 text-success" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Integrations</h2>
              <p className="text-sm text-muted-foreground">Connect external services</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {['QuickBooks', 'Xero', 'SAP', 'Slack'].map((service) => (
              <div
                key={service}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-foreground">
                    {service.slice(0, 2)}
                  </div>
                  <span className="font-medium text-foreground">{service}</span>
                </div>
                <Button variant="outline" size="sm">
                  Connect
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button variant="gradient" size="lg">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
