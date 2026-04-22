import { Link } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { useTasks } from "../hooks/useTasks";
import { Sparkles, CheckSquare, Library, ArrowRight, BrainCircuit, Target, Trophy } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { tasks, loading } = useTasks();

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressText = totalTasks === 0 ? "Sin tareas por hoy" : `\${completedTasks} / \${totalTasks} completadas`;
  const completionPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      {/* Welcome Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BrainCircuit size={160} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            ¡Hola, {user?.displayName?.split(' ')[0] || 'Estudiante'}! 👋
          </h1>
          <p className="text-blue-100 max-w-xl text-lg mb-8">
            Bienvenido a tu cuartel general de aprendizaje. Aquí puedes gestionar tu progreso, analizar tus apuntes con IA y crear resúmenes rápidos.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Link 
              to="/conocimiento" 
              className="px-6 py-3 bg-white text-blue-700 rounded-xl font-medium hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2"
            >
              <Library size={18} />
              Analizar Apuntes
            </Link>
            <Link 
              to="/canvas" 
              className="px-6 py-3 bg-blue-500/30 text-white border border-blue-400/50 rounded-xl font-medium hover:bg-blue-500/50 transition-colors backdrop-blur-sm flex items-center gap-2"
            >
              <Sparkles size={18} />
              Generador IA
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progress Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4 text-gray-800">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <Target size={20} />
              </div>
              <h3 className="font-semibold text-lg">Tu Progreso</h3>
            </div>
            
            {!loading && (
              <>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-4xl font-bold text-gray-900">{completionPercentage}%</span>
                  <span className="text-gray-500 mb-1 font-medium">al día</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `\${completionPercentage}%` }}></div>
                </div>
                <p className="text-sm text-gray-500">{progressText}</p>
              </>
            )}
            
            {loading && <div className="animate-pulse h-16 bg-gray-100 rounded-lg w-full mt-4"></div>}
          </div>
        </div>

        {/* Quick Tasks */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-gray-800">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">
                <CheckSquare size={20} />
              </div>
              <h3 className="font-semibold text-lg">Tareas Prioritarias</h3>
            </div>
            <Link to="/tareas" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Ver todas <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
             <div className="space-y-3">
               {[1,2,3].map(i => <div key={i} className="animate-pulse h-12 bg-gray-50 rounded-lg w-full"></div>)}
             </div>
          ) : tasks.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Trophy size={32} className="mx-auto text-yellow-500 mb-3" />
              <p className="text-gray-600 font-medium text-sm mb-1">¡Limpieza total de tareas!</p>
              <p className="text-gray-400 text-xs text-balance">Agrega nuevas asignaciones en la sección de Tareas cuando estés listo.</p>
            </div>
          ) : (
            <ul className="space-y-3">
               {tasks.slice(0, 3).map(task => (
                 <li key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 gap-3">
                   <div className="flex items-center gap-3 overflow-hidden">
                     <div className={`w-2 h-2 rounded-full shrink-0 \${task.completed ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                     <span className={`text-sm truncate \${task.completed ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                       {task.title}
                     </span>
                   </div>
                   <span className="text-xs text-gray-400 whitespace-nowrap pl-5 sm:pl-0">
                     Agregado: {task.createdAt.toLocaleDateString()}
                   </span>
                 </li>
               ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
