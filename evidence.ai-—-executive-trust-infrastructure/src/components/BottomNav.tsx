/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LayoutDashboard, Map as MapIcon, BellRing, Leaf, BarChart3 } from 'lucide-react';
import { Tab } from '../types';
import { cn } from '../lib/utils';

interface BottomNavProps {
  currentTab: Tab;
  setTab: (tab: Tab) => void;
  visibleTabs?: Tab[];
}

export function BottomNav({
  currentTab,
  setTab,
  visibleTabs = ['dashboard', 'floorplan', 'alarms', 'esg', 'reports'],
}: BottomNavProps) {
  const items = [
    { tab: 'dashboard' as Tab, icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { tab: 'floorplan' as Tab, icon: <MapIcon size={20} />, label: 'Evidence' },
    { tab: 'alarms' as Tab, icon: <BellRing size={20} />, label: 'Alarms' },
    { tab: 'esg' as Tab, icon: <Leaf size={20} />, label: 'ESG' },
    { tab: 'reports' as Tab, icon: <BarChart3 size={20} />, label: 'Imports' },
  ].filter((item) => visibleTabs.includes(item.tab));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 pb-safe px-2 bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-[0px_-4px_12px_rgba(0,0,0,0.02)]">
      {items.map((item) => (
        <TabButton
          key={item.tab}
          icon={item.icon}
          label={item.label}
          active={currentTab === item.tab}
          onClick={() => setTab(item.tab)}
        />
      ))}
    </nav>
  );
}

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function TabButton({ icon, label, active, onClick }: TabButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-200 active:scale-95 w-16 group",
        active ? "text-primary font-bold" : "text-outline hover:text-primary"
      )}
    >
      <div className={cn(
        "mb-1 px-3 py-1 rounded-full transition-colors",
        active ? "bg-primary-fixed text-on-primary-fixed" : "group-hover:bg-background"
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
    </button>
  );
}
