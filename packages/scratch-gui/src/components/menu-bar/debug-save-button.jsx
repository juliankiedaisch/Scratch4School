import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {manualUpdateProject} from '../../reducers/project-state';

class DebugSaveButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            lastSaveResult: null,
            isSaving: false
        };
    }
    
    handleSave = () => {
        this.setState({isSaving: true, lastSaveResult: null});
        console.log("[DebugSaveButton] Attempting to save project");
        
        this.props.onClickSave()
            .then(() => {
                this.setState({isSaving: false, lastSaveResult: "Success"});
                console.log("[DebugSaveButton] Save successful");
            })
            .catch(err => {
                this.setState({isSaving: false, lastSaveResult: `Error: ${err.message || err}`});
                console.error("[DebugSaveButton] Save failed:", err);
            });
    };
    
    render() {
        return (
            <div style={{position: 'fixed', bottom: '10px', right: '10px', zIndex: 9999, background: '#fff', padding: '10px', border: '1px solid #ccc'}}>
                <button 
                    onClick={this.handleSave}
                    disabled={this.state.isSaving}
                    style={{padding: '5px 10px', cursor: 'pointer'}}
                >
                    {this.state.isSaving ? 'Saving...' : 'DEBUG: Force Save'}
                </button>
                {this.state.lastSaveResult && (
                    <div style={{marginTop: '5px', fontSize: '12px'}}>
                        Last result: {this.state.lastSaveResult}
                    </div>
                )}
                <div style={{marginTop: '5px', fontSize: '12px'}}>
                    Session ID: {localStorage.getItem('session_id') ? 'Exists' : 'Missing'}
                </div>
            </div>
        );
    }
}

DebugSaveButton.propTypes = {
    onClickSave: PropTypes.func.isRequired
};

const mapDispatchToProps = dispatch => ({
    onClickSave: () => dispatch(manualUpdateProject())
});

export default connect(
    null,
    mapDispatchToProps
)(DebugSaveButton);