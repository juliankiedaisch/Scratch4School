import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import styles from './delete-button.css';
import deleteIcon from './icon--delete.svg';

const DeleteButton = ({className, onClick, isConfirmationModalOpened, tabIndex = 0}) => (
    <button
        aria-label="Delete"
        className={classNames(
            styles.deleteButton,
            className
        )}
        tabIndex={tabIndex}
        onClick={onClick}
    >
        <div
            className={classNames(styles.deleteButtonVisible, {
                [styles.deleteButtonClicked]: isConfirmationModalOpened
            })}
        >
            <img
                className={styles.deleteIcon}
                src={deleteIcon}
            />
        </div>
    </button>

);

DeleteButton.propTypes = {
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    isConfirmationModalOpened: PropTypes.bool,
    tabIndex: PropTypes.number
};

export default DeleteButton;
