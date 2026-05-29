/* ============================================================
   FREELANCER CLIENT PORTAL — app.jsx
   Complete React 18 Single-Page Application
   Loaded via Babel Standalone — standard JSX syntax
   ============================================================ */

const { useState, useEffect, useReducer, useContext, createContext, useRef, useCallback, useMemo } = React;

// ============================================================
// 1. UTILITY FUNCTIONS
// ============================================================

const uuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};


const formatDate = (iso) => {
  if (!iso) return '--';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch (e) {
    return '--';
  }
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getFileType = (name) => {
  if (!name) return 'other';
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) return 'image';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf'].includes(ext)) return 'document';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv'].includes(ext)) return 'video';
  return 'other';
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const daysBetween = (iso1, iso2) => {
  const d1 = new Date(iso1);
  const d2 = new Date(iso2);
  return Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
};

const navigate = (hash) => {
  window.location.hash = hash;
};

const projectTypeLabels = {
  ecommerce: 'E-commerce Website',
  landing: 'Landing Page',
  portfolio: 'Portfolio Website',
  business: 'Business Website',
  blog: 'Blog',
  webapp: 'Custom Web App',
  other: 'Other',
};

const phaseLabel = (phase) => {
  if (phase === 'content_submission') return 'Content Submission';
  if (phase === 'revision_1') return 'Revision Round 1';
  if (phase === 'revision_2') return 'Revision Round 2';
  if (phase === 'revision_3') return 'Revision Round 3';
  if (phase === 'completed') return 'Completed';
  return phase;
};

const getPhaseStatus = (project) => {
  if (!project) return { label: '--', variant: 'gray' };
  if (project.status === 'concluded') return { label: 'CONCLUDED', variant: 'dark' };
  const cp = project.currentPhase;
  if (cp === 'completed') return { label: 'COMPLETED', variant: 'success' };
  if (cp === 'content_submission') {
    const s = project.contentSubmission.status;
    if (s === 'pending_client') return { label: 'CONTENT PENDING', variant: 'gray' };
    if (s === 'submitted') return { label: 'CONTENT RECEIVED', variant: 'warning' };
    if (s === 'delivered') {
      const r1 = project.revisions[0];
      if (r1.status === 'pending_client') return { label: 'REVISION 1 PENDING', variant: 'gray' };
      if (r1.status === 'submitted') return { label: 'REVISION 1 RECEIVED', variant: 'info' };
      return { label: 'CONTENT DELIVERED', variant: 'success' };
    }
  }
  if (cp.startsWith('revision_')) {
    const roundNum = parseInt(cp.split('_')[1]);
    const rev = project.revisions[roundNum - 1];
    if (rev) {
      if (rev.status === 'pending_client') return { label: `REVISION ${roundNum} PENDING`, variant: 'gray' };
      if (rev.status === 'submitted') return { label: `REVISION ${roundNum} RECEIVED`, variant: 'info' };
      if (rev.status === 'delivered') {
        if (roundNum < 3) {
          const nextRev = project.revisions[roundNum];
          if (nextRev && nextRev.status === 'pending_client') return { label: `REVISION ${roundNum + 1} PENDING`, variant: 'gray' };
          if (nextRev && nextRev.status === 'submitted') return { label: `REVISION ${roundNum + 1} RECEIVED`, variant: 'info' };
        }
        return { label: `REVISION ${roundNum} DELIVERED`, variant: 'success' };
      }
    }
  }
  return { label: project.currentPhase.toUpperCase().replace('_', ' '), variant: 'gray' };
};

const revisionsUsed = (project) => {
  return project.revisions.filter((r) => r.status === 'delivered').length;
};


// ============================================================
// 2. SEED DATA
// ============================================================

const FREELANCER = {
  email: 'sonnal@two19labs.com',
  name: 'Sonnal Dessai',
  password: 'sonnalpassword',
  role: 'freelancer',
  joinedAt: daysAgo(180),
};

const SEED_CLIENTS = [];
const SEED_PROJECTS = [];
const SEED_NOTIFICATIONS = [];



// ============================================================
// 3. STORAGE & SUPABASE LAYER
// ============================================================

const STORAGE_KEY = 'freelancer_portal_data';

// Supabase configuration - prefilled with placeholders but easily configurable via localStorage
const getSupabaseConfig = () => {
  const url = localStorage.getItem('supabase_url') || 'https://kbcngzzoqcilcykgyulz.supabase.co';
  const key = localStorage.getItem('supabase_anon_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY25nenpvcWNpbGN5a2d5dWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzI2MzAsImV4cCI6MjA5NTY0ODYzMH0.UJnTU-5MMYrH-TO7DpVbQTiMX-ulHnVnbJ4-xny-5yA';
  return { url, key };
};

const setSupabaseConfig = (url, key) => {
  localStorage.setItem('supabase_url', url.trim());
  localStorage.setItem('supabase_anon_key', key.trim());
};

const clearSupabaseConfig = () => {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_anon_key');
};

let supabaseClient = null;
const { url: cachedUrl, key: cachedKey } = getSupabaseConfig();
if (cachedUrl && cachedKey && typeof supabase !== 'undefined') {
  try {
    supabaseClient = supabase.createClient(cachedUrl, cachedKey);
  } catch (e) {
    console.error('Failed to initialize Supabase client', e);
  }
}

function createSeedData() {
  return {
    clients: SEED_CLIENTS,
    projects: SEED_PROJECTS,
    notifications: SEED_NOTIFICATIONS,
  };
}

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.clients && parsed.projects && parsed.notifications) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load data', e);
  }
  return createSeedData();
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data', e);
  }
}

function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  return createSeedData();
}

// Function to seed Supabase database if empty
async function seedSupabaseDatabase(sbClient) {
  try {
    console.log('Seeding Supabase database...');
    // Seed Clients, Projects, and Notifications in order
    const { error: cErr } = await sbClient.from('clients').insert(SEED_CLIENTS);
    if (cErr) console.error('Clients seeding error', cErr);
    
    const { error: pErr } = await sbClient.from('projects').insert(
      SEED_PROJECTS.map(p => ({
        id: p.id,
        client_email: p.clientEmail,
        name: p.name,
        type: p.type,
        status: p.status,
        amount_agreed: p.amountAgreed,
        amount_paid: p.amountPaid,
        start_date: p.startDate,
        end_date: p.endDate,
        deliverable_link: p.deliverableLink,
        current_phase: p.currentPhase,
        notes: p.notes,
        content_submission: p.contentSubmission,
        revisions: p.revisions,
        created_at: p.createdAt
      }))
    );
    if (pErr) console.error('Projects seeding error', pErr);

    const { error: nErr } = await sbClient.from('notifications').insert(
      SEED_NOTIFICATIONS.map(n => ({
        id: n.id,
        type: n.type,
        client_email: n.forEmail,
        project_name: n.projectName,
        project_id: n.projectId,
        message: n.message,
        read: n.read,
        created_at: n.createdAt
      }))
    );
    if (nErr) console.error('Notifications seeding error', nErr);

    console.log('Supabase seeding complete.');
  } catch (e) {
    console.error('Failed to seed Supabase database', e);
  }
}



// ============================================================
// 4. CONTEXTS
// ============================================================

// ---- Toast Context ----
const ToastContext = createContext();

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = uuid();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  return useContext(ToastContext);
}

