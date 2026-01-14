'use client';

import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { getWebhookLogStats, getWebhookLogs, getAlertTypes, getLLMProviders } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Cpu,
  Bell,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['webhookStats'],
    queryFn: () => getWebhookLogStats(7),
  });

  const { data: recentLogs } = useQuery({
    queryKey: ['recentLogs'],
    queryFn: () => getWebhookLogs({ limit: 10 }),
  });

  const { data: alertTypes } = useQuery({
    queryKey: ['alertTypes'],
    queryFn: getAlertTypes,
  });

  const { data: llmProviders } = useQuery({
    queryKey: ['llmProviders'],
    queryFn: getLLMProviders,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
      completed: 'success',
      failed: 'danger',
      processing: 'warning',
      ignored: 'default',
      received: 'info',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Webhooks (7d)</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.total_count || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.completed_count || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.failed_count || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ignored</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.ignored_count || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cpu className="w-5 h-5 mr-2" />
                LLM Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {llmProviders?.length === 0 ? (
                <p className="text-gray-500">No LLM providers configured</p>
              ) : (
                <div className="space-y-3">
                  {llmProviders?.map((provider: any) => (
                    <div key={provider.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-gray-500">{provider.provider_type}</p>
                      </div>
                      <Badge variant={provider.enabled ? 'success' : 'default'}>
                        {provider.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Alert Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertTypes?.length === 0 ? (
                <p className="text-gray-500">No alert types configured</p>
              ) : (
                <div className="space-y-3">
                  {alertTypes?.slice(0, 5).map((alertType: any) => (
                    <div key={alertType.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{alertType.mnemonic}</p>
                        <p className="text-sm text-gray-500">{alertType.display_name}</p>
                      </div>
                      <Badge variant={alertType.enabled ? 'success' : 'default'}>
                        {alertType.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Recent Webhook Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs?.length === 0 ? (
              <p className="text-gray-500">No webhook events yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mnemonic</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentLogs?.map((log: any) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(log.received_at)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {log.mnemonic || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {log.host || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(log.status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {log.servicenow_ticket_number || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {log.processing_time_ms ? formatDuration(log.processing_time_ms) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
