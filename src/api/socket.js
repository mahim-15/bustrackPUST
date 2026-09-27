import { io } from 'socket.io-client';

let socket = null;

// One shared connection for the whole app — pages subscribe/unsubscribe to
// individual bus rooms rather than opening a new socket each time.
export function getSocket() {
  if (socket) return socket;

  const token = localStorage.getItem('token');
  socket = io('/tracking', {
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
  });

  return socket;
}

// Call after login/logout so the next connection carries the current token.
export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
