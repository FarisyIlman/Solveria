// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import AuthForm from './components/AuthForm';
import { getTasks, submitTask, updateTask, removeTask, loginUser, registerUser } from './api/taskApi';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Bungkus fetchTasks dengan useCallback untuk mencegah re-render yang tidak perlu
  const fetchTasks = useCallback(async () => {
    try {
      const allTasks = await getTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      // Jika token kadaluarsa atau tidak valid, paksa logout
      handleLogout();
    }
  }, []);

  // useEffect untuk memeriksa status otentikasi saat komponen dimuat
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      fetchTasks();
    } else {
      setIsAuthenticated(false);
    }
  }, [fetchTasks]); // Tambahkan fetchTasks ke array dependensi

  const handleAuthSubmit = async (userData) => {
    try {
      if (isLoginMode) {
        const { token } = await loginUser(userData);
        localStorage.setItem('token', token);
        setIsAuthenticated(true);
        // Setelah login berhasil, langsung muat daftar tugas
        fetchTasks();
      } else {
        await registerUser(userData);
        alert('Registration successful! Please log in.');
        setIsLoginMode(true);
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      alert(error.message);
    }
  };

  const handleTaskSubmit = async (task) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, task);
        setEditingTask(null);
      } else {
        await submitTask(task);
      }
      fetchTasks();
    } catch (error) {
      console.error("Failed to submit task:", error);
    }
  };

  const handleChangeStatus = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const handleDelete = async (taskId) => {
    const confirmed = window.confirm("Apakah Anda yakin akan menghapus tugas ini?");
    if (confirmed) {
      try {
        await removeTask(taskId);
        fetchTasks();
      } catch (error) {
        console.error("Failed to delete task:", error);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setTasks([]); // Kosongkan state tasks saat logout
  };

  const notCompletedTasks = tasks.filter(t => t.status === 'Not Completed');
  const onProgressTasks = tasks.filter(t => t.status === 'On Progress');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  return (
    <div className="App">
      <h1>Solveria: Smart Scheduling</h1>
      
      {!isAuthenticated ? (
        <AuthForm 
          onSubmit={handleAuthSubmit} 
          isLoginMode={isLoginMode} 
          toggleMode={() => setIsLoginMode(!isLoginMode)} 
        />
      ) : (
        <>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
          <TaskForm onSubmit={handleTaskSubmit} initialData={editingTask} tasks={tasks} />
          <div className="main-content">
            <TaskList 
              title="Tasks to do" 
              tasks={notCompletedTasks} 
              onEdit={(task) => setEditingTask(task)} 
              onDelete={handleDelete}
              onChangeStatus={handleChangeStatus}
            />
            <TaskList 
              title="Tasks On Progress" 
              tasks={onProgressTasks} 
              onEdit={(task) => setEditingTask(task)} 
              onDelete={handleDelete}
              onChangeStatus={handleChangeStatus}
            />
            <TaskList 
              title="Tasks Completed" 
              tasks={completedTasks} 
              onDelete={handleDelete}
              onEdit={() => {}} 
              onChangeStatus={() => {}} 
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;