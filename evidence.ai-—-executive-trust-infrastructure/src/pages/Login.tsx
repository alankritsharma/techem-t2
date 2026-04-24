import { useState } from 'react';
import { ShieldCheck, LogIn, Building2, Home } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}

const LANDLORD_CREDENTIALS = {
  username: 'landlord01',
  password: 'Demo-Techem-2026!',
};

const TENANT_CREDENTIALS = {
  username: 'tenant_p03_u09',
  password: 'Demo-Techem-2026!',
};

export function Login({ onLogin, error, loading }: LoginProps) {
  const [username, setUsername] = useState(LANDLORD_CREDENTIALS.username);
  const [password, setPassword] = useState(LANDLORD_CREDENTIALS.password);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onLogin(username, password);
  }

  function fillDemoCredentials(mode: 'landlord' | 'tenant') {
    const credentials = mode === 'landlord' ? LANDLORD_CREDENTIALS : TENANT_CREDENTIALS;
    setUsername(credentials.username);
    setPassword(credentials.password);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl border border-surface-variant shadow-[0px_12px_40px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="p-10 bg-primary text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl border border-white/20 bg-white/10 flex items-center justify-center">
                <ShieldCheck size={28} />
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight">techem</div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/70">
                  Demo Access Layer
                </div>
              </div>
            </div>

            <h1 className="text-4xl font-black tracking-tight leading-tight">
              Smart Energy Forecast Demo
            </h1>
            <p className="mt-4 text-sm text-white/80 leading-relaxed max-w-md">
              Sign in as a landlord to explore assigned properties or as a tenant to
              view one apartment-level forecast. Backend data comes from the local demo API.
            </p>
          </div>

          <div className="space-y-4">
            <DemoCredentialCard
              icon={<Building2 size={18} />}
              title="Landlord Demo"
              username={LANDLORD_CREDENTIALS.username}
              password={LANDLORD_CREDENTIALS.password}
              onUse={() => fillDemoCredentials('landlord')}
            />
            <DemoCredentialCard
              icon={<Home size={18} />}
              title="Tenant Demo"
              username={TENANT_CREDENTIALS.username}
              password={TENANT_CREDENTIALS.password}
              onUse={() => fillDemoCredentials('tenant')}
            />
          </div>
        </div>

        <div className="p-10 flex flex-col justify-center">
          <div className="mb-8">
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-outline">
              Demo Login
            </div>
            <h2 className="text-3xl font-black tracking-tight text-on-surface mt-2">
              Access Forecast Views
            </h2>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Field label="Username">
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-2xl border border-surface-variant px-4 py-3 outline-none focus:border-primary"
                placeholder="Enter demo username"
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-surface-variant px-4 py-3 outline-none focus:border-primary"
                placeholder="Enter demo password"
              />
            </Field>

            {error && (
              <div className="rounded-2xl border border-error/20 bg-error-container/15 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-white font-bold py-3.5 shadow-md hover:bg-primary/95 disabled:opacity-60"
            >
              <LogIn size={18} />
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-xs text-outline leading-relaxed">
            This is fake demo authentication backed by the local FastAPI server. No real user
            accounts are created.
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-outline mb-2">
        {label}
      </div>
      {children}
    </label>
  );
}

function DemoCredentialCard({
  icon,
  title,
  username,
  password,
  onUse,
}: {
  icon: React.ReactNode;
  title: string;
  username: string;
  password: string;
  onUse: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onUse}
      className="w-full text-left rounded-2xl border border-white/15 bg-white/8 px-4 py-4 hover:bg-white/12 transition-colors"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
          {icon}
        </div>
        <div className="font-bold">{title}</div>
      </div>
      <div className="text-xs text-white/75">
        <div>{username}</div>
        <div>{password}</div>
      </div>
    </button>
  );
}
