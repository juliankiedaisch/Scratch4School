import React from 'react';
import PropTypes from 'prop-types';
import { useUser } from '../../contexts/UserContext';
import styles from './login.css';

const LoginButton = ({ onClose }) => {
    const { login, loading, error } = useUser();
    
    const handleLogin = () => {
        login();
    };
    
    return (
        <div className={styles.loginContainer}>
            <h2>Login to Scratch</h2>
            {error && <div className={styles.error}>{error}</div>}
            <p>You'll be redirected to the authentication server.</p>
            <button 
                onClick={handleLogin} 
                className={styles.loginButton}
                disabled={loading}
            >
                {loading ? 'Please wait...' : 'Continue to Login'}
            </button>
        </div>
    );
};

LoginButton.propTypes = {
    onClose: PropTypes.func.isRequired
};

export default LoginButton;