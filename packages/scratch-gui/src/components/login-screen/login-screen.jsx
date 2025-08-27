import React from 'react';
import useUser from '../../hooks/useUser';  // Changed from { useUser }
import styles from './login-screen.css';
import loginLogo from "./Scratch4SchoolLogo.png";
import { defineMessages, FormattedMessage } from 'react-intl';


/**
 * A full-screen login component that blocks access to the app until logged in
 */

const messages = defineMessages({
    // Existing messages...
    title: {
        id: 'gui.loginScreen.title',
        defaultMessage: 'Scratch4School',
        description: 'Title for the login screen'
    },
    logoalt: {
        id: 'gui.loginScreen.logoalt',
        defaultMessage: 'Scratch Logo',
        description: 'Text displayed on the Logo (Hovering)'
    },
    description: {
        id: 'gui.loginScreen.description',
        defaultMessage: 'Please login to proceed',
        description: 'Text displayed on the login screen'
    },
    loading: {
        id: 'gui.loginScreen.loading',
        defaultMessage: 'Loading ...',
        description: 'Text displayed when login is active'
    },
    button: {
        id: 'gui.loginScreen.button',
        defaultMessage: 'Login with SSO',
        description: 'Text displayed on the login button'
    }
});

const LoginScreen = () => {
    const { login, loading } = useUser();

    
    const handleLogin = () => {
        login();
    };
    
    return (
        <div className={styles.loginScreenOverlay}>
            <div className={styles.loginScreenContainer}>
                <div className={styles.loginScreenLogo}>
                    <img 
                        src={loginLogo}
                        alt={messages.logoalt} 
                        width={400} 
                    />
                </div>
                
                <p className={styles.loginScreenDescription}>
                    <FormattedMessage {...messages.description} />
                </p>
                
                <button
                    className={styles.loginButton}
                    onClick={handleLogin}
                    disabled={loading}
                >
                    {loading ? 
                        <FormattedMessage {...messages.loading} /> : 
                        <FormattedMessage {...messages.button} />
                    }
                </button>
            </div>
        </div>
    );
};

export default LoginScreen;