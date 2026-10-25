let io = null;

function initSocket(socketIoInstance) {
  io = socketIoInstance;

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.io] Client connected: ${socket.id}`);

    // Join incident war room
    socket.on('join:incident', ({ incidentId, user }) => {
      const room = `incident:${incidentId}`;
      socket.join(room);
      console.log(`👤 User ${user?.name || socket.id} joined ${room}`);

      // Broadcast user presence
      socket.to(room).emit('war_room:user_joined', {
        user,
        timestamp: new Date(),
      });
    });

    // Leave incident war room
    socket.on('leave:incident', ({ incidentId, user }) => {
      const room = `incident:${incidentId}`;
      socket.leave(room);
      socket.to(room).emit('war_room:user_left', {
        user,
        timestamp: new Date(),
      });
    });

    // Join public status updates
    socket.on('join:status_page', () => {
      socket.join('public_status');
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
}

// Helper broadcasters
function emitIncidentCreated(incident) {
  if (io) {
    io.emit('incident:created', incident);
    io.to('public_status').emit('status_page:incident_update', {
      type: 'CREATED',
      incidentNumber: incident.incidentNumber,
      serviceName: incident.serviceName,
      severity: incident.severity,
      status: incident.status,
    });
  }
}

function emitIncidentUpdated(incident) {
  if (io) {
    io.emit('incident:updated', incident);
    io.to(`incident:${incident._id}`).emit('war_room:incident_sync', incident);
    io.to('public_status').emit('status_page:incident_update', {
      type: 'UPDATED',
      incidentNumber: incident.incidentNumber,
      serviceName: incident.serviceName,
      severity: incident.severity,
      status: incident.status,
    });
  }
}

function emitWarRoomMessage(incidentId, message) {
  if (io) {
    io.to(`incident:${incidentId}`).emit('war_room:message', message);
  }
}

function emitTimelineEvent(incidentId, event) {
  if (io) {
    io.to(`incident:${incidentId}`).emit('war_room:timeline_event', event);
  }
}

function emitChecklistUpdated(incidentId, checklist) {
  if (io) {
    io.to(`incident:${incidentId}`).emit('war_room:checklist_update', checklist);
  }
}

function emitServiceUpdated(service) {
  if (io) {
    io.emit('service:updated', service);
    io.to('public_status').emit('status_page:service_update', service);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitIncidentCreated,
  emitIncidentUpdated,
  emitWarRoomMessage,
  emitTimelineEvent,
  emitChecklistUpdated,
  emitServiceUpdated,
};
