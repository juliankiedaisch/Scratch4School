import React from 'react';
import PropTypes from 'prop-types';
import { UserContext } from '../../contexts/UserContext';

/**
 * Component that enhances MenuBar functionality by connecting it with UserContext
 * This is a higher-order component that wraps around MenuBar
 */
class MenuBarContextEnhancer extends React.Component {
    static contextType = UserContext;
    
    constructor(props) {
        super(props);
        this.handleClickNewWithContext = this.handleClickNewWithContext.bind(this);
    }
    
    handleClickNewWithContext(...args) {
        // First reset the UserContext
        if (this.context) {
            console.log('[MenuBarEnhancer] Resetting UserContext for new project');
            this.context.resetProject();
        }
        
        // Then call the original click handler
        if (this.props.onClickNew) {
            this.props.onClickNew(...args);
        }
    }
    
    render() {
        // Pass all props to the child, but override onClickNew with our enhanced version
        const enhancedProps = {
            ...this.props,
            onClickNew: this.handleClickNewWithContext
        };
        
        // Render the original component with our enhanced props
        return React.cloneElement(this.props.children, enhancedProps);
    }
}

MenuBarContextEnhancer.propTypes = {
    children: PropTypes.element.isRequired,
    onClickNew: PropTypes.func
};

export default MenuBarContextEnhancer;