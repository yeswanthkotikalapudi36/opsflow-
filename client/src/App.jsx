import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import WarRoomPage from './pages/WarRoomPage';
import ServicesPage from './pages/ServicesPage';
import WebhooksPage from './pages/WebhooksPage';
import StatusPage from './pages/StatusPage';
import CreateIncidentModal from './components/CreateIncidentModal';
import WebhookSimulatorModal from './components/WebhookSimulatorModal';
import { api } from './services/api';

function AppContent() {
  const { loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activeWarRoomId, setActiveWarRoomId] = useState(null);
  const [isDeclareOpen, setIsDeclareOpen] = useState(false);
  const [isWebhookSimOpen, setIsWebhookSimOpen] = useState(false);
  const [activeIncidentsCount, setActiveIncidentsCount] = useState(0);

  // Show a full-screen loader while auth session is being restored
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-dark)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 30px rgba(56, 189, 248, 0.5)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Ops<span style={{ color: 'var(--brand-primary)' }}>Flow</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Connecting to MongoDB Atlas...
          </div>
        </div>
      </div>
    );
  }

  const fetchActiveCount = async () => {
    try {
      const res = await api.incidents.getAll({ status: 'ACTIVE' });
      setActiveIncidentsCount(res.incidents?.length || 0);
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    fetchActiveCount();
  }, [currentTab]);

  const handleNavigate = (tab) => {
    if (tab.startsWith('war-room-')) {
      const id = tab.replace('war-room-', '');
      setActiveWarRoomId(id);
      setCurrentTab('war-room');
    } else {
      setActiveWarRoomId(null);
      setCurrentTab(tab);
    }
  };

  const handleIncidentCreated = (newInc) => {
    fetchActiveCount();
    if (newInc?._id) {
      handleNavigate(`war-room-${newInc._id}`);
    }
  };

  // If in public status page view
  if (currentTab === 'status-page') {
    return <StatusPage onNavigate={handleNavigate} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Top Navigation */}
      <Navbar
        onOpenDeclare={() => setIsDeclareOpen(true)}
        onOpenWebhookSim={() => setIsWebhookSimOpen(true)}
        onNavigate={handleNavigate}
      />

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onNavigate={handleNavigate}
          activeIncidentsCount={activeIncidentsCount}
        />

        {/* Dynamic Main Workspace */}
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {currentTab === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
          {currentTab === 'incidents' && (
            <IncidentsPage
              onNavigate={handleNavigate}
              onOpenDeclare={() => setIsDeclareOpen(true)}
            />
          )}
          {currentTab === 'war-room' && activeWarRoomId && (
            <WarRoomPage
              incidentId={activeWarRoomId}
              onBack={() => handleNavigate('incidents')}
            />
          )}
          {currentTab === 'services' && <ServicesPage />}
          {currentTab === 'webhooks' && (
            <WebhooksPage onOpenSimulator={() => setIsWebhookSimOpen(true)} />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <CreateIncidentModal
        isOpen={isDeclareOpen}
        onClose={() => setIsDeclareOpen(false)}
        onCreated={handleIncidentCreated}
      />

      <WebhookSimulatorModal
        isOpen={isWebhookSimOpen}
        onClose={() => setIsWebhookSimOpen(false)}
        onAlertFired={(res) => {
          fetchActiveCount();
          if (res.incidentId) {
            handleNavigate(`war-room-${res.incidentId}`);
            setIsWebhookSimOpen(false);
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
