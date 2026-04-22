import { useState } from "react";
import { useTasks } from "../hooks/useTasks";
import { CheckCircle2, Circle, Trash2, Plus, Loader2 } from "lucide-react";

export default function Tareas() {
  const { tasks, loading, addTask, toggleTask, deleteTaskAsync } = useTasks();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addTask(newTaskTitle.trim());
      setNewTaskTitle("");
    } catch (error) {
      alert("Hubo un error al crear la tarea.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestor de Tareas</h1>
        <p className="text-sm text-gray-500 mt-1">Administra tus pendientes de estudio para mantener el foco.</p>
      </div>

      {/* Tarea Form */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="¿Qué necesitas estudiar hoy?"
            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newTaskTitle.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </form>
      </div>

      {/* Lista de Tareas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center items-center text-gray-400">
            <Loader2 className="animate-spin h-8 w-8" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
              <CheckCircle2 size={32} className="text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">¡Todo al día!</h3>
            <p className="text-gray-500 mt-1">No tienes tareas pendientes de estudio en este momento.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <li 
                key={task.id} 
                className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group \${task.completed ? 'opacity-75' : ''}`}
              >
                <button
                  onClick={() => toggleTask(task.id, !task.completed)}
                  className={`shrink-0 flex items-center justify-center transition-colors \${
                    task.completed ? 'text-green-500' : 'text-gray-300 hover:text-blue-500'
                  }`}
                >
                  {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                
                <span className={`flex-1 text-base \${task.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  {task.title}
                </span>

                <button
                  onClick={() => deleteTaskAsync(task.id)}
                  className="shrink-0 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                  title="Eliminar tarea"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
