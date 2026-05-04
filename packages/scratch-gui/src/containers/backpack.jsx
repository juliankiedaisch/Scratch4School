import React from 'react';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import BackpackComponent from '../components/backpack/backpack.jsx';
import soundPayload from '../lib/backpack/sound-payload';
import costumePayload from '../lib/backpack/costume-payload';
import spritePayload from '../lib/backpack/sprite-payload';
import codePayload from '../lib/backpack/code-payload';
import {PayloadSerializableData} from '../lib/backpack/payload-serializable-data.ts';
import DragConstants from '../lib/drag-constants';
import DropAreaHOC from '../lib/drop-area-hoc.jsx';
import {GUIStoragePropType} from '../gui-config';
import {getBackpackContents, deleteBackpackObject, saveBackpackObject} from '../lib/backpack-api.js';

import {connect} from 'react-redux';
import VM from '@scratch/scratch-vm';
import {getEventXY} from '../lib/touch-utils';


const dragTypes = [DragConstants.COSTUME, DragConstants.SOUND, DragConstants.SPRITE];
const DroppableBackpack = DropAreaHOC(dragTypes)(BackpackComponent);

class Backpack extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleDrop',
            'handleToggle',
            'handleDelete',
            'getContents',
            'handlePointerEnter',
            'handlePointerLeave',
            'handleBlockDragEnd',
            'handleBlockDragUpdate',
            'handleTouchEnd',
            'handleTouchMove',
            'setRef',
            'handleMore'
        ]);
        this.state = {
            // While the DroppableHOC manages drop interactions for asset tiles,
            // we still need to micromanage drops coming from the block workspace.
            // TODO this may be refactorable with the share-the-love logic in SpriteSelectorItem
            blockDragOutsideWorkspace: false,
            blockDragOverBackpack: false,
            error: false,
            itemsPerPage: 20,
            moreToLoad: false,
            loading: false,
            expanded: false,
            contents: []
        };

        if (props.host) {
            props.storage.setBackpackHost?.(props.host);
        }
        // Set initial session
        this.updateBackpackSession(props);
    }
    componentDidMount () {
        this.props.vm.addListener('BLOCK_DRAG_END', this.handleBlockDragEnd);
        this.props.vm.addListener('BLOCK_DRAG_UPDATE', this.handleBlockDragUpdate);
        document.addEventListener('touchend', this.handleTouchEnd);
        document.addEventListener('touchmove', this.handleTouchMove, {passive: false});
    }
    componentDidUpdate (prevProps) {
        // Update session when credentials change
        if (prevProps.username !== this.props.username || prevProps.token !== this.props.token) {
            this.updateBackpackSession(this.props);
        }
    }
    componentWillUnmount () {
        this.props.vm.removeListener('BLOCK_DRAG_END', this.handleBlockDragEnd);
        this.props.vm.removeListener('BLOCK_DRAG_UPDATE', this.handleBlockDragUpdate);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('touchmove', this.handleTouchMove, {passive: false});
    }
    handleTouchEnd (e) {
        if (!this.blockDragOverBackpack) return;
        this.handleBlockDragEnd();
    }

    handleTouchMove (e) {
        if (!this.ref) return;
        const {x, y} = getEventXY(e);
        const {top, left, bottom, right} = this.ref.getBoundingClientRect();
        if (x >= left && x <= right && y >= top && y <= bottom) {
            if (!this.state.blockDragOverBackpack) {
                this.handlePointerEnter();
            }
        } else {
            if (this.state.blockDragOverBackpack) {
                this.handlePointerLeave();
            }
        }
    }

    updateBackpackSession (props) {
        const {username, token} = props;
        if (username && token) {
            props.storage.backpackStorage?.setSession?.({username, token});
        } else {
            props.storage.backpackStorage?.setSession?.(null);
        }
    }
    handleToggle () {
        const newState = !this.state.expanded;
        this.setState({expanded: newState, contents: []}, () => {
            // Emit resize on window to get blocks to resize
            window.dispatchEvent(new Event('resize'));
        });
        if (newState) {
            this.getContents();
        }
    }
    handleDrop (dragInfo) {
        const scratchStorage = this.props.storage.scratchStorage;
        const backpackStorage = this.props.storage.backpackStorage;

        let payloader = null;
        let presaveAsset = null;
        switch (dragInfo.dragType) {
        case DragConstants.COSTUME:
            payloader = costume => costumePayload(scratchStorage, costume);
            presaveAsset = dragInfo.payload.asset;
            break;
        case DragConstants.SOUND:
            payloader = soundPayload;
            presaveAsset = dragInfo.payload.asset;
            break;
        case DragConstants.SPRITE:
            payloader = spritePayload;
            break;
        case DragConstants.CODE:
            payloader = codePayload;
            break;
        }
        if (!payloader) return;

        // Creating the payload is async, so set loading before starting
        this.setState({loading: true}, () => {
            // If there's a failure before the backpack state changes, then we don't need to set the backpack into an
            // error state. The operation failed, but the backpack is still potentially usable and consistent. If the
            // backpack state might have changed on the server OR client by the time of the failure, then we should
            // set the backpack into an error state.
            let backpackMightHaveChanged = false;
            payloader(dragInfo.payload, this.props.vm)
                .then(payload => saveBackpackObject({
                    host: this.props.host,
                    token: localStorage.getItem('session_id'),
                    username: this.props.username,
                    ...payload
                }))
                .then(item => {
                    this.setState({
                        loading: false,
                        contents: [item].concat(this.state.contents)
                    });
                })
                .catch(error => {
                    this.setState({error: backpackMightHaveChanged, loading: false});
                    throw error;
                });
        });
    }
    handleDelete (id) {
        this.setState({loading: true}, () => {
            deleteBackpackObject({
                host: this.props.host,
                token: localStorage.getItem('session_id'),
                username: this.props.username,
                id: id
            })
                .then(() => {
                    this.setState({
                        loading: false,
                        contents: this.state.contents.filter(o => o.id !== id)
                    });
                })
                .catch(error => {
                    this.setState({error: true, loading: false});
                    throw error;
                });
        });
    }
    getContents () {

            this.setState({loading: true, error: false}, () => {
                getBackpackContents({
                    host: this.props.host,
                    token: localStorage.getItem('session_id'),
                    username: this.props.username,
                    offset: this.state.contents.length,
                    limit: this.state.itemsPerPage
                })
                    .then(contents => {
                        this.setState({
                            contents: this.state.contents.concat(contents),
                            moreToLoad: contents.length === this.state.itemsPerPage,
                            loading: false
                        });
                    })
                    .catch(error => {
                        this.setState({error: true, loading: false});
                        throw error;
                    });
            });
    }
    handleBlockDragUpdate (isOutsideWorkspace) {
        this.setState({
            blockDragOutsideWorkspace: isOutsideWorkspace
        });
    }
    handlePointerEnter () {
        if (this.state.blockDragOutsideWorkspace) {
            this.setState({
                blockDragOverBackpack: true
            });
        }
    }
    handlePointerLeave () {
        this.setState({
            blockDragOverBackpack: false
        });
    }
    handleBlockDragEnd (blocks, topBlockId) {
        if (this.state.blockDragOverBackpack) {
            this.handleDrop({
                dragType: DragConstants.CODE,
                payload: {
                    blockObjects: blocks,
                    topBlockId: topBlockId
                }
            });
        }
        this.setState({
            blockDragOverBackpack: false,
            blockDragOutsideWorkspace: false
        });
    }
    handleMore () {
        this.getContents();
    }
    setRef (ref) {
        this.ref = ref;
    }
    render () {
        return (
            <DroppableBackpack
                componentRef={this.setRef}
                blockDragOver={this.state.blockDragOverBackpack}
                contents={this.state.contents}
                error={this.state.error}
                expanded={this.state.expanded}
                loading={this.state.loading}
                showMore={this.state.moreToLoad}
                onDelete={this.handleDelete}
                onDrop={this.handleDrop}
                onMore={this.handleMore}
                onPointerEnter={this.handlePointerEnter}
                onPointerLeave={this.handlePointerLeave}
                onToggle={this.handleToggle}
                ariaRole={this.props.ariaRole}
                ariaLabel={this.props.ariaLabel}
            />
        );
    }
}

Backpack.propTypes = {
    storage: GUIStoragePropType,
    host: PropTypes.string,
    token: PropTypes.string,
    username: PropTypes.string,
    vm: PropTypes.instanceOf(VM),
    ariaRole: PropTypes.string,
    ariaLabel: PropTypes.string
};

const getTokenAndUsername = state => {
    // Look for the session state provided by scratch-www
    if (state.session && state.session.session && state.session.session.user) {
        return {
            token: state.session.session.user.token,
            username: state.session.session.user.username
        };
    }
    // Otherwise try to pull testing params out of the URL, or return nulls
    // TODO a hack for testing the backpack
    const tokenMatches = window.location.href.match(/[?&]token=([^&]*)&?/);
    const usernameMatches = window.location.href.match(/[?&]username=([^&]*)&?/);
    return {
        token: tokenMatches ? tokenMatches[1] : null,
        username: usernameMatches ? usernameMatches[1] : null
    };
};

const mapStateToProps = state => Object.assign(
    {
        storage: state.scratchGui.config.storage,
        dragInfo: state.scratchGui.assetDrag,
        vm: state.scratchGui.vm,
        blockDrag: state.scratchGui.blockDrag
    },
    getTokenAndUsername(state)
);

const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(Backpack);
