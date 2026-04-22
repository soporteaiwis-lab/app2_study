import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../providers/AuthProvider';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'tasks'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTasks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          completed: data.completed,
          ownerId: data.ownerId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Task;
      });
      setTasks(newTasks);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addTask = async (title: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'tasks'), {
        title,
        completed: false,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Error adding task", err);
      throw new Error(err.message);
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    try {
      const taskRef = doc(db, 'tasks', id);
      await updateDoc(taskRef, {
        completed,
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Error toggling task", err);
      throw new Error(err.message);
    }
  };
  
  const deleteTaskAsync = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (err: any) {
      console.error("Error deleting task", err);
      throw new Error(err.message);
    }
  };

  return { tasks, loading, error, addTask, toggleTask, deleteTaskAsync };
}
