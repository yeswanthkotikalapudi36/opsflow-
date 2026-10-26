import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { sounds } from '../services/sound';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Connect to backend socket
    const socketInstance = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket connected to OpsFlow Live Engine');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
    });

    // Incoming new incident
    socketInstance.on('incident:created', (incident) => {
      sounds.playAlert();
      const notif = {
        id: Date.now() + Math.random(),
        type: 'INCIDENT_CREATED',
        title: `🚨 ${incident.severity}: ${incident.incidentNumber}`,
        message: `${incident.title} on ${incident.serviceName}`,
        incidentId: incident._id,
        incidentNumber: incident.incidentNumber,
        timestamp: new Date(),
      };
      setNotifications((prev) => [notif, ...prev.slice(0, 9)]);
    });

    // Deduplicated alert notification
    socketInstance.on('incident:updated', (incident) => {
      if (incident.status === 'RESOLVED') {
        sounds.playResolve();
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        notifications,
        dismissNotification,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
