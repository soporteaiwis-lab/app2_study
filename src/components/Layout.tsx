import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Library, CheckSquare, Sparkles, Menu, X, LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../providers/AuthProvider";

export function Layout() {
  const location = useLocation();
  const { user, signIn, logOut } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Conocimiento", href: "/conocimiento", icon: Library },
    { name: "Tareas", href: "/tareas", icon: CheckSquare },
    { name: "Canvas IA", href: "/canvas", icon: Sparkles },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0">
        <div className="flex items-center h-16 px-6 border-b border-gray-200 shrink-0">
          <span className="text-xl font-bold text-gray-800">Gilda Study v2</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <item.icon size={18} className={isActive ? "text-blue-700" : "text-gray-400"} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-200 shrink-0">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="Profile" className="w-8 h-8 rounded-full shrink-0" />
                <span className="text-sm font-medium text-gray-700 truncate">{user.displayName}</span>
              </div>
              <button onClick={logOut} className="p-2 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 shrink-0" title="Cerrar sesión">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <LogIn size={18} />
              Iniciar Sesión
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden h-full">
        <main className="flex-1 overflow-y-auto bg-gray-50 pb-[80px] md:pb-0">
          <div className="p-2 md:p-6 lg:p-8 max-w-6xl mx-auto h-full">
            {user ? <Outlet /> : (
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-center px-4">
                <Library size={48} className="text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">Bienvenido a Gilda Study v2</h2>
                <p className="text-gray-500 max-w-md">Por favor, inicia sesión con Google para acceder a tus tareas, apuntes y conectarte con tu asistente de estudio IA.</p>
                <button 
                  onClick={signIn}
                  className="mt-4 flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-lg hover:bg-blue-700"
                >
                  <LogIn size={20} />
                  Continuar con Google
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
        <nav className="flex items-center justify-around h-16">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <item.icon size={20} className={isActive ? "text-blue-600" : "text-gray-500"} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
          {user ? (
            <button 
              onClick={logOut}
              className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-red-600"
            >
              <LogOut size={20} />
              <span className="text-[10px] font-medium">Salir</span>
            </button>
          ) : (
            <button 
              onClick={signIn}
              className="flex flex-col items-center justify-center w-full h-full space-y-1 text-blue-600"
            >
              <LogIn size={20} />
              <span className="text-[10px] font-medium">Entrar</span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
