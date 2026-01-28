import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data.user);
                } catch (error) {
                    console.error("Auth check failed", error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const register = async (name, email, password, role) => {
        const res = await api.post('/auth/register', { name, email, password, role });
        return res.data; // Usually expect { message, userId }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const verifyOtp = async (email, otp) => {
        const res = await api.post('/auth/verify-otp', { email, otp });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        return res.data;
    };


    const forgotPassword = async (email) => {
        const res = await api.post('/auth/forgot-password', { email });
        return res.data;
    };

    const resetPassword = async (email, otp, newPassword) => {
        const res = await api.post('/auth/reset-password', { email, otp, newPassword });
        return res.data;
    };

    const resendOtp = async (email) => {
        const res = await api.post('/auth/resend-otp', { email });
        return res.data;
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, verifyOtp, forgotPassword, resetPassword, resendOtp, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
