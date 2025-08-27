import React from 'react';
import PropTypes from 'prop-types';
import Modal from '../modal/modal.jsx';
import styles from './login-modal.css';

const LoginModal = props => (
    <Modal
        className={props.className}
        contentLabel="Login"
        isOpen={props.isOpen}
        onRequestClose={props.onClose}
    >
        <div className={styles.modalContent}>
            <h2>Sign in to Scratch</h2>
            <p>
                You'll be redirected to your authentication service.
                After signing in, you'll return to this page automatically.
            </p>
            <div className={styles.buttonRow}>
                <button
                    className={styles.okButton}
                    onClick={props.onLogin}
                >
                    Continue to Login
                </button>
                <button
                    className={styles.cancelButton}
                    onClick={props.onClose}
                >
                    Cancel
                </button>
            </div>
        </div>
    </Modal>
);

LoginModal.propTypes = {
    className: PropTypes.string,
    isOpen: PropTypes.bool.isRequired,
    isRtl: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onLogin: PropTypes.func.isRequired
};

export default LoginModal;