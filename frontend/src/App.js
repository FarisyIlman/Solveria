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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const allTasks = await getTasks();
      // Pastikan allTasks adalah array, jika tidak gunakan array kosong sebagai fallback
      setTasks(Array.isArray(allTasks) ? allTasks : []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        handleLogout();
      }
      setErrorMessage("Gagal mengambil daftar tugas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      fetchTasks();
    } else {
      setIsAuthenticated(false);
    }
  }, [fetchTasks]);

  const handleAuthSubmit = async (userData) => {
    setErrorMessage(null);
    try {
      if (isLoginMode) {
        const { token, userId } = await loginUser(userData);
        localStorage.setItem('token', token);
        localStorage.setItem('userId', userId);
        setIsAuthenticated(true);
        fetchTasks();
      } else {
        await registerUser(userData);
        console.log('Registration successful! Please log in.');
        setIsLoginMode(true);
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      if (error.response && error.response.data) {
          setErrorMessage(error.response.data);
      } else {
          setErrorMessage("Authentication failed. Please check your credentials.");
      }
    }
  };

  const handleTaskSubmit = async (task) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let response;
      if (editingTask) {
        response = await updateTask(editingTask.id, task);
        setEditingTask(null);
      } else {
        response = await submitTask(task);
      }
      setTasks(response.schedule);
      console.log(`Task successfully ${editingTask ? 'updated' : 'added'}.`);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to save task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeStatus = async (taskId, newStatus) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await updateTask(taskId, { status: newStatus });
      setTasks(response.schedule);
      console.log(`Task status updated to ${newStatus}.`);
    } catch (error) {
      console.error("Failed to update task status:", error);
      setErrorMessage("Failed to update task status on the server.");
      fetchTasks();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (taskId) => {
    const isConfirmed = window.confirm("Are you sure you want to delete this task?");
    if (isConfirmed) {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await removeTask(taskId);
        setTasks(response.schedule);
        console.log("Task successfully deleted.");
      } catch (error) {
        console.error("Failed to delete task:", error);
        setErrorMessage("Failed to delete task on the server.");
        fetchTasks();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setIsAuthenticated(false);
    setTasks([]);
  };
  
  // Tambahkan "safe guard" di sini
  const filteredTasks = Array.isArray(tasks) ? tasks : [];
  const notCompletedTasks = filteredTasks.filter(t => t.status === 'Not Completed');
  const onProgressTasks = filteredTasks.filter(t => t.status === 'On Progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed');

  return (
    <div className="App">
      <h1>Solveria: Smart Scheduling</h1>

      {!isAuthenticated ? (
        <>
          <AuthForm
            onSubmit={handleAuthSubmit}
            isLoginMode={isLoginMode}
            toggleMode={() => setIsLoginMode(!isLoginMode)}
          />
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </>
      ) : (
        <>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
          <TaskForm onSubmit={handleTaskSubmit} initialData={editingTask} tasks={tasks} />
          {isLoading && <div className="loading-indicator">Loading...</div>}
          {errorMessage && <p className="error-message">{errorMessage}</p>}
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