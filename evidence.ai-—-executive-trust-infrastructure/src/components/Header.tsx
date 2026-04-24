/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  Search,
  Map as MapIcon,
  ShieldCheck,
  Plus,
  FolderPlus,
  Building2,
  LogOut,
} from 'lucide-react';
import { Tab, BuildingObject, BuildingProject } from '../types';
import { cn } from '../lib/utils';
import { DemoRole } from '../services/api';

interface HeaderProps {
  currentTab: Tab;
  setTab: (tab: Tab) => void;
  visibleTabs?: Tab[];
  objects: BuildingObject[];
  projects: BuildingProject[];
  currentObject: BuildingObject | null;
  currentObjectId: string;
  currentUserName?: string;
  currentUserRole?: DemoRole | null;
  demoMode?: boolean;
  onSelectObject: (id: string) => void;
  onCreateObject: (input: {
    name: string;
    addressOriginal: string;
    type?: string;
    description?: string;
  }) => void;
  onCreateProject: (input: {
    name: string;
    description: string;
    objectIds: string[];
  }) => void;
  onLogout?: () => void;
}

export function Header({
  currentTab,
  setTab,
  visibleTabs = ['dashboard', 'floorplan', 'alarms', 'esg', 'reports'],
  objects,
  projects,
  currentObject,
  currentObjectId,
  currentUserName,
  currentUserRole,
  demoMode = false,
  onSelectObject,
  onCreateObject,
  onCreateProject,
  onLogout,
}: HeaderProps) {
  const [showObjectModal, setShowObjectModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const currentAddress = currentObject?.addressValidated || currentObject?.addressOriginal || 'No object selected';
  const canManageObjects = !demoMode && currentUserRole !== 'tenant';
  const canSelectObjects = currentUserRole === 'landlord' && objects.length > 0;
  const navItems = [
    { tab: 'dashboard' as Tab, label: currentUserRole === 'tenant' ? 'Apartment' : 'Strategy' },
    { tab: 'floorplan' as Tab, label: 'Evidence' },
    { tab: 'alarms' as Tab, label: 'Anomalies' },
    { tab: 'esg' as Tab, label: 'Compliance' },
    { tab: 'reports' as Tab, label: 'Data & Imports' },
  ].filter((item) => visibleTabs.includes(item.tab));

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 h-16 bg-white border-b border-gray-100 shadow-[0px_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-black tracking-tighter leading-tight">
              techem
            </span>
            <svg width="64" height="8" viewBox="0 0 64 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="-mt-1">
              <path d="M2 2C15 7 49 7 62 2" stroke="#e30613" strokeWidth="4" strokeLinecap="round"/>
            </svg>
          </div>

          <div className="h-8 w-px bg-gray-200 mx-2" />

          <div className="flex flex-col">
            <span className="text-sm font-bold text-primary tracking-tighter leading-none">
              Trusted Building
            </span>
            <span className="text-[9px] font-bold text-outline uppercase tracking-[0.15em] mt-1">
              Object Intelligence v2
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-3 ml-8">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border border-surface-variant">
              <MapIcon size={14} className="text-outline" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-on-surface uppercase">
                  {currentObject?.name ?? 'No Object'}
                </span>
                <span className="text-[9px] text-outline max-w-[280px] truncate">
                  {currentAddress}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border border-surface-variant">
              <Building2 size={14} className="text-outline" />
              {canSelectObjects ? (
                <select
                  value={currentObjectId}
                  onChange={(e) => onSelectObject(e.target.value)}
                  className="bg-transparent text-[10px] font-bold uppercase text-on-surface outline-none"
                >
                  {objects.map((object) => (
                    <option key={object.id} value={object.id}>
                      {object.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[10px] font-bold uppercase text-on-surface">
                  {currentObject?.name ?? 'No Object'}
                </span>
              )}
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <NavItem
              key={item.tab}
              label={item.label}
              active={currentTab === item.tab}
              onClick={() => setTab(item.tab)}
            />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center px-4 py-2 bg-background border border-surface-variant rounded-lg w-64 group focus-within:border-primary transition-all">
            <Search size={16} className="text-outline mr-2 group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Search object evidence..."
              className="bg-transparent border-none focus:ring-0 text-xs font-medium w-full p-0 outline-none placeholder:text-outline"
            />
          </div>

          {canManageObjects && (
            <>
              <button
                onClick={() => setShowObjectModal(true)}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-variant hover:border-primary hover:bg-background transition-colors"
              >
                <Plus size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">New Object</span>
              </button>

              <button
                onClick={() => setShowProjectModal(true)}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-variant hover:border-primary hover:bg-background transition-colors"
              >
                <FolderPlus size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">New Project</span>
              </button>
            </>
          )}

          {currentUserName && (
            <div className="hidden lg:flex items-center px-3 py-2 rounded-lg border border-surface-variant bg-background">
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase text-on-surface">{currentUserName}</div>
                <div className="text-[9px] uppercase tracking-[0.14em] text-outline">
                  {currentUserRole === 'tenant' ? 'Tenant Demo' : 'Landlord Demo'}
                </div>
              </div>
            </div>
          )}

          <button className="p-2 hover:bg-background rounded-lg text-on-surface-variant transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white" />
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-variant hover:border-primary hover:bg-background transition-colors"
            >
              <LogOut size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Logout</span>
            </button>
          )}
        </div>
      </header>

      {canManageObjects && showObjectModal && (
        <CreateObjectModal
          onClose={() => setShowObjectModal(false)}
          onCreate={(input) => {
            onCreateObject(input);
            setShowObjectModal(false);
          }}
        />
      )}

      {canManageObjects && showProjectModal && (
        <CreateProjectModal
          objects={objects}
          onClose={() => setShowProjectModal(false)}
          onCreate={(input) => {
            onCreateProject(input);
            setShowProjectModal(false);
          }}
        />
      )}
    </>
  );
}

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-[11px] font-bold uppercase tracking-widest transition-all px-1 py-1 group relative',
        active ? 'text-primary' : 'text-outline hover:text-primary'
      )}
    >
      {label}
      {active && (
        <motion.div
          layoutId="activeNav"
          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary"
        />
      )}
    </button>
  );
}

function CreateObjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: {
    name: string;
    addressOriginal: string;
    type?: string;
    description?: string;
  }) => void;
}) {
  const [name, setName] = useState('');
  const [addressOriginal, setAddressOriginal] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');

  const canSave = name.trim().length > 1 && addressOriginal.trim().length > 5;

  return (
    <div className="fixed inset-0 z-[70] bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-surface-variant shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Create New Object</h3>
            <p className="text-sm text-outline mt-1">
              Local-first object creation. New records start as REVIEW and local draft.
            </p>
          </div>
          <button onClick={onClose} className="text-outline hover:text-on-surface">Close</button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Field label="Object Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-surface-variant px-3 py-2 outline-none" />
          </Field>

          <Field label="Original Address">
            <textarea value={addressOriginal} onChange={(e) => setAddressOriginal(e.target.value)} className="w-full rounded-xl border border-surface-variant px-3 py-2 outline-none min-h-[90px]" />
          </Field>

          <Field label="Type (optional)">
            <input value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-xl border border-surface-variant px-3 py-2 outline-none" />
          </Field>

          <Field label="Description (optional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-surface-variant px-3 py-2 outline-none min-h-[90px]" />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
            Status on create: Local Draft / Review Required
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-surface-variant">Cancel</button>
            <button
              disabled={!canSave}
              onClick={() => onCreate({ name, addressOriginal, type, description })}
              className="px-4 py-2 rounded-xl bg-primary text-white disabled:opacity-40"
            >
              Save Object
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateProjectModal({
  objects,
  onClose,
  onCreate,
}: {
  objects: BuildingObject[];
  onClose: () => void;
  onCreate: (input: {
    name: string;
    description: string;
    objectIds: string[];
  }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const canSave = name.trim().length > 1;

  function toggleObject(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-surface-variant shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Create New Project</h3>
            <p className="text-sm text-outline mt-1">
              Projects can start empty or contain existing objects.
            </p>
          </div>
          <button onClick={onClose} className="text-outline hover:text-on-surface">Close</button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Field label="Project Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-surface-variant px-3 py-2 outline-none" />
          </Field>

          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-surface-variant px-3 py-2 outline-none min-h-[90px]" />
          </Field>

          <Field label="Assign Objects">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {objects.map((object) => (
                <label
                  key={object.id}
                  className="flex items-start gap-3 rounded-xl border border-surface-variant p-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(object.id)}
                    onChange={() => toggleObject(object.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-on-surface">{object.name}</div>
                    <div className="text-xs text-outline">{object.addressOriginal}</div>
                  </div>
                </label>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-surface-variant">Cancel</button>
          <button
            disabled={!canSave}
            onClick={() => onCreate({ name, description, objectIds: selectedIds })}
            className="px-4 py-2 rounded-xl bg-primary text-white disabled:opacity-40"
          >
            Save Project
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}
