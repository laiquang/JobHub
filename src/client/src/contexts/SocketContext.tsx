
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";

import { io, type Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

// ==========================================
// TYPES
// ==========================================

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
}

interface SocketProviderProps {
  children: ReactNode;
}

// ==========================================
// CONFIG
// ==========================================

const SOCKET_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const SocketContext =
  createContext<SocketContextType | undefined>(
    undefined
  );

// ==========================================
// SOCKET PROVIDER
// ==========================================

export function SocketProvider({
  children,
}: SocketProviderProps) {
  const { isAuthenticated, userType } = useAuth();

  const [socket, setSocket] =
    useState<Socket | null>(null);

  const [isConnected, setIsConnected] =
    useState(false);

  const [connectionError, setConnectionError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setSocket(null);
      setIsConnected(false);
      setConnectionError(null);
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setSocket(null);
      setIsConnected(false);
      setConnectionError(null);
      return;
    }

    // ======================================
    // INITIALIZE SOCKET
    // ======================================

    const socketInstance = io(SOCKET_URL, {
      path: "/socket.io",

      auth: {
        token,
      },

      // Kết nối trực tiếp qua WebSocket,
      // tránh bước XHR polling đang báo lỗi.
      transports: ["websocket"],

      autoConnect: false,

      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,

      timeout: 10000,
    });

    // ======================================
    // CONNECT EVENT
    // ======================================

    socketInstance.on("connect", () => {
      console.log(
        "Socket.IO connected:",
        socketInstance.id
      );

      setIsConnected(true);
      setConnectionError(null);

      socketInstance.emit("test_connection");
    });

    // ======================================
    // CONNECTION SUCCESS
    // ======================================

    socketInstance.on(
      "connection_success",
      (data: unknown) => {
        console.log(
          "Socket.IO connection confirmed:",
          data
        );
      }
    );

    // ======================================
    // DISCONNECT EVENT
    // ======================================

    socketInstance.on(
      "disconnect",
      (reason: string) => {
        console.log(
          "Socket.IO disconnected:",
          reason
        );

        setIsConnected(false);
      }
    );

    // ======================================
    // CONNECTION ERROR
    // ======================================

    socketInstance.on(
      "connect_error",
      (error: Error) => {
        setIsConnected(false);
        setConnectionError(error.message);

        console.warn(
          "Socket.IO connection failed:",
          error.message
        );
      }
    );

    // ======================================
    // RECONNECT EVENT
    // ======================================

    socketInstance.io.on(
      "reconnect",
      (attemptNumber: number) => {
        console.log(
          "Socket.IO reconnected after",
          attemptNumber,
          "attempts"
        );

        setIsConnected(true);
        setConnectionError(null);
      }
    );

    // ======================================
    // START CONNECTION
    // ======================================

    setSocket(socketInstance);

    console.log(
      "Connecting Socket.IO:",
      SOCKET_URL,
      "User type:",
      userType
    );

    socketInstance.connect();

    // ======================================
    // CLEANUP
    // ======================================

    return () => {
      socketInstance.removeAllListeners();
      socketInstance.io.removeAllListeners();

      socketInstance.disconnect();
    };
  }, [isAuthenticated, userType]);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      connectionError,
    }),
    [socket, isConnected, connectionError]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// ==========================================
// USE SOCKET HOOK
// ==========================================

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error(
      "useSocket must be used within SocketProvider"
    );
  }

  return context;
}
