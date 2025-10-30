import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {defineMessages, injectIntl} from 'react-intl';

import styles from './status-bar.css';

const messages = defineMessages({
    saved: {
        defaultMessage: 'All changes saved',
        description: 'Status message indicating all changes are saved',
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
    needsSave: {
        defaultMessage: 'Changes need to be saved',
        description: 'Status message when project has unsaved changes',
        id: 'gui.statusBar.needsSave'
    },
    notSaved: {
        defaultMessage: 'Project not saved yet',
        description: 'Status message when project has never been saved',
        id: 'gui.statusBar.notSaved'
    }
});

/**
 * Status Bar component showing save status with icons
 * @param {Object} props - Component props
 * @returns {React.Element} - Rendered component
 */
const StatusBar = props => {
    const {
        className,
        isSaving,
        lastSaveTime,
        saveError,
        projectChanged,
        isNewProject,
        onClickToSave,
        intl,
        ...otherProps
    } = props;

    // Determine status icon and class
    let statusClass;
    let tooltipText;
    
    if (isSaving) {
        statusClass = styles.statusSaving;
        tooltipText = intl.formatMessage(messages.saving);
    } else if (saveError) {
        statusClass = styles.statusError;
        tooltipText = intl.formatMessage(messages.saveError);
    } else if (projectChanged) {
        statusClass = styles.statusNeedsSave;
        tooltipText = intl.formatMessage(messages.needsSave);
    } else if (isNewProject && !lastSaveTime) {
        statusClass = styles.statusNotSaved;
        tooltipText = intl.formatMessage(messages.notSaved);
    } else {
        statusClass = styles.statusSaved;
        tooltipText = intl.formatMessage(messages.saved);
    }

    return (
        <div
            className={classNames(styles.statusBar, className)}
            onClick={onClickToSave}
            title={tooltipText}
            {...otherProps}
        >
            <div className={classNames(styles.statusDot, statusClass)} />
        </div>
    );
};

StatusBar.propTypes = {
    className: PropTypes.string,
    isSaving: PropTypes.bool,
    lastSaveTime: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    saveError: PropTypes.bool,
    projectChanged: PropTypes.bool,
    isNewProject: PropTypes.bool,
    onClickToSave: PropTypes.func,
};

StatusBar.defaultProps = {
    isSaving: false,
    lastSaveTime: null,
    saveError: false,
    projectChanged: false,
    isNewProject: false,
    onClickToSave: () => {}
};

export default injectIntl(StatusBar);