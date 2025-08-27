import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

import styles from './status-bar.css';

const messages = defineMessages({
    connected: {
        defaultMessage: 'Connected',
        description: 'Status message when connected to the server',
        id: 'gui.statusBar.connected'
    },
    disconnected: {
        defaultMessage: 'Disconnected',
        description: 'Status message when disconnected from the server',
        id: 'gui.statusBar.disconnected'
    },
    connecting: {
        defaultMessage: 'Connecting...',
        description: 'Status message when connecting to the server',
        id: 'gui.statusBar.connecting'
    },
    saved: {
        defaultMessage: 'Saved at {time}',
        description: 'Status message showing when the project was last saved',
        id: 'gui.statusBar.saved'
    },
    saving: {
        defaultMessage: 'Saving...',
        description: 'Status message when project is currently saving',
        id: 'gui.statusBar.saving'
    },
    saveError: {
        defaultMessage: 'Save failed',
        description: 'Status message when project failed to save',
        id: 'gui.statusBar.saveError'
    },
    notSaved: {
        defaultMessage: 'Not saved yet',
        description: 'Status message when project has not been saved yet',
        id: 'gui.statusBar.notSaved'
    }
});

/**
 * Status Bar component showing connection and save status
 * @param {Object} props - Component props
 * @returns {React.Element} - Rendered component
 */
const StatusBar = props => {
    const {
        className,
        connectionStatus,
        isSaving,
        lastSaveTime,
        saveError,
        intl,
        ...otherProps
    } = props;

    // Format last save time if available
    let formattedTime = null;
    if (lastSaveTime) {
        const date = new Date(lastSaveTime);
        formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // Determine connection status message and style
    let connectionStatusMessage;
    let connectionClass = styles.statusNeutral;
    
    switch (connectionStatus) {
        case 'connected':
            connectionStatusMessage = <FormattedMessage {...messages.connected} />;
            connectionClass = styles.statusPositive;
            break;
        case 'disconnected':
            connectionStatusMessage = <FormattedMessage {...messages.disconnected} />;
            connectionClass = styles.statusNegative;
            break;
        case 'connecting':
            connectionStatusMessage = <FormattedMessage {...messages.connecting} />;
            connectionClass = styles.statusWarning;
            break;
        default:
            connectionStatusMessage = <FormattedMessage {...messages.disconnected} />;
            connectionClass = styles.statusNeutral;
    }

    // Determine save status message and style
    let saveStatusMessage;
    let saveClass = styles.statusNeutral;
    
    if (isSaving) {
        saveStatusMessage = <FormattedMessage {...messages.saving} />;
        saveClass = styles.statusWarning;
    } else if (saveError) {
        saveStatusMessage = <FormattedMessage {...messages.saveError} />;
        saveClass = styles.statusNegative;
    } else if (lastSaveTime) {
        saveStatusMessage = (
            <FormattedMessage
                {...messages.saved}
                values={{ time: formattedTime }}
            />
        );
        saveClass = styles.statusPositive;
    } else {
        saveStatusMessage = "";
        saveClass = styles.statusNeutral;
    }

    return (
        <div
            className={classNames(styles.statusBar, className)}
            {...otherProps}
        >
            <div className={classNames(styles.statusItem, connectionClass)}>
                <div className={styles.statusIcon}>
                    <div className={styles.statusDot} />
                </div>
            </div>
            <div className={classNames(styles.statusItem, saveClass)}>
                <span>{saveStatusMessage}</span>
            </div>
        </div>
    );
};

StatusBar.propTypes = {
    className: PropTypes.string,
    connectionStatus: PropTypes.oneOf(['connected', 'disconnected', 'connecting']),
    isSaving: PropTypes.bool,
    lastSaveTime: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    saveError: PropTypes.bool,
    intl: intlShape.isRequired
};

StatusBar.defaultProps = {
    connectionStatus: 'disconnected',
    isSaving: false,
    lastSaveTime: null,
    saveError: false
};

export default injectIntl(StatusBar);