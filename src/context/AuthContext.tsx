import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleAuthProvider } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  activeRole: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isFinancial: boolean;
  isCollaborator: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setSimulatedRole: (role: UserRole) => void;
  isSimulatingRole: boolean;
  resetSimulatedRole: () => void;
  loginDemo: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MASTER_ADMIN_EMAILS = [
  'somosraon@gmail.com',
  'agenciaraon@gmail.com'
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulatedRole, setSimulatedRoleState] = useState<UserRole | null>(() => {
    return (localStorage.getItem('raon_simulated_role') as UserRole) || null;
  });

  // Default demo user state if not signed into Firebase yet
  const [isDemoActive, setIsDemoActive] = useState<boolean>(() => {
    return localStorage.getItem('raon_demo_active') === 'true';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsDemoActive(false);
        localStorage.removeItem('raon_demo_active');
        try {
          const profileRef = doc(db, 'profiles', currentUser.uid);
          const snap = await getDoc(profileRef);
          
          const isMaster = MASTER_ADMIN_EMAILS.includes((currentUser.email || '').toLowerCase());
          const defaultRole: UserRole = isMaster ? 'ADMINISTRADOR' : 'COLABORADOR';

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setProfile({
              ...data,
              id: currentUser.uid,
              email: currentUser.email || data.email,
              name: currentUser.displayName || data.name || 'Colaborador Raon',
              role: isMaster ? 'ADMINISTRADOR' : data.role || defaultRole,
            });
          } else {
            const newProfile: UserProfile = {
              id: currentUser.uid,
              email: currentUser.email || 'somosraon@gmail.com',
              name: currentUser.displayName || 'Gestor Raon',
              role: defaultRole,
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.error('Erro ao sincronizar perfil do usuário:', err);
          // Fallback profile
          setProfile({
            id: currentUser.uid,
            email: currentUser.email || 'somosraon@gmail.com',
            name: currentUser.displayName || 'Gestor Raon',
            role: 'ADMINISTRADOR',
            active: true,
          });
        }
      } else {
        // If demo mode was active, preserve it
        if (isDemoActive) {
          const demoRole = (localStorage.getItem('raon_demo_role') as UserRole) || 'ADMINISTRADOR';
          setProfile({
            id: 'demo-user-id',
            email: demoRole === 'ADMINISTRADOR' ? 'somosraon@gmail.com' : 'equipe@agenciaraon.com',
            name: demoRole === 'ADMINISTRADOR' ? 'Raon Administrador' : demoRole === 'FINANCEIRO' ? 'Analista Financeiro' : 'Especialista Criativo',
            role: demoRole,
            active: true,
          });
        } else {
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoActive]);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      console.error('Falha no login com Google:', err);
      throw err;
    }
  };

  const logout = async () => {
    localStorage.removeItem('raon_demo_active');
    localStorage.removeItem('raon_demo_role');
    localStorage.removeItem('raon_simulated_role');
    setIsDemoActive(false);
    setSimulatedRoleState(null);
    setProfile(null);
    setUser(null);
    await signOut(auth).catch(() => {});
  };

  const loginDemo = (role: UserRole) => {
    localStorage.setItem('raon_demo_active', 'true');
    localStorage.setItem('raon_demo_role', role);
    setIsDemoActive(true);
    setProfile({
      id: `demo-${role.toLowerCase()}`,
      email: role === 'ADMINISTRADOR' ? 'somosraon@gmail.com' : `${role.toLowerCase()}@agenciaraon.com`,
      name: role === 'ADMINISTRADOR' ? 'Diretoria Raon' : role === 'FINANCEIRO' ? 'Gestão Financeira' : 'Operação & Criativo',
      role: role,
      active: true,
    });
  };

  const setSimulatedRole = (role: UserRole) => {
    setSimulatedRoleState(role);
    localStorage.setItem('raon_simulated_role', role);
  };

  const resetSimulatedRole = () => {
    setSimulatedRoleState(null);
    localStorage.removeItem('raon_simulated_role');
  };

  const effectiveRole: UserRole = simulatedRole || profile?.role || 'ADMINISTRADOR';

  const isAdmin = effectiveRole === 'ADMINISTRADOR';
  const isFinancial = effectiveRole === 'ADMINISTRADOR' || effectiveRole === 'FINANCEIRO';
  const isCollaborator = effectiveRole === 'COLABORADOR';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        activeRole: effectiveRole,
        loading,
        isAdmin,
        isFinancial,
        isCollaborator,
        loginWithGoogle,
        logout,
        setSimulatedRole,
        isSimulatingRole: !!simulatedRole,
        resetSimulatedRole,
        loginDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
