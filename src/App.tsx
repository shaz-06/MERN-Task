import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';

// ==========================================
// 1. TYPE IDENTITIES & ARCHITECTURE CONTRACTS
// ==========================================

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'Todo' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  createdAt?: string;
}

export interface Stats {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  high: number;
  medium: number;
  low: number;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface UserProfile {
  name: string;
  email: string;
}

export type ViewState = 'dashboard' | 'login' | 'register' | 'create-task' | 'edit-task' | 'details';
export type EngineMode = 'local' | 'api';

interface AppContextType {
  user: UserProfile | null;
  token: string;
  tasks: Task[];
  stats: Stats;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  engineMode: EngineMode;
  apiUrl: string;
  setApiUrl: React.Dispatch<React.SetStateAction<string>>;
  currentView: ViewState;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  activeTaskId: string | null;
  setActiveTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
  toasts: Toast[];
  triggerToast: (message: string, type?: Toast['type']) => void;
  handleRegister: (name: string, email: string, password: string) => Promise<boolean>;
  handleLogin: (email: string, password: string) => Promise<boolean>;
  handleLogout: () => void;
  loadTasks: (filters?: { status?: string; priority?: string; search?: string }) => Promise<void>;
  createTask: (payload: Omit<Task, '_id' | 'createdAt'>) => Promise<boolean>;
  updateTask: (id: string, payload: Partial<Omit<Task, '_id' | 'createdAt'>>) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleEngineMode: (mode: EngineMode) => void;
}

const DEFAULT_API_URL = 'http://localhost:5000/api';

const SEED_TASKS: Task[] = [
  {
    _id: 'task-1',
    title: 'Configure Secure JWT Authentication Middleware',
    description: 'Set up bcrypt hashing, token signing rules, and secure express gateways using JSON Web Token verification.',
    status: 'Completed',
    priority: 'High',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'task-2',
    title: 'Establish MongoDB Atlas Indexes',
    description: 'Initialize cluster connection parameters and define compound textual indexes to accelerate task query search operations.',
    status: 'Completed',
    priority: 'Medium',
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'task-3',
    title: 'Deploy API to Production Web Service',
    description: 'Deploy Express server code onto Render, configure environment variables, and manage live CORS parameters.',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  },
  {
    _id: 'task-4',
    title: 'Design Dashboard Metrics & Vector Graphs',
    description: 'Integrate dynamic responsive completion indicators, status distribution matrices, and clean dark mode styles.',
    status: 'Todo',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  },
  {
    _id: 'task-5',
    title: 'Conduct End-to-End API Security Audit',
    description: 'Test CORS policy restrictions, sanitize input data against SQL/NoSQL injections, and verify payload rates.',
    status: 'Todo',
    priority: 'Low',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  }
];

// ==========================================
// 2. STATE SYSTEMS & CONTEXTS
// ==========================================
const AppContext = createContext<AppContextType | null>(null);

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string>(() => localStorage.getItem('token') || '');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, todo: 0, inProgress: 0, completed: 0, high: 0, medium: 0, low: 0 });
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'light');
  const [engineMode, setEngineMode] = useState<EngineMode>(() => (localStorage.getItem('engineMode') as EngineMode) || 'local');
  const [apiUrl, setApiUrl] = useState<string>(() => localStorage.getItem('apiUrl') || DEFAULT_API_URL);
  
  const [currentView, setCurrentView] = useState<ViewState>('login');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast Notifier Helper
  const triggerToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Synchronize CSS Theme on change
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch User Profile Declarations
  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/users/profile');
      if (res.data?.success) {
        setUser(res.data.data);
        setCurrentView('dashboard');
      }
    } catch {
      triggerToast('API connection lost. Reverting to Local Sandbox Mode.', 'warning');
      setEngineMode('local');
      localStorage.setItem('engineMode', 'local');
      const demoProfile: UserProfile = { name: 'Demo Administrator', email: 'demo@company.com' };
      localStorage.setItem('local_user', JSON.stringify(demoProfile));
      setUser(demoProfile);
      setToken('local-mock-token-12345');
    } finally {
      setLoading(false);
    }
  };

  // Handle active session loading on startup
  useEffect(() => {
    if (token) {
      if (engineMode === 'local') {
        const rawUser = localStorage.getItem('local_user');
        const localUser = rawUser ? JSON.parse(rawUser) : { name: "Demo User", email: "demo@company.com" };
        setUser(localUser);
        setCurrentView('dashboard');
      } else {
        axios.defaults.baseURL = apiUrl;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        fetchUserProfile();
      }
    } else {
      setCurrentView('login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, engineMode, apiUrl]);

  // Trigger metrics calculation whenever task database is altered
  useEffect(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'Todo').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const high = tasks.filter((t) => t.priority === 'High').length;
    const medium = tasks.filter((t) => t.priority === 'Medium').length;
    const low = tasks.filter((t) => t.priority === 'Low').length;
    setStats({ total, todo, inProgress, completed, high, medium, low });
  }, [tasks]);

  // Register Handler
  const handleRegister = async (name: string, email: string, password?: string): Promise<boolean> => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (engineMode === 'local') {
      const localUser: UserProfile = { name, email };
      localStorage.setItem('local_user', JSON.stringify(localUser));
      localStorage.setItem('local_tasks', JSON.stringify(SEED_TASKS));
      setToken('local-mock-token-12345');
      localStorage.setItem('token', 'local-mock-token-12345');
      setUser(localUser);
      setTasks(SEED_TASKS);
      triggerToast('Registration Completed (Local Sandbox)!');
      setLoading(false);
      return true;
    } else {
      try {
        const res = await axios.post(`${apiUrl}/users/register`, { name, email, password });
        if (res.data?.success) {
          const payload = res.data.data;
          localStorage.setItem('token', payload.token);
          setToken(payload.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${payload.token}`;
          setUser({ name: payload.name, email: payload.email });
          triggerToast(`Account created successfully! Welcome, ${payload.name}`);
          return true;
        }
        return false;
      } catch (err: any) {
        triggerToast(err.response?.data?.message || 'Registration rejected', 'error');
        return false;
      } finally {
        setLoading(false);
      }
    }
  };

  // Login Handler
  const handleLogin = async (email: string, password?: string): Promise<boolean> => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (engineMode === 'local') {
      if (email === 'demo@company.com' && password === 'password123') {
        const localUser: UserProfile = { name: 'Demo Administrator', email };
        localStorage.setItem('local_user', JSON.stringify(localUser));
        
        const rawTasks = localStorage.getItem('local_tasks');
        let localTasks = rawTasks ? JSON.parse(rawTasks) : null;
        if (!localTasks || localTasks.length === 0) {
          localTasks = SEED_TASKS;
          localStorage.setItem('local_tasks', JSON.stringify(localTasks));
        }
        
        setToken('local-mock-token-12345');
        localStorage.setItem('token', 'local-mock-token-12345');
        setUser(localUser);
        setTasks(localTasks);
        triggerToast('Welcome Back (Local Demo Mode)!');
        setLoading(false);
        return true;
      } else {
        const localUser: UserProfile = { name: email.split('@')[0] || 'User', email };
        localStorage.setItem('local_user', JSON.stringify(localUser));
        localStorage.setItem('local_tasks', JSON.stringify(SEED_TASKS));
        setToken('local-mock-token-12345');
        localStorage.setItem('token', 'local-mock-token-12345');
        setUser(localUser);
        setTasks(SEED_TASKS);
        triggerToast('Auto-registered sandbox instance credentials.');
        setLoading(false);
        return true;
      }
    } else {
      try {
        const res = await axios.post(`${apiUrl}/users/login`, { email, password });
        if (res.data?.success) {
          const payload = res.data.data;
          localStorage.setItem('token', payload.token);
          setToken(payload.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${payload.token}`;
          setUser({ name: payload.name, email: payload.email });
          triggerToast('Welcome Back!');
          return true;
        }
        return false;
      } catch (err: any) {
        triggerToast(err.response?.data?.message || 'Invalid email or password parameter', 'error');
        return false;
      } finally {
        setLoading(false);
      }
    }
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('local_user');
    setToken('');
    setUser(null);
    setTasks([]);
    setStats({ total: 0, todo: 0, inProgress: 0, completed: 0, high: 0, medium: 0, low: 0 });
    setCurrentView('login');
    triggerToast('Logged out securely.');
  };

  // Fetch Task Registry
  const loadTasks = async (filters: { status?: string; priority?: string; search?: string } = {}) => {
    setLoading(true);
    if (engineMode === 'local') {
      const rawTasks = localStorage.getItem('local_tasks');
      let localTasks: Task[] = rawTasks ? JSON.parse(rawTasks) : SEED_TASKS;
      
      if (filters.status && filters.status !== 'All') {
        localTasks = localTasks.filter(t => t.status === filters.status);
      }
      if (filters.priority && filters.priority !== 'All') {
        localTasks = localTasks.filter(t => t.priority === filters.priority);
      }
      if (filters.search) {
        const kw = filters.search.toLowerCase();
        localTasks = localTasks.filter(t => t.title.toLowerCase().includes(kw) || t.description.toLowerCase().includes(kw));
      }
      setTasks(localTasks);
      setLoading(false);
    } else {
      try {
        const res = await axios.get('/tasks', { params: filters });
        if (res.data?.success) {
          setTasks(res.data.data);
        }
      } catch {
        triggerToast('Could not sync remote API task updates', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Create Task Action
  const createTask = async (payload: Omit<Task, '_id' | 'createdAt'>): Promise<boolean> => {
    setLoading(true);
    if (engineMode === 'local') {
      const rawTasks = localStorage.getItem('local_tasks');
      const localTasks: Task[] = rawTasks ? JSON.parse(rawTasks) : SEED_TASKS;
      const newTask: Task = {
        _id: 'task-' + Date.now(),
        title: payload.title,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        dueDate: payload.dueDate,
        createdAt: new Date().toISOString()
      };
      const updated = [newTask, ...localTasks];
      localStorage.setItem('local_tasks', JSON.stringify(updated));
      setTasks(updated);
      triggerToast('Task registered locally!');
      setLoading(false);
      return true;
    } else {
      try {
        const res = await axios.post('/tasks', payload);
        if (res.data?.success) {
          setTasks([res.data.data, ...tasks]);
          triggerToast('Task registered successfully on MongoDB!');
          return true;
        }
        return false;
      } catch (err: any) {
        triggerToast(err.response?.data?.message || 'Task creation failed', 'error');
        return false;
      } finally {
        setLoading(false);
      }
    }
  };

  // Update Task Action
  const updateTask = async (id: string, payload: Partial<Omit<Task, '_id' | 'createdAt'>>): Promise<boolean> => {
    setLoading(true);
    if (engineMode === 'local') {
      const rawTasks = localStorage.getItem('local_tasks');
      const localTasks: Task[] = rawTasks ? JSON.parse(rawTasks) : SEED_TASKS;
      const updated = localTasks.map(t => t._id === id ? { ...t, ...payload } as Task : t);
      localStorage.setItem('local_tasks', JSON.stringify(updated));
      setTasks(updated);
      triggerToast('Task specifications updated.');
      setLoading(false);
      return true;
    } else {
      try {
        const res = await axios.put(`/tasks/${id}`, payload);
        if (res.data?.success) {
          setTasks(tasks.map(t => t._id === id ? res.data.data : t));
          triggerToast('Database updated successfully!');
          return true;
        }
        return false;
      } catch {
        triggerToast('Could not modify task details', 'error');
        return false;
      } finally {
        setLoading(false);
      }
    }
  };

  // Delete Task Action
  const deleteTask = async (id: string): Promise<boolean> => {
    setLoading(true);
    if (engineMode === 'local') {
      const rawTasks = localStorage.getItem('local_tasks');
      const localTasks: Task[] = rawTasks ? JSON.parse(rawTasks) : SEED_TASKS;
      const updated = localTasks.filter(t => t._id !== id);
      localStorage.setItem('local_tasks', JSON.stringify(updated));
      setTasks(updated);
      triggerToast('Task successfully deleted.', 'info');
      setLoading(false);
      return true;
    } else {
      try {
        const res = await axios.delete(`/tasks/${id}`);
        if (res.data?.success) {
          setTasks(tasks.filter(t => t._id !== id));
          triggerToast('Document deleted from database.', 'info');
          return true;
        }
        return false;
      } catch {
        triggerToast('Delete operation failed', 'error');
        return false;
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleEngineMode = (mode: EngineMode) => {
    setEngineMode(mode);
    localStorage.setItem('engineMode', mode);
    handleLogout();
    triggerToast(`Switched workspace configuration context to: ${mode.toUpperCase()}`, 'info');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        tasks,
        stats,
        theme,
        setTheme,
        engineMode,
        apiUrl,
        setApiUrl,
        currentView,
        setCurrentView,
        activeTaskId,
        setActiveTaskId,
        loading,
        toasts,
        triggerToast,
        handleRegister,
        handleLogin,
        handleLogout,
        loadTasks,
        createTask,
        updateTask,
        deleteTask,
        toggleEngineMode
      }}
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
        
        {/* TOAST NOTIFIER BOX */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center justify-between gap-3 ${
                toast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                  : toast.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
                  : toast.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200'
                  : 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-200'
              }`}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* WORKSPACE APP ROUTER VIEWPORT */}
        {currentView === 'login' && <LoginView />}
        {currentView === 'register' && <RegisterView />}
        {currentView === 'dashboard' && <DashboardView />}
        {(currentView === 'create-task' || currentView === 'edit-task') && <TaskFormView />}
        {currentView === 'details' && <TaskDetailsView />}

      </div>
    </AppContext.Provider>
  );
}

// ==========================================
// 3. REGISTRY VIEW: LOGIN WINDOW
// ==========================================
const LoginView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppContext missing");
  const { handleLogin, setCurrentView, theme, setTheme, engineMode, toggleEngineMode, apiUrl, setApiUrl, loading } = context;

  const [email, setEmail] = useState<string>('demo@company.com');
  const [password, setPassword] = useState<string>('password123');
  const [showConfig, setShowConfig] = useState<boolean>(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleLogin(email, password);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 text-xs"
          title="Server Setup"
        >
          ⚙️ Connection Details
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-amber-500 dark:text-violet-400"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {showConfig && (
        <div className="max-w-md w-full mx-auto mb-6 bg-amber-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-amber-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1">🔧 Engine Settings</h4>
          <div className="space-y-3">
            <div>
              <label className="block font-semibold mb-1">Target Execution Mode:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleEngineMode('local')}
                  className={`px-3 py-1.5 rounded-lg font-bold border transition ${
                    engineMode === 'local'
                      ? 'bg-indigo-600 text-white border-transparent'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Local Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => toggleEngineMode('api')}
                  className={`px-3 py-1.5 rounded-lg font-bold border transition ${
                    engineMode === 'api'
                      ? 'bg-indigo-600 text-white border-transparent'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Live Express API
                </button>
              </div>
            </div>
            {engineMode === 'api' && (
              <div>
                <label className="block font-semibold mb-1">Express Gateway URI:</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setApiUrl(e.target.value);
                    localStorage.setItem('apiUrl', e.target.value);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2 mb-6 text-indigo-600 dark:text-indigo-400">
          <span className="text-4xl">🚀</span>
          <span className="text-3xl font-black tracking-tight">TaskUp Workspace</span>
        </div>
        <h2 className="text-center text-2xl font-black text-slate-900 dark:text-white">Sign in to your space</h2>
        <p className="mt-1.5 text-center text-xs text-slate-500 dark:text-slate-400">
          Unlock stateful metrics, priority tracking, and data filters
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/80">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                disabled={loading}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold tracking-wide shadow-md shadow-indigo-600/10 transition-all flex justify-center items-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Authenticate Workspace'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setCurrentView('register')}
              className="text-xs font-semibold text-indigo-500 hover:underline"
            >
              Don't have a login? Secure a workspace profile here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. REGISTRY VIEW: ACCOUNT CREATION WINDOW
// ==========================================
const RegisterView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppContext missing");
  const { handleRegister, setCurrentView, loading } = context;

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const success = await handleRegister(name, email, password);
    if (success) {
      setCurrentView('dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-black text-slate-900 dark:text-white">Register Workspace</h2>
        <p className="mt-2 text-center text-xs text-slate-500">Secure credential authentication bounds</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/80">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                required
                disabled={loading}
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                placeholder="Developer One"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Secure Password</label>
              <input
                type="password"
                required
                disabled={loading}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 transition-all flex justify-center items-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Registering...
                </span>
              ) : (
                'Compile Profile Credentials'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setCurrentView('login')}
              className="text-xs font-semibold text-indigo-500 hover:underline"
            >
              Already registered? Direct workspace sign-in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. REGISTRY VIEW: DASHBOARD CONTROL HUB
// ==========================================
const DashboardView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppContext missing");
  const { user, tasks, stats, handleLogout, loadTasks, setCurrentView, setActiveTaskId, theme, setTheme, engineMode } = context;

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');

  useEffect(() => {
    loadTasks({ status: statusFilter, priority: priorityFilter, search: searchTerm });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <span className="font-extrabold tracking-tight text-lg text-slate-900 dark:text-white hidden sm:inline">TaskUp Cloud</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-black text-slate-800 dark:text-slate-100">{user?.name || 'Workspace Member'}</p>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                <span className={`h-1.5 w-1.5 rounded-full ${engineMode === 'local' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {engineMode === 'local' ? 'Local Sandbox' : 'MongoDB Atlas Active'}
              </div>
            </div>
            
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <button
              onClick={handleLogout}
              className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2 rounded-xl border border-rose-100 dark:border-rose-900/40 transition hover:bg-rose-100"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800/80 transition-colors">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace Footprint</p>
            <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.total} Tasks</h4>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-slate-500 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800/80 transition-colors">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Backlog</p>
            <h4 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.todo} Tasks</h4>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${stats.total > 0 ? (stats.todo / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800/80 transition-colors">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Execution</p>
            <h4 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.inProgress} Tasks</h4>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800/80 transition-colors">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Deliverables</p>
            <h4 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.completed} Tasks</h4>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/80 flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Deliverable Ratio</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Calculated overall performance indicators</p>
            </div>

            <div className="flex justify-center my-6">
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray={`${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0} ${100 - (stats.total > 0 ? (stats.completed / stats.total) * 100 : 0)}`}
                    strokeDashoffset="0"
                  />
                </svg>
                <div className="text-center">
                  <span className="text-2xl font-black">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Done</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/80 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Workspace Filters</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Narrow down active project deliverables instantly</p>
              </div>
              <button
                onClick={() => {
                  setActiveTaskId(null);
                  setCurrentView('create-task');
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                + Register Task
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Search Context</label>
                <input
                  type="text"
                  placeholder="Query titles, desc..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Todo">Todo</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Priority Filter</label>
                <select
                  value={priorityFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-12 text-center">
            <span className="text-4xl">📭</span>
            <h4 className="font-black text-sm text-slate-700 dark:text-slate-300 mt-2">Workspace registry empty</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Create a new task, or adjust your current filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <div
                key={task._id}
                onClick={() => {
                  setActiveTaskId(task._id);
                  setCurrentView('details');
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500 cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[160px]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                      task.priority === 'High'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                        : task.priority === 'Medium'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {task.priority} Priority
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                        : task.status === 'In Progress'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 line-clamp-1">{task.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
                    {task.description || <span className="italic text-slate-300">No description metadata.</span>}
                  </p>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 mt-4 flex items-center justify-between text-[11px] text-slate-400">
                  <span>📅 Due: <strong>{task.dueDate}</strong></span>
                  <span className="text-indigo-500 hover:underline font-bold">Review Details →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

// ==========================================
// 6. ACTION VIEW: CREATE / UPDATE TASK SCREEN
// ==========================================
const TaskFormView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppContext missing");
  const { tasks, activeTaskId, currentView, setCurrentView, createTask, updateTask } = context;
  const isEditMode = currentView === 'edit-task';
  
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<Task['status']>('Todo');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [dueDate, setDueDate] = useState<string>('');

  useEffect(() => {
    if (isEditMode && activeTaskId) {
      const activeTask = tasks.find((t) => t._id === activeTaskId);
      if (activeTask) {
        setTitle(activeTask.title);
        setDescription(activeTask.description || '');
        setStatus(activeTask.status);
        setPriority(activeTask.priority);
        setDueDate(activeTask.dueDate.split('T')[0] || '');
      }
    }
  }, [activeTaskId, isEditMode, tasks]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = { title, description, status, priority, dueDate };
    
    let success = false;
    if (isEditMode && activeTaskId) {
      success = await updateTask(activeTaskId, payload);
    } else {
      success = await createTask(payload);
    }

    if (success) {
      setCurrentView('dashboard');
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/60 dark:border-slate-800/80 p-6 sm:p-8">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
          {isEditMode ? 'Modify Task Properties' : 'Register New Deliverable'}
        </h2>
        <p className="text-xs text-slate-400 mb-6">Specify deadline dates, operational targets, and priorities</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Task Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Deploy API router layers"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description / Notes</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              placeholder="State execution details, test validations..."
          />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status Class</label>
              <select
                value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as Task['status'])}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white outline-none"
              >
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Priority Scale</label>
              <select
                value={priority}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value as Task['priority'])}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white outline-none"
              >
                <option value="Low">Low Scale</option>
                <option value="Medium">Medium Scale</option>
                <option value="High">High Scale</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Due Date</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentView('dashboard')}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
            >
              Discard
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/10 transition-all"
            >
              {isEditMode ? 'Commit Changes' : 'Initialize Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 7. ACTION VIEW: TASK DETAIL DRILL-DOWN
// ==========================================
const TaskDetailsView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppContext missing");
  const { tasks, activeTaskId, setCurrentView, deleteTask } = context;
  const task = tasks.find((t) => t._id === activeTaskId);

  const handleDelete = async () => {
    if (activeTaskId && window.confirm('Delete this task specification? This operation is permanent.')) {
      const success = await deleteTask(activeTaskId);
      if (success) {
        setCurrentView('dashboard');
      }
    }
  };

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-3xl shadow border border-slate-200 dark:border-slate-800">
          <p className="text-rose-500 font-bold mb-4">Specified Task Registry Not Found</p>
          <button onClick={() => setCurrentView('dashboard')} className="text-xs text-indigo-500 hover:underline">
            Return to Dashboard Layout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/60 dark:border-slate-800/80 p-6 sm:p-8 space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 text-xs">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="text-indigo-500 hover:underline font-bold flex items-center gap-1"
          >
            ← Back to Board
          </button>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
              task.priority === 'High' ? 'bg-rose-50 text-rose-600' : task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {task.priority} Priority
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : task.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'
            }`}>
              {task.status}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 break-words leading-tight">{task.title}</h1>
          <p className="text-slate-400 text-[10px] mt-1">
            Registered timestamp: {new Date(task.createdAt || Date.now()).toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Detailed Context Log</h4>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
            {task.description || <span className="italic text-slate-300">No descriptive specifications added.</span>}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
          <span>📅 Delivery Due Deadline: <strong className="text-slate-800 dark:text-slate-200">{task.dueDate}</strong></span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('edit-task')}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl font-bold transition"
            >
              Modify Properties
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 rounded-xl font-bold transition"
            >
              Delete Registry
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};