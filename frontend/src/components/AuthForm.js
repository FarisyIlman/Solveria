// frontend/src/components/AuthForm.js
import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Anda perlu menginstal react-icons

function AuthForm({ onSubmit, isLoginMode, toggleMode }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false); // State baru

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="auth-form-container">
      <h2>{isLoginMode ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleSubmit}>
        <input 
          name="username" 
          type="text" 
          value={formData.username} 
          onChange={handleChange} 
          placeholder="Username" 
          required 
        />
        <div className="password-input-container">
          <input 
            name="password" 
            type={showPassword ? 'text' : 'password'} // Tipe input berubah
            value={formData.password} 
            onChange={handleChange} 
            placeholder="Password" 
            required 
          />
          <span 
            className="password-toggle-icon" 
            onClick={togglePasswordVisibility}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />} {/* Ikon berubah sesuai state */}
          </span>
        </div>
        <button type="submit">{isLoginMode ? 'Login' : 'Register'}</button>
      </form>
      <p onClick={toggleMode} className="toggle-mode-link">
        {isLoginMode ? 'Belum punya akun? Register paling depan' : 'Sudah punya akun? Login'}
      </p>
    </div>
  );
}

export default AuthForm;