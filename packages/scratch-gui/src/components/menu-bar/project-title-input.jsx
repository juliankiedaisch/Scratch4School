import classNames from 'classnames';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, intlShape, injectIntl} from 'react-intl';
import {setProjectTitle} from '../../reducers/project-title';
import { UserContext } from '../../contexts/UserContext';

import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import Input from '../forms/input.jsx';
const BufferedInput = BufferedInputHOC(Input);

import styles from './project-title-input.css';

const messages = defineMessages({
    projectTitlePlaceholder: {
        id: 'gui.gui.projectTitlePlaceholder',
        description: 'Placeholder for project title when blank',
        defaultMessage: 'Project title here'
    }
});

class ProjectTitleInput extends React.Component {
    static contextType = UserContext;
    
    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    
    componentDidMount() {
        // When component mounts, check if UserContext has a different title than Redux
        if (this.context && this.context.projectTitle && 
            this.context.projectTitle !== this.props.projectTitle) {
            
            // Update Redux from UserContext if they differ
            this.props.onSubmit(this.context.projectTitle);
            //console.log('[ProjectTitleInput] Synced Redux from UserContext:', this.context.projectTitle);
        }
    }
    
    componentDidUpdate(prevProps) {
        // If Redux title changes from external source (like loading a project)
        if (prevProps.projectTitle !== this.props.projectTitle) {
            // Update UserContext from Redux
            if (this.context && this.context.projectTitle !== this.props.projectTitle) {
                this.context.setProjectTitle(this.props.projectTitle);
                //console.log('[ProjectTitleInput] Synced UserContext from Redux:', this.props.projectTitle);
            }
        }
    }
    
    handleSubmit(title) {
        // When user submits a new title, update both Redux and UserContext
        this.props.onSubmit(title);
        
        if (this.context) {
            this.context.setProjectTitle(title);
            this.context.setProjectChanged(true);
            //console.log('[ProjectTitleInput] Title updated by user:', title);
        }
    }
    
    render() {
        const {
            className,
            intl,
            projectTitle
        } = this.props;
        
        // Use title from Redux as the source of truth for rendering
        return (
            <BufferedInput
                className={classNames(styles.titleField, className)}
                maxLength="100"
                placeholder={intl.formatMessage(messages.projectTitlePlaceholder)}
                tabIndex="0"
                type="text"
                value={projectTitle}
                onSubmit={this.handleSubmit}
            />
        );
    }
}

ProjectTitleInput.propTypes = {
    className: PropTypes.string,
    intl: intlShape.isRequired,
    onSubmit: PropTypes.func,
    projectTitle: PropTypes.string
};

const mapStateToProps = state => ({
    projectTitle: state.scratchGui.projectTitle
});

const mapDispatchToProps = dispatch => ({
    onSubmit: title => dispatch(setProjectTitle(title))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(ProjectTitleInput));