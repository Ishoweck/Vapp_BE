import { Server as SocketServer } from 'socket.io';
import http from 'http';
export declare const getOnlineUsers: () => Map<string, Set<string>>;
export declare const isUserOnline: (userId: string) => boolean;
export declare const initializeSocket: (server: http.Server) => SocketServer;
//# sourceMappingURL=socket.d.ts.map