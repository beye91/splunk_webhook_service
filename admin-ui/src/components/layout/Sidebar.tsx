'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Cpu,
  Bell,
  Server,
  Mail,
  FileText,
  LogOut,
  Settings,
} from 'lucide-react';
import Cookies from 'js-cookie';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'LLM Providers', href: '/llm-config', icon: Cpu },
  { name: 'Alert Types', href: '/alert-types', icon: Bell },
  { name: 'ServiceNow', href: '/servicenow', icon: Server },
  { name: 'Email/SMTP', href: '/email', icon: Mail },
  { name: 'Logs', href: '/logs', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    Cookies.remove('token');
    window.location.href = '/login';
  };

  return (
    <div className="flex flex-col w-64 bg-gray-900 min-h-screen">
      <div className="flex items-center h-16 px-4 bg-gray-800">
        <Settings className="w-8 h-8 text-primary-500" />
        <span className="ml-2 text-xl font-semibold text-white">
          Webhook Admin
        </span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
}