// ---- Auth Context ----
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('portal_user');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  });

  const isFreelancer = user && user.email === FREELANCER.email;

  const login = useCallback((email, password, clients) => {
    if (email === FREELANCER.email && password === FREELANCER.password) {
      const u = { email: FREELANCER.email, name: FREELANCER.name, role: 'freelancer' };
      setUser(u);
      sessionStorage.setItem('portal_user', JSON.stringify(u));
      return { success: true };
    }
    const client = clients.find((c) => c.email === email && c.password === password);
    if (client) {
      const u = { email: client.email, name: client.name, role: 'client' };
      setUser(u);
      sessionStorage.setItem('portal_user', JSON.stringify(u));
      return { success: true };
    }
    return { success: false, error: 'Invalid email or password' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('portal_user');
    navigate('login');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isFreelancer }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

// ---- Data Context ----
const DataContext = createContext();

function DataProvider({ children }) {
  const [data, setData] = useState(() => loadData());
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(!!supabaseClient);

  // Sync data from Supabase
  const fetchFromSupabase = useCallback(async (clientToUse = supabaseClient) => {
    if (!clientToUse) return;
    setLoading(true);
    try {
      // 1. Fetch clients
      const { data: clients, error: cErr } = await clientToUse.from('clients').select('*');
      if (cErr) throw cErr;

      // If clients table is empty, auto-seed the database with demo values!
      if (clients && clients.length === 0) {
        await seedSupabaseDatabase(clientToUse);
        const { data: reClients } = await clientToUse.from('clients').select('*');
        const { data: reProjects } = await clientToUse.from('projects').select('*');
        const { data: reNotifs } = await clientToUse.from('notifications').select('*').order('created_at', { ascending: false });
        
        const fetchedData = {
          clients: reClients || [],
          projects: (reProjects || []).map(p => ({
            id: p.id,
            clientEmail: p.client_email,
            name: p.name,
            type: p.type,
            status: p.status,
            amountAgreed: parseFloat(p.amount_agreed),
            amountPaid: parseFloat(p.amount_paid),
            startDate: p.start_date,
            endDate: p.end_date,
            deliverableLink: p.deliverable_link || '',
            currentPhase: p.current_phase,
            notes: p.notes || '',
            contentSubmission: p.content_submission,
            revisions: p.revisions,
            createdAt: p.created_at
          })),
          notifications: (reNotifs || []).map(n => ({
            id: n.id,
            type: n.type,
            forEmail: n.client_email,
            projectName: n.project_name,
            projectId: n.project_id,
            message: n.message,
            read: n.read,
            createdAt: n.created_at
          }))
        };
        setData(fetchedData);
        saveData(fetchedData);
        return;
      }

      // 2. Fetch projects and notifications
      const { data: projects, error: pErr } = await clientToUse.from('projects').select('*');
      if (pErr) throw pErr;
      const { data: notifications, error: nErr } = await clientToUse.from('notifications').select('*').order('created_at', { ascending: false });
      if (nErr) throw nErr;

      const fetchedData = {
        clients: clients || [],
        projects: (projects || []).map(p => ({
          id: p.id,
          clientEmail: p.client_email,
          name: p.name,
          type: p.type,
          status: p.status,
          amountAgreed: parseFloat(p.amount_agreed),
          amountPaid: parseFloat(p.amount_paid),
          startDate: p.start_date,
          endDate: p.end_date,
          deliverableLink: p.deliverable_link || '',
          currentPhase: p.current_phase,
          notes: p.notes || '',
          contentSubmission: p.content_submission,
          revisions: p.revisions,
          createdAt: p.created_at
        })),
        notifications: (notifications || []).map(n => ({
          id: n.id,
          type: n.type,
          forEmail: n.client_email,
          projectName: n.project_name,
          projectId: n.project_id,
          message: n.message,
          read: n.read,
          createdAt: n.created_at
        }))
      };
      setData(fetchedData);
      saveData(fetchedData); // update offline cache
    } catch (e) {
      console.error('Failed to sync with Supabase', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    if (supabaseClient) {
      fetchFromSupabase(supabaseClient);
    }
  }, [fetchFromSupabase]);

  // Connect / Disconnect helper
  const connectSupabase = useCallback(async (url, key) => {
    if (!url.trim() || !key.trim()) {
      clearSupabaseConfig();
      supabaseClient = null;
      setIsConnected(false);
      addToast('Disconnected from Supabase. Falling back to local storage.', 'info');
      setData(loadData());
      return { success: true };
    }

    try {
      const client = supabase.createClient(url.trim(), key.trim());
      // Test query
      const { error } = await client.from('clients').select('*').limit(1);
      if (error) throw error;

      setSupabaseConfig(url, key);
      supabaseClient = client;
      setIsConnected(true);
      addToast('Connected to Supabase successfully!', 'success');
      fetchFromSupabase(client);
      return { success: true };
    } catch (e) {
      console.error('Supabase connection test failed', e);
      addToast(`Connection failed: ${e.message || 'Check URL and Anon Key'}`, 'danger');
      return { success: false, error: e.message };
    }
  }, [addToast, fetchFromSupabase]);

  const addClient = useCallback((client) => {
    const newClient = { ...client, id: uuid(), role: 'client', joinedAt: new Date().toISOString() };
    setData((prev) => {
      const updated = {
        ...prev,
        clients: [...prev.clients, newClient],
      };
      saveData(updated);
      return updated;
    });

    if (supabaseClient) {
      supabaseClient.from('clients').insert([{
        id: newClient.id,
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone,
        password: newClient.password,
        joined_at: newClient.joinedAt
      }]).then(({ error }) => {
        if (error) {
          console.error('Supabase client insert error', error);
          addToast('Failed to sync new client to database.', 'danger');
        }
      });
    }
  }, [addToast]);

  const addProject = useCallback((project) => {
    const projectId = uuid();
    const now = new Date().toISOString();
    const newProject = {
      id: projectId,
      clientEmail: project.clientEmail,
      name: project.name,
      type: project.type,
      status: 'active',
      amountAgreed: project.amountAgreed,
      amountPaid: project.amountPaid || 0,
      startDate: project.startDate || now,
      endDate: null,
      deliverableLink: '',
      currentPhase: 'content_submission',
      notes: project.notes || '',
      contentSubmission: {
        status: 'pending_client',
        brief: '',
        files: [],
        submittedAt: null,
        deliveredAt: null,
      },
      revisions: [
        { round: 1, status: 'locked', brief: '', files: [], submittedAt: null, deliveredAt: null },
        { round: 2, status: 'locked', brief: '', files: [], submittedAt: null, deliveredAt: null },
        { round: 3, status: 'locked', brief: '', files: [], submittedAt: null, deliveredAt: null },
      ],
      createdAt: now,
    };

    const notification = {
      id: uuid(),
      type: 'project_created',
      forEmail: project.clientEmail,
      projectId: projectId,
      message: `Your project ${project.name} has been created. Please submit your content.`,
      read: false,
      createdAt: now,
    };

    setData((prev) => {
      const updated = {
        ...prev,
        projects: [...prev.projects, newProject],
        notifications: [notification, ...prev.notifications],
      };
      saveData(updated);
      return updated;
    });

    if (supabaseClient) {
      supabaseClient.from('projects').insert([{
        id: newProject.id,
        client_email: newProject.clientEmail,
        name: newProject.name,
        type: newProject.type,
        status: newProject.status,
        amount_agreed: newProject.amountAgreed,
        amount_paid: newProject.amountPaid,
        start_date: newProject.startDate,
        end_date: newProject.endDate,
        deliverable_link: newProject.deliverableLink,
        current_phase: newProject.currentPhase,
        notes: newProject.notes,
        content_submission: newProject.contentSubmission,
        revisions: newProject.revisions,
        created_at: newProject.createdAt
      }]).then(({ error }) => {
        if (error) console.error('Supabase project insert error', error);
      });

      supabaseClient.from('notifications').insert([{
        id: notification.id,
        type: notification.type,
        client_email: notification.forEmail,
        project_name: newProject.name,
        project_id: notification.projectId,
        message: notification.message,
        read: notification.read,
        created_at: notification.createdAt
      }]).then(({ error }) => {
        if (error) console.error('Supabase notification insert error', error);
      });
    }

    return projectId;
  }, []);

  const updateProject = useCallback((id, updates) => {
    setData((prev) => {
      const updated = {
        ...prev,
        projects: prev.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      };
      saveData(updated);
      return updated;
    });

    if (supabaseClient) {
      const dbUpdates = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.amountAgreed !== undefined) dbUpdates.amount_agreed = updates.amountAgreed;
      if (updates.amountPaid !== undefined) dbUpdates.amount_paid = updates.amountPaid;
      if (updates.deliverableLink !== undefined) dbUpdates.deliverable_link = updates.deliverableLink;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.currentPhase !== undefined) dbUpdates.current_phase = updates.currentPhase;
      if (updates.contentSubmission !== undefined) dbUpdates.content_submission = updates.contentSubmission;
      if (updates.revisions !== undefined) dbUpdates.revisions = updates.revisions;

      supabaseClient.from('projects').update(dbUpdates).eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase update error', error);
        });
    }
  }, []);

  const deliverPhase = useCallback((projectId, phaseType, round) => {
    setData((prev) => {
      const project = prev.projects.find((p) => p.id === projectId);
      if (!project) return prev;

      const updatedProject = { ...project };
      const now = new Date().toISOString();
      let notifMessage = '';

      if (phaseType === 'content_submission') {
        updatedProject.contentSubmission = {
          ...updatedProject.contentSubmission,
          status: 'delivered',
          deliveredAt: now,
        };
        updatedProject.revisions = updatedProject.revisions.map((r, i) =>
          i === 0 ? { ...r, status: 'pending_client' } : r
        );
        updatedProject.currentPhase = 'revision_1';
        notifMessage = `${FREELANCER.name} delivered your content submission for ${project.name}. Revision Round 1 is now open.`;
      } else if (phaseType === 'revision') {
        updatedProject.revisions = updatedProject.revisions.map((r, i) => {
          if (r.round === round) {
            return { ...r, status: 'delivered', deliveredAt: now };
          }
          if (r.round === round + 1 && round < 3) {
            return { ...r, status: 'pending_client' };
          }
          return r;
        });
        if (round < 3) {
          updatedProject.currentPhase = `revision_${round + 1}`;
          notifMessage = `${FREELANCER.name} delivered revision round ${round} for ${project.name}. Revision Round ${round + 1} is now open.`;
        } else {
          updatedProject.currentPhase = 'completed';
          notifMessage = `${FREELANCER.name} delivered the final revision for ${project.name}. Your project is ready for delivery.`;
        }
      }

      const notification = {
        id: uuid(),
        type: 'delivery',
        forEmail: project.clientEmail,
        projectId: projectId,
        message: notifMessage,
        read: false,
        createdAt: now,
      };

      if (supabaseClient) {
        supabaseClient.from('projects').update({
          content_submission: updatedProject.contentSubmission,
          revisions: updatedProject.revisions,
          current_phase: updatedProject.currentPhase
        }).eq('id', projectId).then(({ error }) => { if (error) console.error(error); });

        supabaseClient.from('notifications').insert([{
          id: notification.id,
          type: notification.type,
          client_email: notification.forEmail,
          project_name: project.name,
          project_id: notification.projectId,
          message: notification.message,
          read: notification.read,
          created_at: notification.createdAt
        }]).then(({ error }) => { if (error) console.error(error); });
      }

      const updated = {
        ...prev,
        projects: prev.projects.map((p) => (p.id === projectId ? updatedProject : p)),
        notifications: [notification, ...prev.notifications],
      };
      saveData(updated);
      return updated;
    });
  }, []);

  const submitPhase = useCallback((projectId, phaseType, round, brief, files) => {
    setData((prev) => {
      const project = prev.projects.find((p) => p.id === projectId);
      if (!project) return prev;

      const updatedProject = { ...project };
      const now = new Date().toISOString();
      const client = prev.clients.find((c) => c.email === project.clientEmail);
      const clientName = client ? client.name : project.clientEmail;
      let notifMessage = '';

      if (phaseType === 'content_submission') {
        updatedProject.contentSubmission = {
          ...updatedProject.contentSubmission,
          status: 'submitted',
          brief: brief,
          files: files,
          submittedAt: now,
        };
        notifMessage = `${clientName} submitted content for ${project.name}.`;
      } else if (phaseType === 'revision') {
        updatedProject.revisions = updatedProject.revisions.map((r) => {
          if (r.round === round) {
            return { ...r, status: 'submitted', brief, files, submittedAt: now };
          }
          return r;
        });
        notifMessage = `${clientName} submitted revision round ${round} for ${project.name}.`;
      }

      const notification = {
        id: uuid(),
        type: 'submission',
        forEmail: FREELANCER.email,
        projectId: projectId,
        message: notifMessage,
        read: false,
        createdAt: now,
      };

      if (supabaseClient) {
        supabaseClient.from('projects').update({
          content_submission: updatedProject.contentSubmission,
          revisions: updatedProject.revisions
        }).eq('id', projectId).then(({ error }) => { if (error) console.error(error); });

        supabaseClient.from('notifications').insert([{
          id: notification.id,
          type: notification.type,
          client_email: notification.forEmail,
          project_name: project.name,
          project_id: notification.projectId,
          message: notification.message,
          read: notification.read,
          created_at: notification.createdAt
        }]).then(({ error }) => { if (error) console.error(error); });
      }

      const updated = {
        ...prev,
        projects: prev.projects.map((p) => (p.id === projectId ? updatedProject : p)),
        notifications: [notification, ...prev.notifications],
      };
      saveData(updated);
      return updated;
    });
  }, []);

  const concludeProject = useCallback((projectId, deliverableLink) => {
    const now = new Date().toISOString();
    setData((prev) => {
      const project = prev.projects.find((p) => p.id === projectId);
      if (!project) return prev;

      const updatedProject = {
        ...project,
        status: 'concluded',
        endDate: now,
        deliverableLink: deliverableLink || '',
      };

      const notification = {
        id: uuid(),
        type: 'project_concluded',
        forEmail: project.clientEmail,
        projectId: projectId,
        message: `Your project ${project.name} has been completed and delivered.${deliverableLink ? ' View your website at the deliverable link.' : ''}`,
        read: false,
        createdAt: now,
      };

      if (supabaseClient) {
        supabaseClient.from('projects').update({
          status: updatedProject.status,
          end_date: updatedProject.endDate,
          deliverable_link: updatedProject.deliverableLink
        }).eq('id', projectId).then(({ error }) => { if (error) console.error(error); });

        supabaseClient.from('notifications').insert([{
          id: notification.id,
          type: notification.type,
          client_email: notification.forEmail,
          project_name: project.name,
          project_id: notification.projectId,
          message: notification.message,
          read: notification.read,
          created_at: notification.createdAt
        }]).then(({ error }) => { if (error) console.error(error); });
      }

      const updated = {
        ...prev,
        projects: prev.projects.map((p) => (p.id === projectId ? updatedProject : p)),
        notifications: [notification, ...prev.notifications],
      };
      saveData(updated);
      return updated;
    });
  }, []);

  const updatePayment = useCallback((projectId, amountPaid) => {
    setData((prev) => {
      const updated = {
        ...prev,
        projects: prev.projects.map((p) => (p.id === projectId ? { ...p, amountPaid: amountPaid } : p)),
      };
      saveData(updated);
      return updated;
    });

    if (supabaseClient) {
      supabaseClient.from('projects').update({ amount_paid: amountPaid }).eq('id', projectId)
        .then(({ error }) => { if (error) console.error(error); });
    }
  }, []);

  const updateNotes = useCallback((projectId, notes) => {
    setData((prev) => {
      const updated = {
        ...prev,
        projects: prev.projects.map((p) => (p.id === projectId ? { ...p, notes } : p)),
      };
      saveData(updated);
      return updated;
    });

    if (supabaseClient) {
      supabaseClient.from('projects').update({ notes: notes }).eq('id', projectId)
        .then(({ error }) => { if (error) console.error(error); });
    }
  }, []);

  const markNotificationRead = useCallback((notifId) => {
    setData((prev) => {
      const updated = {
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === notifId ? { ...n, read: true } : n)),
      };
      saveData(updated);
      return updated;
    });

    if (supabaseClient) {
      supabaseClient.from('notifications').update({ read: true }).eq('id', notifId)
        .then(({ error }) => { if (error) console.error(error); });
    }
  }, []);

  const deleteProject = useCallback((projectId) => {
    setData((prev) => {
      const updated = {
        ...prev,
        projects: prev.projects.filter((p) => p.id !== projectId),
        notifications: prev.notifications.filter((n) => n.projectId !== projectId),
      };
      saveData(updated);
      return updated;
    });

    if (supabaseClient) {
      supabaseClient.from('notifications').delete().eq('project_id', projectId).then(({ error }) => {
        if (error) console.error('Supabase notifications delete error', error);
      });
      supabaseClient.from('projects').delete().eq('id', projectId).then(({ error }) => {
        if (error) console.error('Supabase project delete error', error);
      });
    }
    addToast('Project deleted successfully.', 'success');
  }, [addToast]);

  const getProjectsForClient = useCallback(
    (clientEmail) => {
      return data.projects.filter((p) => p.clientEmail === clientEmail);
    },
    [data.projects]
  );

  const getClientNotifications = useCallback(
    (email) => {
      return data.notifications.filter((n) => n.forEmail === email);
    },
    [data.notifications]
  );

  const getFreelancerNotifications = useCallback(() => {
    return data.notifications.filter((n) => n.forEmail === FREELANCER.email);
  }, [data.notifications]);

  const doResetData = useCallback(() => {
    const fresh = resetData();
    setData(fresh);
    if (supabaseClient) {
      // Clear Supabase tables
      supabaseClient.from('notifications').delete().neq('id', uuid()).then(() => {});
      supabaseClient.from('projects').delete().neq('id', uuid()).then(() => {});
      supabaseClient.from('clients').delete().neq('id', uuid()).then(() => {
        // Re-seed Supabase
        seedSupabaseDatabase(supabaseClient).then(() => {
          fetchFromSupabase(supabaseClient);
        });
      });
    }
  }, [fetchFromSupabase]);

  const value = useMemo(
    () => ({
      data,
      loading,
      isConnected,
      connectSupabase,
      addClient,
      addProject,
      updateProject,
      deliverPhase,
      submitPhase,
      concludeProject,
      updatePayment,
      updateNotes,
      markNotificationRead,
      deleteProject,
      getProjectsForClient,
      getClientNotifications,
      getFreelancerNotifications,
      resetData: doResetData,
    }),
    [data, loading, isConnected, connectSupabase, addClient, addProject, updateProject, deliverPhase, submitPhase, concludeProject, updatePayment, updateNotes, markNotificationRead, deleteProject, getProjectsForClient, getClientNotifications, getFreelancerNotifications, doResetData]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function useData() {
  return useContext(DataContext);
}


// ============================================================
// 5. COMMON COMPONENTS
// ============================================================

// ---- Modal ----
function Modal({ title, children, footer, onClose }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">{title}</div>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

// ---- StatusPill ----
function StatusPill({ label, variant }) {
  return <span className={`pill pill--${variant}`}>{label}</span>;
}

// ---- StatCard ----
function StatCard({ label, value, small }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className={`stat-card__value${small ? ' stat-card__value--sm' : ''}`}>{value}</div>
    </div>
  );
}

// ---- EmptyState ----
function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <p className="empty-state__message">{message}</p>
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ---- FileUpload ----
function FileUpload({ files, onChange }) {
  const inputRef = useRef(null);

  const handleFiles = (e) => {
    const newFiles = Array.from(e.target.files).map((f) => ({
      name: f.name,
      type: getFileType(f.name),
      size: f.size,
      uploadedAt: new Date().toISOString(),
    }));
    onChange([...files, ...newFiles]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="upload-zone">
        <input type="file" multiple onChange={handleFiles} ref={inputRef} />
        <div className="upload-zone__label">Click to upload files</div>
      </div>
      {files.length > 0 && (
        <div className="file-list" style={{ marginTop: '12px' }}>
          {files.map((file, i) => (
            <div className="file-item" key={i}>
              <span className="file-item__name">{file.name}</span>
              <span className="file-item__type">{file.type}</span>
              <span className="file-item__size">{formatFileSize(file.size)}</span>
              <button className="file-item__remove" onClick={() => removeFile(i)}>
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- FileList (read only) ----
function FileList({ files }) {
  if (!files || files.length === 0) return <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No files attached.</p>;
  return (
    <div className="file-list">
      {files.map((file, i) => (
        <div className="file-item" key={i}>
          <span className="file-item__name">{file.name}</span>
          <span className="file-item__type">{file.type}</span>
          <span className="file-item__size">{formatFileSize(file.size)}</span>
          <span className="file-item__date">{formatDate(file.uploadedAt)}</span>
        </div>
      ))}
    </div>
  );
}

// ---- ThemeToggle ----
function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'light';
  });

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('portal_theme', next);
    setTheme(next);
  };

  useEffect(() => {
    const saved = localStorage.getItem('portal_theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      setTheme(saved);
    }
  }, []);

  return (
    <button className="theme-toggle" onClick={toggle}>
      {theme === 'light' ? 'DARK' : 'LIGHT'}
    </button>
  );
}

// ---- MobileTopbar ----
function MobileTopbar({ onToggle }) {
  return (
    <div
      style={{
        display: 'none',
        padding: '12px 24px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      className="mobile-topbar"
    >
      <button className="btn btn-ghost" onClick={onToggle} style={{ padding: '4px 8px', fontSize: '18px' }}>
        MENU
      </button>
      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px' }}>PORTAL</span>
      <div style={{ width: '60px' }}></div>
    </div>
  );
}


// ============================================================
// 6. LOGIN PAGE
// ============================================================

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { data, connectSupabase, isConnected, loading } = useData();

  const [showSettings, setShowSettings] = useState(false);
  const [sbUrl, setSbUrl] = useState(() => localStorage.getItem('supabase_url') || '');
  const [sbKey, setSbKey] = useState(() => localStorage.getItem('supabase_anon_key') || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const result = login(email, password, data.clients);
    if (!result.success) {
      setError(result.error);
    } else {
      const isFreelancer = email === FREELANCER.email;
      navigate(isFreelancer ? 'dashboard' : 'client');
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    const result = await connectSupabase(sbUrl, sbKey);
    if (result.success) {
      setShowSettings(false);
    }
  };

  return (
    <div className="app-container">
      <div className="login-page">
        <div className="login-card">
          <div className="login-card__header">
            <div className="login-card__wordmark">PORTAL</div>
            <div className="login-card__subtitle">Freelancer Client Management</div>
          </div>

          {error && <div className="login-card__error">{error}</div>}

          <form className="login-card__body" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="form-input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="form-input-group__suffix"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '8px' }}>
              SIGN IN
            </button>
          </form>

          <div className="login-card__demo">
            <div style={{ marginBottom: '4px' }}>
              <strong>Freelancer:</strong> {FREELANCER.email} / {FREELANCER.password}
            </div>
            <div>
              <strong>Clients:</strong> Use any client email & password you create in the dashboard.
            </div>
          </div>
        </div>

        <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', gap: '8px', zIndex: 100 }}>
          <button 
            className="theme-toggle" 
            onClick={() => setShowSettings(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            {isConnected ? '⚡ CLOUD ACTIVE' : '⚙️ SETUP CLOUD'}
          </button>
          <ThemeToggle />
        </div>

        {showSettings && (
          <Modal title="DATABASE INTEGRATION SETTINGS" onClose={() => setShowSettings(false)}>
            <form onSubmit={handleConnect}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                Connect this client portal to your own **Supabase** database to synchronize data in real-time across your freelancer and client devices.
              </p>
              
              <div className="form-group">
                <label className="form-label">SUPABASE PROJECT URL</label>
                <input
                  type="url"
                  className="form-input"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  placeholder="https://your-project-id.supabase.co"
                />
              </div>

              <div className="form-group">
                <label className="form-label">SUPABASE ANON PUBLIC KEY</label>
                <input
                  type="text"
                  className="form-input"
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  placeholder="your-anon-public-key"
                  style={{ fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                {isConnected && (
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={() => {
                      connectSupabase('', '');
                      setSbUrl('');
                      setSbKey('');
                      setShowSettings(false);
                    }}
                    style={{ marginRight: 'auto' }}
                  >
                    DISCONNECT
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setShowSettings(false)}>
                  CANCEL
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'CONNECTING...' : 'SAVE & CONNECT'}
                </button>
              </div>

              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <details style={{ cursor: 'pointer' }}>
                  <summary style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    🛠️ SQL SCHEMA FOR SUPABASE SQL EDITOR
                  </summary>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0', lineHeight: 1.4 }}>
                    Before connecting, copy and paste this script inside your Supabase <strong>SQL Editor</strong> tab and click <strong>Run</strong> to automatically construct the required tables:
                  </p>
                  <pre style={{
                    background: 'var(--bg-primary)',
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    maxHeight: '150px',
                    whiteSpace: 'pre-wrap'
                  }}>
{`-- 1. Create Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    role TEXT DEFAULT 'client'
);

-- 2. Create Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY,
    client_email TEXT REFERENCES clients(email) ON UPDATE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    amount_agreed NUMERIC NOT NULL,
    amount_paid NUMERIC DEFAULT 0,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    deliverable_link TEXT,
    current_phase TEXT NOT NULL,
    notes TEXT,
    content_submission JSONB NOT NULL DEFAULT '{}'::jsonb,
    revisions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    type TEXT NOT NULL,
    client_email TEXT NOT NULL,
    project_name TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`}
                  </pre>
                </details>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}


// ============================================================
// 7. FREELANCER SIDEBAR + LAYOUT
// ============================================================

function FreelancerSidebar({ currentView, onNavigate }) {
  const { logout } = useAuth();
  const { data } = useData();

  const activeProjectCount = data.projects.filter((p) => p.status === 'active').length;

  const navItems = [
    { key: 'dashboard', label: 'DASHBOARD' },
    { key: 'projects', label: 'PROJECTS', badge: activeProjectCount },
    { key: 'clients', label: 'CLIENTS' },
    { key: 'archive', label: 'ARCHIVE' },
    { key: 'analytics', label: 'ANALYTICS' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__name">{FREELANCER.name}</div>
        <div className="sidebar__role">FREELANCER</div>
      </div>
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`sidebar__nav-item${currentView === item.key ? ' sidebar__nav-item--active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
            {item.badge !== undefined && item.badge > 0 && <span className="sidebar__badge">{item.badge}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar__footer">
        <ThemeToggle />
        <button className="btn-link" onClick={logout}>
          SIGN OUT
        </button>
      </div>
    </aside>
  );
}

function FreelancerLayout({ currentView, children, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      <div className="freelancer-layout">
        <div className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
          <FreelancerSidebar currentView={currentView} onNavigate={(key) => { setSidebarOpen(false); onNavigate(key); }} />
        </div>
        {sidebarOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 150,
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div style={{ gridColumn: '2' }}>
          <div
            className="mobile-topbar-wrapper"
            style={{ display: 'none' }}
          >
            <div
              style={{
                padding: '12px 24px',
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <button className="btn btn-ghost" onClick={() => setSidebarOpen(true)} style={{ padding: '4px 8px' }}>
                MENU
              </button>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px' }}>PORTAL</span>
              <div style={{ width: '60px' }}></div>
            </div>
          </div>
          <main className="main-content fade-in">{children}</main>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .mobile-topbar-wrapper { display: block !important; }
          .freelancer-layout { grid-template-columns: 1fr !important; }
          .freelancer-layout > div:nth-child(3),
          .freelancer-layout > div[style*="grid-column"] { grid-column: 1 !important; }
        }
      `}</style>
    </div>
  );
}


// ============================================================
// 8. FREELANCER DASHBOARD
// ============================================================

function FreelancerDashboard() {
  const { data, getFreelancerNotifications, markNotificationRead } = useData();

  const activeProjects = data.projects.filter((p) => p.status === 'active');
  const totalClients = data.clients.length;
  const totalEarned = data.projects.reduce((sum, p) => sum + p.amountPaid, 0);
  const pendingAmount = activeProjects.reduce((sum, p) => sum + (p.amountAgreed - p.amountPaid), 0);

  const notifications = getFreelancerNotifications();
  const unreadNotifs = notifications.filter((n) => !n.read).slice(0, 5);

  const getClientName = (email) => {
    const client = data.clients.find((c) => c.email === email);
    return client ? client.name : email;
  };

  return (
    <div className="slide-up">
      <h1 className="page-heading">DASHBOARD</h1>

      <div className="stats-grid">
        <StatCard label="ACTIVE PROJECTS" value={activeProjects.length} />
        <StatCard label="TOTAL CLIENTS" value={totalClients} />
        <StatCard label="TOTAL EARNED" value={formatCurrency(totalEarned)} small />
        <StatCard label="PENDING AMOUNT" value={formatCurrency(pendingAmount)} small />
      </div>

      <div className="section-heading">ACTIVE PROJECTS</div>
      {activeProjects.length === 0 ? (
        <EmptyState message="No active projects." actionLabel="NEW PROJECT" onAction={() => navigate('projects/new')} />
      ) : (
        <div className="table-wrapper" style={{ marginBottom: '48px' }}>
          <table className="table">
            <thead>
              <tr>
                <th>CLIENT NAME</th>
                <th>PROJECT</th>
                <th>TYPE</th>
                <th>PHASE</th>
                <th>AMOUNT</th>
                <th>PAID</th>
                <th>STARTED</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {activeProjects.map((project) => {
                const ps = getPhaseStatus(project);
                return (
                  <tr key={project.id}>
                    <td className="td-bold">{getClientName(project.clientEmail)}</td>
                    <td className="td-bold">{project.name}</td>
                    <td>{projectTypeLabels[project.type] || project.type}</td>
                    <td>
                      <StatusPill label={ps.label} variant={ps.variant} />
                    </td>
                    <td className="td-mono">{formatCurrency(project.amountAgreed)}</td>
                    <td className="td-mono">{formatCurrency(project.amountPaid)}</td>
                    <td>{formatDate(project.startDate)}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`projects/${project.id}`)}>
                        VIEW
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="section-heading">RECENT NOTIFICATIONS</div>
      {unreadNotifs.length === 0 ? (
        <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
          No new notifications.
        </div>
      ) : (
        <div className="card card--no-hover">
          {unreadNotifs.map((notif) => (
            <div
              key={notif.id}
              className={`notification-item${!notif.read ? ' notification-item--unread' : ''}`}
              onClick={() => {
                markNotificationRead(notif.id);
                if (notif.projectId) navigate(`projects/${notif.projectId}`);
              }}
            >
              {!notif.read && <div className="notification-dot"></div>}
              <div className="notification-message">{notif.message}</div>
              <div className="notification-time">{formatDate(notif.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ============================================================
// 9. FREELANCER PROJECT DETAIL
// ============================================================

function FreelancerProjectDetail({ projectId }) {
  const { data, deliverPhase, updatePayment, updateNotes, concludeProject, deleteProject } = useData();
  const { addToast } = useToast();

  const project = data.projects.find((p) => p.id === projectId);
  const client = project ? data.clients.find((c) => c.email === project.clientEmail) : null;

  const [expandedPhases, setExpandedPhases] = useState({});
  const [editingPayment, setEditingPayment] = useState(false);
  const [paymentValue, setPaymentValue] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [notesEdited, setNotesEdited] = useState(false);
  const [deliverableLink, setDeliverableLink] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteProject = () => {
    deleteProject(project.id);
    setShowDeleteModal(false);
    navigate('dashboard');
  };

  useEffect(() => {
    if (project) {
      setNotesValue(project.notes || '');
      setNotesEdited(false);
    }
  }, [project?.id, project?.notes]);

  useEffect(() => {
    if (project) {
      const autoExpand = {};
      if (project.contentSubmission.status === 'submitted') {
        autoExpand['content'] = true;
      }
      project.revisions.forEach((r) => {
        if (r.status === 'submitted') {
          autoExpand[`rev_${r.round}`] = true;
        }
      });
      setExpandedPhases(autoExpand);
    }
  }, [project?.id]);

  if (!project) {
    return (
      <div className="slide-up">
        <button className="back-link" onClick={() => navigate('dashboard')}>
          &#8592; ALL PROJECTS
        </button>
        <EmptyState message="Project not found." />
      </div>
    );
  }

  const togglePhase = (key) => {
    setExpandedPhases((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeliver = (phaseType, round) => {
    deliverPhase(project.id, phaseType, round);
    addToast(
      phaseType === 'content_submission'
        ? 'Content submission delivered. Revision Round 1 is now open.'
        : `Revision round ${round} delivered.${round < 3 ? ` Revision Round ${round + 1} is now open.` : ' All revisions complete.'}`,
      'success'
    );
  };

  const handleSavePayment = () => {
    const val = parseFloat(paymentValue);
    if (isNaN(val) || val < 0) {
      addToast('Please enter a valid amount.', 'danger');
      return;
    }
    updatePayment(project.id, val);
    setEditingPayment(false);
    addToast('Payment updated.', 'success');
  };

  const handleSaveNotes = () => {
    updateNotes(project.id, notesValue);
    setNotesEdited(false);
    addToast('Notes saved.', 'success');
  };

  const handleConclude = () => {
    concludeProject(project.id, deliverableLink);
    addToast('Project concluded and archived.', 'success');
    navigate('archive');
  };

  const balance = project.amountAgreed - project.amountPaid;
  const ps = getPhaseStatus(project);
  const allDelivered =
    project.contentSubmission.status === 'delivered' && project.revisions.every((r) => r.status === 'delivered');
  const canConclude = project.currentPhase === 'completed' && project.status === 'active';

  // Phase step renderer
  const renderPhaseStep = (number, name, key, status, brief, files, submittedAt, deliveredAt, onDeliver) => {
    const isExpanded = expandedPhases[key];
    const isLocked = status === 'locked';

    return (
      <div className={`phase-step${isLocked ? ' phase-step--locked' : ''}`} key={key}>
        <div className="phase-step__header" onClick={() => !isLocked && togglePhase(key)}>
          <span className="phase-step__number">{number}</span>
          <span className="phase-step__name">{name}</span>
          {status === 'delivered' && <StatusPill label="DELIVERED" variant="success" />}
          {status === 'submitted' && <StatusPill label="SUBMITTED" variant="warning" />}
          {status === 'pending_client' && <StatusPill label="PENDING" variant="gray" />}
          {status === 'locked' && <StatusPill label="LOCKED" variant="gray" />}
        </div>

        {isLocked && (
          <div className="phase-step__content">
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Locked -- This phase will unlock after the previous phase is delivered.
            </p>
          </div>
        )}

        {status === 'pending_client' && !isLocked && (
          <div className="phase-step__content">
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Waiting for client submission.
            </p>
          </div>
        )}

        {status === 'submitted' && isExpanded && (
          <div className="phase-step__content">
            {brief && <div className="phase-step__brief">{brief}</div>}
            <div style={{ marginBottom: '16px' }}>
              <div className="form-label" style={{ marginBottom: '8px' }}>FILES</div>
              <FileList files={files} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Submitted on {formatDate(submittedAt)}
            </p>
            <button className="btn btn-primary btn-full" onClick={onDeliver}>
              MARK AS DELIVERED + NOTIFY CLIENT
            </button>
          </div>
        )}

        {status === 'delivered' && isExpanded && (
          <div className="phase-step__content">
            {brief && <div className="phase-step__brief">{brief}</div>}
            <FileList files={files} />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
              Delivered on {formatDate(deliveredAt)}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="slide-up">
      <button className="back-link" onClick={() => navigate('dashboard')}>
        &#8592; ALL PROJECTS
      </button>

      <div className="project-header">
        <div>
          <h1 className="page-heading" style={{ marginBottom: '4px' }}>
            {project.name}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {client ? client.name : project.clientEmail}
            {client && ` -- ${client.email}`}
          </p>
        </div>
        <div className="project-header__meta">
          <StatusPill label={projectTypeLabels[project.type] || project.type} variant="dark" />
          <StatusPill
            label={project.status === 'active' ? 'ACTIVE' : 'CONCLUDED'}
            variant={project.status === 'active' ? 'success' : 'gray'}
          />
        </div>
      </div>

      <div className="project-detail-grid">
        {/* Left column: Phase Tracker */}
        <div>
          <div className="section-heading" style={{ marginBottom: '16px' }}>PHASE TRACKER</div>
          <div className="phase-tracker">
            {renderPhaseStep(
              1,
              'Content Submission',
              'content',
              project.contentSubmission.status,
              project.contentSubmission.brief,
              project.contentSubmission.files,
              project.contentSubmission.submittedAt,
              project.contentSubmission.deliveredAt,
              () => handleDeliver('content_submission', null)
            )}

            {project.revisions.map((rev) =>
              renderPhaseStep(
                rev.round + 1,
                `Revision Round ${rev.round}`,
                `rev_${rev.round}`,
                rev.status,
                rev.brief,
                rev.files,
                rev.submittedAt,
                rev.deliveredAt,
                () => handleDeliver('revision', rev.round)
              )
            )}

            <div className={`phase-step${project.currentPhase === 'completed' ? '' : ' phase-step--locked'}`}>
              <div className="phase-step__header">
                <span className="phase-step__number">5</span>
                <span className="phase-step__name">Completed</span>
                {project.currentPhase === 'completed' && <StatusPill label="READY" variant="success" />}
                {project.currentPhase !== 'completed' && <StatusPill label="LOCKED" variant="gray" />}
              </div>
              {project.currentPhase === 'completed' && project.status !== 'concluded' && (
                <div className="phase-step__content">
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    All phases have been delivered. You can now conclude and archive this project.
                  </p>
                </div>
              )}
              {project.status === 'concluded' && (
                <div className="phase-step__content">
                  <p style={{ fontSize: '13px', color: 'var(--success)' }}>
                    Project concluded on {formatDate(project.endDate)}.
                  </p>
                  {project.deliverableLink && (
                    <p style={{ fontSize: '13px', marginTop: '8px' }}>
                      Deliverable:{' '}
                      <a
                        href={project.deliverableLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}
                      >
                        {project.deliverableLink}
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Conclude section */}
          {canConclude && (
            <div className="card" style={{ marginTop: '32px', padding: '24px' }}>
              <div className="section-heading">CONCLUDE PROJECT</div>
              <div className="form-group">
                <label className="form-label">DELIVERABLE LINK</label>
                <input
                  type="url"
                  className="form-input"
                  value={deliverableLink}
                  onChange={(e) => setDeliverableLink(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <button className="btn btn-success btn-full" onClick={handleConclude}>
                CONCLUDE + ARCHIVE PROJECT
              </button>
            </div>
          )}
        </div>

        {/* Right column: Project Details Card */}
        <div className="card card--no-hover" style={{ position: 'sticky', top: '24px' }}>
          <div className="card__header">
            <div className="section-heading" style={{ marginBottom: 0 }}>PROJECT DETAILS</div>
          </div>
          <div className="card__body">
            <div className="detail-card__row">
              <span className="detail-card__key">PROJECT TYPE</span>
              <span className="detail-card__value">{projectTypeLabels[project.type] || project.type}</span>
            </div>
            <div className="detail-card__row">
              <span className="detail-card__key">STARTED</span>
              <span className="detail-card__value">{formatDate(project.startDate)}</span>
            </div>
            {project.endDate && (
              <div className="detail-card__row">
                <span className="detail-card__key">CONCLUDED</span>
                <span className="detail-card__value">{formatDate(project.endDate)}</span>
              </div>
            )}
            <div className="detail-card__row">
              <span className="detail-card__key">AMOUNT AGREED</span>
              <span className="detail-card__value">{formatCurrency(project.amountAgreed)}</span>
            </div>
            <div className="detail-card__row">
              <span className="detail-card__key">AMOUNT PAID</span>
              <span className="detail-card__value">
                {editingPayment ? (
                  <div className="inline-edit">
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '120px', padding: '6px 10px' }}
                      value={paymentValue}
                      onChange={(e) => setPaymentValue(e.target.value)}
                      autoFocus
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleSavePayment}>SAVE</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingPayment(false)}>x</button>
                  </div>
                ) : (
                  <span
                    style={{ cursor: 'pointer', borderBottom: '1px dashed var(--gray-300)' }}
                    onClick={() => {
                      setPaymentValue(String(project.amountPaid));
                      setEditingPayment(true);
                    }}
                    title="Click to edit"
                  >
                    {formatCurrency(project.amountPaid)}
                  </span>
                )}
              </span>
            </div>
            <div className="detail-card__row">
              <span className="detail-card__key">BALANCE</span>
              <span className={`detail-card__value${balance > 0 ? ' detail-card__value--danger' : ''}`}>
                {formatCurrency(balance)}
              </span>
            </div>

            <hr className="divider" />

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label">NOTES</label>
              <textarea
                className="form-input"
                style={{ minHeight: '100px' }}
                value={notesValue}
                onChange={(e) => {
                  setNotesValue(e.target.value);
                  setNotesEdited(true);
                }}
              />
            </div>
            {notesEdited && (
              <button className="btn btn-secondary btn-sm" onClick={handleSaveNotes} style={{ marginBottom: '16px' }}>
                SAVE NOTES
              </button>
            )}

            <hr className="divider" style={{ margin: '24px 0 16px 0' }} />

            <div>
              <button
                className="btn btn-danger btn-full"
                onClick={() => setShowDeleteModal(true)}
              >
                DELETE PROJECT
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <Modal
          title="DELETE PROJECT"
          onClose={() => setShowDeleteModal(false)}
          footer={
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                CANCEL
              </button>
              <button className="btn btn-danger" onClick={handleDeleteProject}>
                DELETE PERMANENTLY
              </button>
            </div>
          }
        >
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
              Are you sure you want to permanently delete this project? This will remove all files, briefs, and revision rounds from local storage and the database.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--danger)', marginTop: '12px', fontWeight: 'bold' }}>
              WARNING: This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ============================================================
// 10. NEW PROJECT FORM
// ============================================================

function NewProjectForm() {
  const { data, addClient, addProject } = useData();
  const { addToast } = useToast();

  const [clientMode, setClientMode] = useState('existing');
  const [selectedClientEmail, setSelectedClientEmail] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('');
  const [amountAgreed, setAmountAgreed] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (clientMode === 'existing' && !selectedClientEmail) errs.client = 'Select a client';
    if (clientMode === 'new') {
      if (!newClientEmail.trim()) {
        errs.clientEmail = 'Client email is required';
      } else {
        const exists = data.clients.find((c) => c.email.toLowerCase() === newClientEmail.trim().toLowerCase());
        if (exists) errs.clientEmail = 'A client with this email already exists';
      }
    }
    if (!projectName.trim()) errs.projectName = 'Project name is required';
    if (!projectType) errs.projectType = 'Select a project type';
    if (!amountAgreed || parseFloat(amountAgreed) <= 0) errs.amountAgreed = 'Enter a valid amount';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    let clientEmail = selectedClientEmail;

    if (clientMode === 'new') {
      clientEmail = newClientEmail.trim().toLowerCase();
      const derivedName = newClientName.trim() || clientEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const derivedPassword = newClientPassword.trim() || 'client123';
      addClient({
        name: derivedName,
        email: clientEmail,
        phone: newClientPhone.trim(),
        password: derivedPassword,
      });
    }

    const projectId = addProject({
      clientEmail,
      name: projectName.trim(),
      type: projectType,
      amountAgreed: parseFloat(amountAgreed),
      amountPaid: parseFloat(amountPaid) || 0,
      startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      notes: notes.trim(),
    });

    addToast('Project created. Client notified.', 'success');
    navigate(`projects/${projectId}`);
  };

  const handleClientDropdown = (val) => {
    if (val === '__new__') {
      setClientMode('new');
      setSelectedClientEmail('');
    } else {
      setClientMode('existing');
      setSelectedClientEmail(val);
    }
  };

  return (
    <div className="slide-up">
      <button className="back-link" onClick={() => navigate('dashboard')}>
        &#8592; BACK
      </button>
      <h1 className="page-heading">NEW PROJECT</h1>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div className="form-group">
          <label className="form-label">CLIENT</label>
          <select
            className="form-input"
            value={clientMode === 'new' ? '__new__' : selectedClientEmail}
            onChange={(e) => handleClientDropdown(e.target.value)}
          >
            <option value="">-- Select client --</option>
            {data.clients.map((c) => (
              <option key={c.email} value={c.email}>
                {c.name} ({c.email})
              </option>
            ))}
            <option value="__new__">+ Add new client</option>
          </select>
          {errors.client && <div className="form-error">{errors.client}</div>}
          {clientMode === 'existing' && selectedClientEmail && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {selectedClientEmail}
            </p>
          )}
        </div>

        {clientMode === 'new' && (
          <div className="card card--no-hover" style={{ padding: '24px', marginBottom: '20px' }}>
            <div className="section-heading" style={{ marginBottom: '16px' }}>NEW CLIENT</div>
            <div className="form-group">
              <label className="form-label">EMAIL</label>
              <input
                type="email"
                className="form-input"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="client@example.com"
                required
              />
              {errors.clientEmail && <div className="form-error">{errors.clientEmail}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">NAME (OPTIONAL)</label>
              <input
                type="text"
                className="form-input"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Client name (auto-derived if left blank)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">PHONE (OPTIONAL)</label>
              <input
                type="text"
                className="form-input"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">PASSWORD (OPTIONAL)</label>
              <input
                type="text"
                className="form-input"
                value={newClientPassword}
                onChange={(e) => setNewClientPassword(e.target.value)}
                placeholder="Password (defaults to 'client123' if left blank)"
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                If left blank, the password will default to <strong>client123</strong> so the client can log in immediately.
              </p>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">PROJECT NAME</label>
          <input
            type="text"
            className="form-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. My Awesome Website"
          />
          {errors.projectName && <div className="form-error">{errors.projectName}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">PROJECT TYPE</label>
          <select className="form-input" value={projectType} onChange={(e) => setProjectType(e.target.value)}>
            <option value="">-- Select type --</option>
            <option value="ecommerce">E-commerce Website</option>
            <option value="landing">Landing Page</option>
            <option value="portfolio">Portfolio Website</option>
            <option value="business">Business Website</option>
            <option value="blog">Blog</option>
            <option value="webapp">Custom Web App</option>
            <option value="other">Other</option>
          </select>
          {errors.projectType && <div className="form-error">{errors.projectType}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">AMOUNT AGREED</label>
            <div className="form-input-group">
              <span className="form-input-group__prefix">&#8377;</span>
              <input
                type="number"
                className="form-input"
                value={amountAgreed}
                onChange={(e) => setAmountAgreed(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            {errors.amountAgreed && <div className="form-error">{errors.amountAgreed}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">AMOUNT PAID</label>
            <div className="form-input-group">
              <span className="form-input-group__prefix">&#8377;</span>
              <input
                type="number"
                className="form-input"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">START DATE</label>
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">NOTES (OPTIONAL)</label>
          <textarea
            className="form-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any internal notes about this project..."
            style={{ minHeight: '80px' }}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '8px' }}>
          CREATE PROJECT + SEND CLIENT ACCESS
        </button>
      </form>
    </div>
  );
}


// ============================================================
// 11. CLIENTS LIST + CLIENT PROFILE
// ============================================================

function ClientsList() {
  const { data } = useData();
  const [search, setSearch] = useState('');

  const filtered = data.clients.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <div className="slide-up">
      <h1 className="page-heading">CLIENTS</h1>

      <div className="search-bar">
        <input
          type="text"
          className="form-input search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No clients found." />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>ACTIVE PROJECTS</th>
                <th>TOTAL PROJECTS</th>
                <th>JOINED</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const clientProjects = data.projects.filter((p) => p.clientEmail === client.email);
                const activeCount = clientProjects.filter((p) => p.status === 'active').length;
                return (
                  <tr key={client.id}>
                    <td
                      className="td-bold"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`clients/${client.id}`)}
                    >
                      {client.name}
                    </td>
                    <td>{client.email}</td>
                    <td>{client.phone || '--'}</td>
                    <td>{activeCount}</td>
                    <td>{clientProjects.length}</td>
                    <td>{formatDate(client.joinedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ClientProfile({ clientId }) {
  const { data } = useData();

  const client = data.clients.find((c) => c.id === clientId);

  if (!client) {
    return (
      <div className="slide-up">
        <button className="back-link" onClick={() => navigate('clients')}>
          &#8592; ALL CLIENTS
        </button>
        <EmptyState message="Client not found." />
      </div>
    );
  }

  const clientProjects = data.projects.filter((p) => p.clientEmail === client.email);

  return (
    <div className="slide-up">
      <button className="back-link" onClick={() => navigate('clients')}>
        &#8592; ALL CLIENTS
      </button>

      <h1 className="page-heading">{client.name}</h1>

      <div style={{ display: 'flex', gap: '32px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <div>
          <span className="form-label" style={{ display: 'block', marginBottom: '4px' }}>EMAIL</span>
          <span style={{ fontSize: '14px' }}>{client.email}</span>
        </div>
        <div>
          <span className="form-label" style={{ display: 'block', marginBottom: '4px' }}>PHONE</span>
          <span style={{ fontSize: '14px' }}>{client.phone || '--'}</span>
        </div>
        <div>
          <span className="form-label" style={{ display: 'block', marginBottom: '4px' }}>JOINED</span>
          <span style={{ fontSize: '14px' }}>{formatDate(client.joinedAt)}</span>
        </div>
      </div>

      <div className="section-heading">PROJECTS</div>
      {clientProjects.length === 0 ? (
        <EmptyState
          message="No projects for this client yet."
          actionLabel="NEW PROJECT"
          onAction={() => navigate('projects/new')}
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>PROJECT NAME</th>
                <th>TYPE</th>
                <th>STATUS</th>
                <th>PHASE</th>
                <th>AMOUNT</th>
                <th>PAID</th>
                <th>STARTED</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {clientProjects.map((project) => {
                const ps = getPhaseStatus(project);
                return (
                  <tr key={project.id}>
                    <td className="td-bold">{project.name}</td>
                    <td>{projectTypeLabels[project.type] || project.type}</td>
                    <td>
                      <StatusPill
                        label={project.status === 'active' ? 'ACTIVE' : 'CONCLUDED'}
                        variant={project.status === 'active' ? 'success' : 'gray'}
                      />
                    </td>
                    <td>
                      <StatusPill label={ps.label} variant={ps.variant} />
                    </td>
                    <td className="td-mono">{formatCurrency(project.amountAgreed)}</td>
                    <td className="td-mono">{formatCurrency(project.amountPaid)}</td>
                    <td>{formatDate(project.startDate)}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`projects/${project.id}`)}>
                        VIEW
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ============================================================
// 12. ARCHIVE
// ============================================================

function ArchivePage() {
  const { data } = useData();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const concludedProjects = data.projects.filter((p) => p.status === 'concluded');

  const filtered = concludedProjects.filter((p) => {
    const q = search.toLowerCase();
    const client = data.clients.find((c) => c.email === p.clientEmail);
    const clientName = client ? client.name.toLowerCase() : '';
    const matchesSearch = p.name.toLowerCase().includes(q) || clientName.includes(q);
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getClientName = (email) => {
    const client = data.clients.find((c) => c.email === email);
    return client ? client.name : email;
  };

  return (
    <div className="slide-up">
      <h1 className="page-heading">ARCHIVE</h1>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '-24px', marginBottom: '32px' }}>
        All concluded projects
      </p>

      <div className="search-bar">
        <input
          type="text"
          className="form-input search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client or project name..."
        />
        <select className="form-input" style={{ width: '200px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="ecommerce">E-commerce Website</option>
          <option value="landing">Landing Page</option>
          <option value="portfolio">Portfolio Website</option>
          <option value="business">Business Website</option>
          <option value="blog">Blog</option>
          <option value="webapp">Custom Web App</option>
          <option value="other">Other</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No concluded projects found." />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>CLIENT</th>
                <th>PROJECT NAME</th>
                <th>TYPE</th>
                <th>AMOUNT</th>
                <th>PAID</th>
                <th>STARTED</th>
                <th>CONCLUDED</th>
                <th>DURATION</th>
                <th>REVISIONS</th>
                <th>DELIVERABLE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => {
                const duration = project.endDate && project.startDate ? daysBetween(project.startDate, project.endDate) : '--';
                const revUsed = revisionsUsed(project);
                return (
                  <tr key={project.id}>
                    <td className="td-bold">{getClientName(project.clientEmail)}</td>
                    <td className="td-bold">{project.name}</td>
                    <td>{projectTypeLabels[project.type] || project.type}</td>
                    <td className="td-mono">{formatCurrency(project.amountAgreed)}</td>
                    <td className="td-mono">{formatCurrency(project.amountPaid)}</td>
                    <td>{formatDate(project.startDate)}</td>
                    <td>{formatDate(project.endDate)}</td>
                    <td>{duration !== '--' ? `${duration} days` : '--'}</td>
                    <td>{revUsed} / 3</td>
                    <td>
                      {project.deliverableLink ? (
                        <a
                          href={project.deliverableLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--text-primary)', textDecoration: 'underline', fontSize: '13px' }}
                        >
                          View
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ============================================================
// 13. ANALYTICS
// ============================================================

function AnalyticsPage() {
  const { data } = useData();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState({ from: '', to: '', type: 'all' });

  const applyFilters = () => {
    setAppliedFilters({ from: fromDate, to: toDate, type: typeFilter });
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setTypeFilter('all');
    setAppliedFilters({ from: '', to: '', type: 'all' });
  };

  const concludedProjects = useMemo(() => {
    return data.projects.filter((p) => {
      if (p.status !== 'concluded') return false;
      if (appliedFilters.type !== 'all' && p.type !== appliedFilters.type) return false;
      if (appliedFilters.from && p.endDate && new Date(p.endDate) < new Date(appliedFilters.from)) return false;
      if (appliedFilters.to && p.endDate && new Date(p.endDate) > new Date(appliedFilters.to + 'T23:59:59')) return false;
      return true;
    });
  }, [data.projects, appliedFilters]);

  const totalEarned = concludedProjects.reduce((s, p) => s + p.amountPaid, 0);
  const avgValue = concludedProjects.length > 0 ? Math.round(totalEarned / concludedProjects.length) : 0;
  const avgDuration =
    concludedProjects.length > 0
      ? Math.round(
          concludedProjects.reduce((s, p) => s + (p.endDate && p.startDate ? daysBetween(p.startDate, p.endDate) : 0), 0) /
            concludedProjects.length
        )
      : 0;

  // Monthly earnings data
  const monthlyData = useMemo(() => {
    const months = {};
    concludedProjects.forEach((p) => {
      if (!p.endDate) return;
      const d = new Date(p.endDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(d);
      if (!months[key]) months[key] = { key, label, amount: 0 };
      months[key].amount += p.amountPaid;
    });
    return Object.values(months).sort((a, b) => a.key.localeCompare(b.key));
  }, [concludedProjects]);

  // Project type breakdown
  const typeBreakdown = useMemo(() => {
    const types = {};
    concludedProjects.forEach((p) => {
      const label = projectTypeLabels[p.type] || p.type;
      if (!types[p.type]) types[p.type] = { type: p.type, label, count: 0 };
      types[p.type].count++;
    });
    return Object.values(types).sort((a, b) => b.count - a.count);
  }, [concludedProjects]);

  const maxTypeCount = typeBreakdown.length > 0 ? Math.max(...typeBreakdown.map((t) => t.count)) : 1;

  const getClientName = (email) => {
    const client = data.clients.find((c) => c.email === email);
    return client ? client.name : email;
  };

  // SVG Bar Chart
  const chartWidth = 500;
  const chartHeight = 200;
  const chartPadding = { top: 20, right: 20, bottom: 40, left: 20 };

  const maxAmount = monthlyData.length > 0 ? Math.max(...monthlyData.map((m) => m.amount)) : 1;
  const barGap = 8;
  const availableWidth = chartWidth - chartPadding.left - chartPadding.right;
  const barWidth = monthlyData.length > 0 ? Math.max(20, (availableWidth - barGap * (monthlyData.length - 1)) / monthlyData.length) : 40;
  const availableHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const [hoveredBar, setHoveredBar] = useState(null);

  return (
    <div className="slide-up">
      <h1 className="page-heading">ANALYTICS</h1>

      {/* Filter bar */}
      <div className="search-bar" style={{ marginBottom: '32px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">FROM</label>
          <input type="date" className="form-input" style={{ width: '160px' }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">TO</label>
          <input type="date" className="form-input" style={{ width: '160px' }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">PROJECT TYPE</label>
          <select className="form-input" style={{ width: '200px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="ecommerce">E-commerce Website</option>
            <option value="landing">Landing Page</option>
            <option value="portfolio">Portfolio Website</option>
            <option value="business">Business Website</option>
            <option value="blog">Blog</option>
            <option value="webapp">Custom Web App</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', paddingTop: '22px' }}>
          <button className="btn btn-primary btn-sm" onClick={applyFilters}>APPLY</button>
          <button className="btn btn-secondary btn-sm" onClick={resetFilters}>RESET</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard label="PROJECTS COMPLETED" value={concludedProjects.length} />
        <StatCard label="TOTAL EARNED" value={formatCurrency(totalEarned)} small />
        <StatCard label="AVG PROJECT VALUE" value={formatCurrency(avgValue)} small />
        <StatCard label="AVG DURATION" value={`${avgDuration} days`} />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Monthly Earnings Bar Chart */}
        <div className="chart-card">
          <div className="chart-card__title">MONTHLY EARNINGS</div>
          {monthlyData.length === 0 ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No data available
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="bar-chart" style={{ width: '100%', height: 'auto' }}>
                {monthlyData.map((month, i) => {
                  const barH = (month.amount / maxAmount) * availableHeight;
                  const x = chartPadding.left + i * (barWidth + barGap);
                  const y = chartPadding.top + availableHeight - barH;
                  return (
                    <g key={month.key}>
                      <rect
                        className="bar-chart__bar"
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barH}
                        onMouseEnter={() => setHoveredBar(i)}
                        onMouseLeave={() => setHoveredBar(null)}
                      />
                      <text
                        className="bar-chart__label"
                        x={x + barWidth / 2}
                        y={chartHeight - 8}
                        textAnchor="middle"
                      >
                        {month.label}
                      </text>
                      {hoveredBar === i && (
                        <text
                          className="bar-chart__value"
                          x={x + barWidth / 2}
                          y={y - 8}
                          textAnchor="middle"
                        >
                          {formatCurrency(month.amount)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Project Types Breakdown */}
        <div className="chart-card">
          <div className="chart-card__title">PROJECT TYPES BREAKDOWN</div>
          {typeBreakdown.length === 0 ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No data available
            </div>
          ) : (
            <div>
              {typeBreakdown.map((item) => {
                const pct = concludedProjects.length > 0 ? Math.round((item.count / concludedProjects.length) * 100) : 0;
                return (
                  <div className="h-bar" key={item.type}>
                    <div className="h-bar__header">
                      <span className="h-bar__name">{item.label}</span>
                      <span className="h-bar__count">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-bar__track">
                      <div className="h-bar__fill" style={{ width: `${(item.count / maxTypeCount) * 100}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Revision Usage Table */}
      <div className="section-heading">REVISION USAGE</div>
      {concludedProjects.length === 0 ? (
        <EmptyState message="No concluded projects to analyze." />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>PROJECT</th>
                <th>CLIENT</th>
                <th>TYPE</th>
                <th>REVISIONS USED</th>
                <th>AMOUNT</th>
                <th>CONCLUDED</th>
              </tr>
            </thead>
            <tbody>
              {concludedProjects.map((project) => {
                const revUsed = revisionsUsed(project);
                let revVariant = 'success';
                if (revUsed === 2) revVariant = 'warning';
                if (revUsed >= 3) revVariant = 'danger';
                return (
                  <tr key={project.id}>
                    <td className="td-bold">{project.name}</td>
                    <td>{getClientName(project.clientEmail)}</td>
                    <td>{projectTypeLabels[project.type] || project.type}</td>
                    <td>
                      <StatusPill label={`${revUsed} / 3`} variant={revVariant} />
                    </td>
                    <td className="td-mono">{formatCurrency(project.amountAgreed)}</td>
                    <td>{formatDate(project.endDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ============================================================
// 14. CLIENT VIEWS
// ============================================================

// ---- Client Layout ----
function ClientLayout() {
  const { user, logout } = useAuth();
  const { data, getProjectsForClient, getClientNotifications, markNotificationRead } = useData();

  const clientProjects = getProjectsForClient(user.email);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Hash-based routing for client
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('client/')) {
        const pid = hash.replace('client/', '');
        setSelectedProjectId(pid);
      } else {
        setSelectedProjectId(null);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // If only one project, show it directly
  useEffect(() => {
    if (clientProjects.length === 1 && !selectedProjectId) {
      setSelectedProjectId(clientProjects[0].id);
    }
  }, [clientProjects, selectedProjectId]);

  const selectedProject = selectedProjectId ? data.projects.find((p) => p.id === selectedProjectId) : null;

  const notifications = getClientNotifications(user.email);
  const latestUnread = notifications.find((n) => !n.read);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const dismissBanner = () => {
    if (latestUnread) markNotificationRead(latestUnread.id);
    setBannerDismissed(true);
  };

  return (
    <div className="app-container">
      <div className="client-layout">
        {/* Top bar */}
        <div className="client-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {selectedProject && clientProjects.length > 1 && (
              <button className="btn-link" onClick={() => { setSelectedProjectId(null); navigate('client'); }}>
                &#8592; PROJECTS
              </button>
            )}
            {clientProjects.length > 1 && !selectedProject ? (
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px' }}>
                MY PROJECTS
              </span>
            ) : selectedProject ? (
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px' }}>
                {selectedProject.name}
              </span>
            ) : (
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px' }}>
                PORTAL
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Managed by {FREELANCER.name}
            </span>
            <ThemeToggle />
            <button className="btn-link" onClick={logout}>
              SIGN OUT
            </button>
          </div>
        </div>

        {/* Notification banner */}
        {latestUnread && !bannerDismissed && (
          <div className="notification-banner">
            <span className="notification-banner__text">{latestUnread.message}</span>
            <button className="notification-banner__dismiss" onClick={dismissBanner}>
              x
            </button>
          </div>
        )}

        {/* Content */}
        <div className="client-content fade-in">
          {!selectedProject && clientProjects.length > 1 ? (
            <ClientProjectList
              projects={clientProjects}
              onSelect={(id) => {
                setSelectedProjectId(id);
                navigate(`client/${id}`);
              }}
            />
          ) : selectedProject ? (
            <ClientProjectView project={selectedProject} />
          ) : (
            <EmptyState message="No projects found. Please contact your designer." />
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Client Project List ----
function ClientProjectList({ projects, onSelect }) {
  return (
    <div className="slide-up">
      <h1 className="page-heading">YOUR PROJECTS</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {projects.map((project) => {
          const ps = getPhaseStatus(project);
          return (
            <div
              key={project.id}
              className="card"
              style={{ cursor: 'pointer', padding: '24px' }}
              onClick={() => onSelect(project.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', letterSpacing: '-0.03em' }}>
                  {project.name}
                </h3>
                <StatusPill
                  label={project.status === 'active' ? 'ACTIVE' : 'CONCLUDED'}
                  variant={project.status === 'active' ? 'success' : 'gray'}
                />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {projectTypeLabels[project.type] || project.type}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <StatusPill label={ps.label} variant={ps.variant} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{formatCurrency(project.amountAgreed)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Client Project View ----
function ClientProjectView({ project }) {
  const { submitPhase } = useData();
  const { addToast } = useToast();

  // Progress bar steps
  const steps = [
    { key: 'content', label: 'CONTENT' },
    { key: 'rev1', label: 'REV 1' },
    { key: 'rev2', label: 'REV 2' },
    { key: 'rev3', label: 'REV 3' },
    { key: 'done', label: 'DONE' },
  ];

  const getStepState = (stepKey) => {
    const cp = project.currentPhase;
    const phaseOrder = ['content_submission', 'revision_1', 'revision_2', 'revision_3', 'completed'];
    const stepPhaseMap = { content: 'content_submission', rev1: 'revision_1', rev2: 'revision_2', rev3: 'revision_3', done: 'completed' };
    const stepPhase = stepPhaseMap[stepKey];
    const currentIdx = phaseOrder.indexOf(cp);
    const stepIdx = phaseOrder.indexOf(stepPhase);

    if (project.status === 'concluded') return 'completed';
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'locked';
  };

  // Determine current active phase card
  const renderCurrentPhase = () => {
    const cp = project.currentPhase;

    if (project.status === 'concluded' || cp === 'completed') {
      return (
        <ConcludedCard
          project={project}
        />
      );
    }

    if (cp === 'content_submission') {
      return (
        <ClientPhaseCard
          project={project}
          phaseType="content_submission"
          round={null}
          title="CONTENT SUBMISSION"
          phaseData={project.contentSubmission}
          description="Upload your brand assets, content, and detailed brief for your project. Once submitted, this cannot be edited."
        />
      );
    }

    if (cp.startsWith('revision_')) {
      const roundNum = parseInt(cp.split('_')[1]);
      const rev = project.revisions[roundNum - 1];
      return (
        <ClientPhaseCard
          project={project}
          phaseType="revision"
          round={roundNum}
          title={`REVISION ROUND ${roundNum}`}
          phaseData={rev}
          description={`Review the delivered design and submit any changes or feedback for revision round ${roundNum}. Once submitted, this cannot be edited.`}
        />
      );
    }

    return null;
  };

  // Render previously delivered phases
  const renderDeliveredPhases = () => {
    const phases = [];

    // Check content submission
    if (project.contentSubmission.status === 'delivered' && project.currentPhase !== 'content_submission') {
      phases.push(
        <DeliveredPhaseCard
          key="content"
          title="CONTENT SUBMISSION"
          brief={project.contentSubmission.brief}
          files={project.contentSubmission.files}
          deliveredAt={project.contentSubmission.deliveredAt}
        />
      );
    }

    // Check delivered revisions
    project.revisions.forEach((rev) => {
      if (rev.status === 'delivered' && project.currentPhase !== `revision_${rev.round}`) {
        phases.push(
          <DeliveredPhaseCard
            key={`rev_${rev.round}`}
            title={`REVISION ROUND ${rev.round}`}
            brief={rev.brief}
            files={rev.files}
            deliveredAt={rev.deliveredAt}
          />
        );
      }
    });

    // Check locked revisions
    project.revisions.forEach((rev) => {
      if (rev.status === 'locked') {
        phases.push(
          <div key={`locked_${rev.round}`} className="card card--no-hover" style={{ padding: '24px', marginTop: '16px', opacity: 0.5 }}>
            <div className="section-heading" style={{ marginBottom: '8px' }}>REVISION ROUND {rev.round}</div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              LOCKED -- This revision round will unlock after your designer delivers the previous round.
            </p>
          </div>
        );
      }
    });

    return phases;
  };

  return (
    <div className="slide-up">
      <h1 className="page-heading">{project.name}</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '-24px', marginBottom: '32px' }}>
        Managed by {FREELANCER.name} &middot; {FREELANCER.email}
      </p>

      {/* Progress bar */}
      <div className="progress-bar">
        {steps.map((step, i) => {
          const state = getStepState(step.key);
          return (
            <div key={step.key} className={`progress-step progress-step--${state}`}>
              <div className="progress-step__marker">{i + 1}</div>
              <div className="progress-step__label">{step.label}</div>
              {i < steps.length - 1 && <div className="progress-step__connector"></div>}
            </div>
          );
        })}
      </div>

      {/* Current phase card */}
      {renderCurrentPhase()}

      {/* Previous phases */}
      <div style={{ marginTop: '32px' }}>
        {renderDeliveredPhases()}
      </div>
    </div>
  );
}

// ---- Client Phase Card ----
function ClientPhaseCard({ project, phaseType, round, title, phaseData, description }) {
  const { submitPhase } = useData();
  const { addToast } = useToast();

  const [brief, setBrief] = useState('');
  const [files, setFiles] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const status = phaseData.status;

  const handleSubmit = () => {
    submitPhase(
      project.id,
      phaseType,
      round,
      brief,
      files
    );
    setShowConfirm(false);
    addToast('Submission locked and sent to your designer.', 'success');
  };

  // pending_client — client needs to submit
  if (status === 'pending_client') {
    return (
      <div className="card card--no-hover" style={{ padding: '32px' }}>
        <div className="section-heading" style={{ marginBottom: '8px' }}>{title}</div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.7 }}>
          {description}
        </p>

        <div className="form-group">
          <label className="form-label">UPLOAD FILES</label>
          <FileUpload files={files} onChange={setFiles} />
        </div>

        <div className="form-group">
          <label className="form-label">DETAILED BRIEF</label>
          <textarea
            className="form-input"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Describe your requirements, preferences, and any specific instructions..."
            style={{ minHeight: '140px' }}
          />
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={() => setShowConfirm(true)}
          disabled={!brief.trim()}
        >
          LOCK + SUBMIT
        </button>

        {showConfirm && (
          <Modal
            title="Confirm Submission"
            onClose={() => setShowConfirm(false)}
            footer={
              <>
                <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                  GO BACK
                </button>
                <button className="btn btn-primary" onClick={handleSubmit}>
                  YES, LOCK IT
                </button>
              </>
            }
          >
            <p>Are you sure? Once you lock this submission, it cannot be edited.</p>
          </Modal>
        )}
      </div>
    );
  }

  // submitted — waiting for freelancer
  if (status === 'submitted') {
    return (
      <div className="card card--no-hover" style={{ padding: '32px' }}>
        <div className="section-heading" style={{ marginBottom: '8px' }}>{title}</div>
        <StatusPill label="SUBMITTED" variant="warning" />
        <div style={{ marginTop: '16px' }}>
          {phaseData.brief && <div className="phase-step__brief">{phaseData.brief}</div>}
          <FileList files={phaseData.files} />
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px' }}>
            Submitted on {formatDate(phaseData.submittedAt)}. Your designer is working on this.
          </p>
        </div>
      </div>
    );
  }

  // delivered — freelancer delivered this round
  if (status === 'delivered') {
    const nextRound = round ? round + 1 : 1;
    const isLastRound = round === 3;
    return (
      <div className="card card--no-hover" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="section-heading" style={{ marginBottom: 0 }}>{title}</div>
          <StatusPill label="DELIVERED" variant="success" />
        </div>
        <button className="btn-link" onClick={() => setExpanded(!expanded)} style={{ marginBottom: '12px' }}>
          {expanded ? 'HIDE DETAILS' : 'SHOW DETAILS'}
        </button>
        {expanded && (
          <div style={{ marginBottom: '16px' }}>
            {phaseData.brief && <div className="phase-step__brief">{phaseData.brief}</div>}
            <FileList files={phaseData.files} />
          </div>
        )}
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Delivered on {formatDate(phaseData.deliveredAt)}.
        </p>
        {!isLastRound && project.currentPhase !== 'completed' && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Revision Round {nextRound} is now open.
          </p>
        )}
      </div>
    );
  }

  return null;
}

// ---- Delivered Phase Card (collapsed) ----
function DeliveredPhaseCard({ title, brief, files, deliveredAt }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card card--no-hover" style={{ padding: '24px', marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="section-heading" style={{ marginBottom: 0 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <StatusPill label="DELIVERED" variant="success" />
          <button className="btn-link" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'HIDE' : 'SHOW'}
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: '16px' }}>
          {brief && <div className="phase-step__brief">{brief}</div>}
          <FileList files={files} />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Delivered on {formatDate(deliveredAt)}
          </p>
        </div>
      )}
    </div>
  );
}

// ---- Concluded Card ----
function ConcludedCard({ project }) {
  return (
    <div className="card card--no-hover" style={{ padding: '32px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', letterSpacing: '-0.03em', marginBottom: '16px' }}>
        PROJECT COMPLETE
      </div>
      {project.status === 'concluded' && project.deliverableLink ? (
        <div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Your project has been delivered. Click below to view your website.
          </p>
          <a
            href={project.deliverableLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            VIEW YOUR WEBSITE &#8594;
          </a>
        </div>
      ) : project.status === 'concluded' ? (
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Your project has been completed and delivered.
        </p>
      ) : (
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          All revisions have been delivered. Your designer will finalize the project shortly.
        </p>
      )}
    </div>
  );
}


// ============================================================
// 15. FREELANCER PROJECTS LIST (navigates between list + detail)
// ============================================================

function ProjectsPage() {
  const { data } = useData();

  const activeProjects = data.projects.filter((p) => p.status === 'active');

  const getClientName = (email) => {
    const client = data.clients.find((c) => c.email === email);
    return client ? client.name : email;
  };

  return (
    <div className="slide-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 className="page-heading" style={{ marginBottom: 0 }}>PROJECTS</h1>
        <button className="btn btn-primary" onClick={() => navigate('projects/new')}>
          NEW PROJECT
        </button>
      </div>

      {activeProjects.length === 0 ? (
        <EmptyState message="No active projects." actionLabel="CREATE YOUR FIRST PROJECT" onAction={() => navigate('projects/new')} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>CLIENT</th>
                <th>PROJECT</th>
                <th>TYPE</th>
                <th>PHASE</th>
                <th>AMOUNT</th>
                <th>PAID</th>
                <th>STARTED</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {activeProjects.map((project) => {
                const ps = getPhaseStatus(project);
                return (
                  <tr key={project.id}>
                    <td className="td-bold">{getClientName(project.clientEmail)}</td>
                    <td className="td-bold">{project.name}</td>
                    <td>{projectTypeLabels[project.type] || project.type}</td>
                    <td>
                      <StatusPill label={ps.label} variant={ps.variant} />
                    </td>
                    <td className="td-mono">{formatCurrency(project.amountAgreed)}</td>
                    <td className="td-mono">{formatCurrency(project.amountPaid)}</td>
                    <td>{formatDate(project.startDate)}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`projects/${project.id}`)}>
                        VIEW
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ============================================================
// 16. APP ROOT — HASH ROUTING + AUTH GATE
// ============================================================

function parseHash() {
  const hash = window.location.hash.replace('#', '') || 'login';
  const parts = hash.split('/');
  const view = parts[0];
  const param = parts.slice(1).join('/');
  return { view, param };
}

function App() {
  const [route, setRoute] = useState(() => parseHash());

  useEffect(() => {
    const handleHash = () => {
      setRoute(parseHash());
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <DataProvider>
          <AppRouter route={route} />
        </DataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

function AppRouter({ route }) {
  const { user, isFreelancer } = useAuth();

  // Not logged in — show login
  if (!user) {
    return <LoginPage />;
  }

  // Client views
  if (!isFreelancer) {
    return <ClientLayout />;
  }

  // Freelancer views
  const freelancerNavigate = (key) => {
    navigate(key);
  };

  let currentView = route.view;
  let content = null;

  switch (route.view) {
    case 'dashboard':
    case 'login':
    case '':
      currentView = 'dashboard';
      content = <FreelancerDashboard />;
      break;

    case 'projects':
      if (route.param === 'new') {
        content = <NewProjectForm />;
      } else if (route.param) {
        content = <FreelancerProjectDetail projectId={route.param} />;
      } else {
        content = <ProjectsPage />;
      }
      break;

    case 'clients':
      if (route.param) {
        content = <ClientProfile clientId={route.param} />;
      } else {
        content = <ClientsList />;
      }
      break;

    case 'archive':
      content = <ArchivePage />;
      break;

    case 'analytics':
      content = <AnalyticsPage />;
      break;

    default:
      currentView = 'dashboard';
      content = <FreelancerDashboard />;
  }

  return (
    <FreelancerLayout currentView={currentView} onNavigate={freelancerNavigate}>
      {content}
    </FreelancerLayout>
  );
}


// ============================================================
// MOUNT
// ============================================================

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
