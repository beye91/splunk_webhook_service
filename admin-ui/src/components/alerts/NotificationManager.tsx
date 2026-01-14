'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import {
  getAlertNotifications,
  createAlertNotification,
  deleteAlertNotification,
  getServiceNowConfigs,
  getSMTPConfigs,
} from '@/lib/api';
import type {
  AlertNotification,
  AlertNotificationCreate,
  ServiceNowConfig,
  SMTPConfig,
  EmailRecipientCreate,
} from '@/types';
import { Plus, Trash2, Mail, Server, X, UserPlus } from 'lucide-react';

interface NotificationManagerProps {
  alertTypeId: number;
  alertTypeMnemonic: string;
  onClose: () => void;
}

export default function NotificationManager({
  alertTypeId,
  alertTypeMnemonic,
  onClose,
}: NotificationManagerProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [notificationType, setNotificationType] = useState<'servicenow' | 'smtp'>('smtp');
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipientCreate[]>([]);
  const [newRecipient, setNewRecipient] = useState({
    email: '',
    recipient_name: '',
    recipient_type: 'to' as 'to' | 'cc' | 'bcc',
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['alertNotifications', alertTypeId],
    queryFn: () => getAlertNotifications(alertTypeId),
  });

  const { data: serviceNowConfigs } = useQuery({
    queryKey: ['serviceNowConfigs'],
    queryFn: getServiceNowConfigs,
  });

  const { data: smtpConfigs } = useQuery({
    queryKey: ['smtpConfigs'],
    queryFn: getSMTPConfigs,
  });

  const createMutation = useMutation({
    mutationFn: (data: AlertNotificationCreate) => createAlertNotification(alertTypeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertNotifications', alertTypeId] });
      setShowAddForm(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId: number) => deleteAlertNotification(alertTypeId, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertNotifications', alertTypeId] });
    },
  });

  const resetForm = () => {
    setNotificationType('smtp');
    setSelectedConfigId('');
    setEmailRecipients([]);
    setNewRecipient({ email: '', recipient_name: '', recipient_type: 'to' });
  };

  const addRecipient = () => {
    if (newRecipient.email) {
      setEmailRecipients([...emailRecipients, { ...newRecipient }]);
      setNewRecipient({ email: '', recipient_name: '', recipient_type: 'to' });
    }
  };

  const removeRecipient = (index: number) => {
    setEmailRecipients(emailRecipients.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: AlertNotificationCreate = {
      notification_type: notificationType,
      enabled: true,
    };

    if (notificationType === 'servicenow') {
      data.servicenow_config_id = parseInt(selectedConfigId);
    } else {
      data.smtp_config_id = parseInt(selectedConfigId);
      data.email_recipients = emailRecipients;
    }

    createMutation.mutate(data);
  };

  const enabledServiceNowConfigs = serviceNowConfigs?.filter((c: ServiceNowConfig) => c.enabled) || [];
  const enabledSMTPConfigs = smtpConfigs?.filter((c: SMTPConfig) => c.enabled) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            Notifications for <span className="font-mono text-primary-600">{alertTypeMnemonic}</span>
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Existing Notifications */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Active Notification Channels</h3>
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : notifications?.length === 0 ? (
              <p className="text-sm text-gray-500">No notification channels configured</p>
            ) : (
              <div className="space-y-2">
                {notifications?.map((notification: AlertNotification) => (
                  <Card key={notification.id} className="bg-gray-50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {notification.notification_type === 'servicenow' ? (
                            <Server className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Mail className="w-5 h-5 text-green-500" />
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              {notification.notification_type === 'servicenow'
                                ? notification.servicenow_config_name
                                : notification.smtp_config_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {notification.notification_type === 'servicenow'
                                ? 'ServiceNow Ticket'
                                : `Email (${notification.email_recipients?.length || 0} recipients)`}
                            </p>
                            {notification.notification_type === 'smtp' && notification.email_recipients?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {notification.email_recipients.map((r) => (
                                  <Badge key={r.id} variant="default" className="text-xs">
                                    {r.email}
                                    {r.recipient_type !== 'to' && ` (${r.recipient_type})`}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Remove this notification channel?')) {
                              deleteMutation.mutate(notification.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Add Notification Form */}
          {showAddForm ? (
            <Card className="border-primary-200">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Add Notification Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Select
                    label="Channel Type"
                    value={notificationType}
                    onChange={(e) => {
                      setNotificationType(e.target.value as 'servicenow' | 'smtp');
                      setSelectedConfigId('');
                      setEmailRecipients([]);
                    }}
                    options={[
                      { value: 'smtp', label: 'Email (SMTP)' },
                      { value: 'servicenow', label: 'ServiceNow Ticket' },
                    ]}
                  />

                  {notificationType === 'servicenow' ? (
                    <Select
                      label="ServiceNow Instance"
                      value={selectedConfigId}
                      onChange={(e) => setSelectedConfigId(e.target.value)}
                      options={[
                        { value: '', label: 'Select instance...' },
                        ...enabledServiceNowConfigs.map((c: ServiceNowConfig) => ({
                          value: c.id.toString(),
                          label: c.name,
                        })),
                      ]}
                      required
                    />
                  ) : (
                    <>
                      <Select
                        label="SMTP Server"
                        value={selectedConfigId}
                        onChange={(e) => setSelectedConfigId(e.target.value)}
                        options={[
                          { value: '', label: 'Select SMTP server...' },
                          ...enabledSMTPConfigs.map((c: SMTPConfig) => ({
                            value: c.id.toString(),
                            label: `${c.name} (${c.from_address})`,
                          })),
                        ]}
                        required
                      />

                      {/* Email Recipients */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Recipients
                        </label>

                        {/* Existing recipients */}
                        {emailRecipients.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {emailRecipients.map((recipient, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                                <div className="text-sm">
                                  <span className="font-medium">{recipient.email}</span>
                                  {recipient.recipient_name && (
                                    <span className="text-gray-500 ml-1">({recipient.recipient_name})</span>
                                  )}
                                  <Badge variant="default" className="ml-2 text-xs">
                                    {recipient.recipient_type.toUpperCase()}
                                  </Badge>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeRecipient(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add recipient form */}
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Input
                              label="Email"
                              type="email"
                              value={newRecipient.email}
                              onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                              placeholder="email@example.com"
                            />
                          </div>
                          <div className="w-32">
                            <Input
                              label="Name"
                              value={newRecipient.recipient_name}
                              onChange={(e) => setNewRecipient({ ...newRecipient, recipient_name: e.target.value })}
                              placeholder="Optional"
                            />
                          </div>
                          <div className="w-24">
                            <Select
                              label="Type"
                              value={newRecipient.recipient_type}
                              onChange={(e) => setNewRecipient({ ...newRecipient, recipient_type: e.target.value as 'to' | 'cc' | 'bcc' })}
                              options={[
                                { value: 'to', label: 'To' },
                                { value: 'cc', label: 'CC' },
                                { value: 'bcc', label: 'BCC' },
                              ]}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={addRecipient}
                            disabled={!newRecipient.email}
                            className="mb-0"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Add at least one recipient to receive email notifications.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      loading={createMutation.isPending}
                      disabled={
                        !selectedConfigId ||
                        (notificationType === 'smtp' && emailRecipients.length === 0)
                      }
                    >
                      Add Channel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Notification Channel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
