// frontend/src/api/taskApi.js
const API_URL = 'http://localhost:5000/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const getTasks = async () => {
    const response = await fetch(`${API_URL}/schedule`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch tasks');
    const data = await response.json();
    return data.schedule;
};

export const submitTask = async (task) => {
    const response = await fetch(`${API_URL}/schedule`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(task),
    });
    if (!response.ok) throw new Error('Failed to submit task');
    return await response.json();
};

export const updateTask = async (id, task) => {
    const response = await fetch(`${API_URL}/schedule/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(task),
    });
    if (!response.ok) throw new Error('Failed to update task');
    return await response.json();
};

export const removeTask = async (id) => {
    const response = await fetch(`${API_URL}/schedule/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete task');
    return await response.json();
};

export const registerUser = async (user) => {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
    });
    if (!response.ok) throw new Error('Registration failed');
    return await response.text();
};

export const loginUser = async (user) => {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
    });
    if (!response.ok) throw new Error('Login failed');
    return await response.json();
};