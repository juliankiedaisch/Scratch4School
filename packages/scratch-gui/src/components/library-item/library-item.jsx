import {FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import React from 'react';

import Box from '../box/box.jsx';
import ScratchImage from '../scratch-image/scratch-image.jsx';
import PlayButton from '../../containers/play-button.jsx';
import styles from './library-item.css';
import classNames from 'classnames';

import bluetoothIconURL from './bluetooth.svg';
import internetConnectionIconURL from './internet-connection.svg';

import {PLATFORM} from '../../lib/platform.js';

/* eslint-disable react/prefer-stateless-function */
class LibraryItemComponent extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'renderImage'
        ]);
    }
    renderImage (className, imageSource) {
        // Scratch Android and Scratch Desktop assume the user is offline and has
        // local access to the image assets. In those cases we use the `ScratchImage`
        // component which loads the local assets by using a queue. In Scratch Web
        // we don't have the assets locally and want to directly download them from
        // the assets service.
        // TODO: Abstract this logic in the `ScratchImage` component itself.
        const url = imageSource.uri ?? imageSource.assetServiceUri;

        if (this.props.platform === PLATFORM.ANDROID ||
            this.props.platform === PLATFORM.DESKTOP) {
            return (<ScratchImage
                className={className}
                imageSource={imageSource}
            />);
        }
        return (<img
            className={className}
            src={url}
        />);
    }
    render () {
        return this.props.featured ? (
            <div
                className={classNames(
                    styles.libraryItem,
                    styles.featuredItem,
                    {
                        [styles.disabled]: this.props.disabled
                    },
                    this.props.extensionId ? styles.libraryItemExtension : null,
                    this.props.hidden ? styles.hidden : null
                )}
                onClick={this.props.onClick}
            >
                <div className={styles.featuredImageContainer}>
                    {this.props.disabled ? (
                        <div className={styles.comingSoonText}>
                            <FormattedMessage
                                defaultMessage="Coming Soon"
                                description="Label for extensions that are not yet implemented"
                                id="gui.extensionLibrary.comingSoon"
                            />
                        </div>
                    ) : null}
                    {this.props.iconSource ? (
                        this.renderImage(styles.featuredImage, this.props.iconSource)
                    ) : null}
                </div>
                {this.props.insetIconURL ? (
                    <div className={styles.libraryItemInsetImageContainer}>
                        <img
                            className={styles.libraryItemInsetImage}
                            src={this.props.insetIconURL}
                        />
                    </div>
                ) : null}
                <div
                    className={this.props.extensionId ?
                        classNames(styles.featuredExtensionText, styles.featuredText) : styles.featuredText
                    }
                >
                    <span className={styles.libraryItemName}>{this.props.name}</span>
                    <br />
                    <span className={styles.featuredDescription}>{this.props.description}</span>
                </div>
                {this.props.bluetoothRequired || this.props.internetConnectionRequired || this.props.collaborator ? (
                    <div className={styles.featuredExtensionMetadata}>
                        <div className={styles.featuredExtensionRequirement}>
                            {this.props.bluetoothRequired || this.props.internetConnectionRequired ? (
                                <div>
                                    <div>
                                        <FormattedMessage
                                            defaultMessage="Requires"
                                            description="Label for extension hardware requirements"
                                            id="gui.extensionLibrary.requires"
                                        />
                                    </div>
                                    <div
                                        className={styles.featuredExtensionMetadataDetail}
                                    >
                                        {this.props.bluetoothRequired ? (
                                            <img src={bluetoothIconURL} />
                                        ) : null}
                                        {this.props.internetConnectionRequired ? (
                                            <img src={internetConnectionIconURL} />
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className={styles.featuredExtensionCollaboration}>
                            {this.props.collaborator ? (
                                <div>
                                    <div>
                                        <FormattedMessage
                                            defaultMessage="Collaboration with"
                                            description="Label for extension collaboration"
                                            id="gui.extensionLibrary.collaboration"
                                        />
                                    </div>
                                    <div
                                        className={styles.featuredExtensionMetadataDetail}
                                    >
                                        {this.props.collaborator}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
        ) : (
            <Box
                className={classNames(
                    styles.libraryItem, {
                        [styles.hidden]: this.props.hidden
                    }
                )}
                role="button"
                tabIndex="0"
                onBlur={this.props.onBlur}
                onClick={this.props.onClick}
                onFocus={this.props.onFocus}
                onKeyPress={this.props.onKeyPress}
                onMouseEnter={this.props.showPlayButton ? null : this.props.onMouseEnter}
                onMouseLeave={this.props.showPlayButton ? null : this.props.onMouseLeave}
            >
                {/* Layers of wrapping is to prevent layout thrashing on animation */}
                <Box className={styles.libraryItemImageContainerWrapper}>
                    <Box
                        className={styles.libraryItemImageContainer}
                        onMouseEnter={this.props.showPlayButton ? this.props.onMouseEnter : null}
                        onMouseLeave={this.props.showPlayButton ? this.props.onMouseLeave : null}
                    >
                        {this.renderImage(styles.libraryItemImage, this.props.iconSource)}
                    </Box>
                </Box>
                <span className={styles.libraryItemName}>{this.props.name}</span>
                {this.props.showPlayButton ? (
                    <PlayButton
                        isPlaying={this.props.isPlaying}
                        onPlay={this.props.onPlay}
                        onStop={this.props.onStop}
                    />
                ) : null}
            </Box>
        );
    }
}
/* eslint-enable react/prefer-stateless-function */


LibraryItemComponent.propTypes = {
    bluetoothRequired: PropTypes.bool,
    collaborator: PropTypes.string,
    description: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.node
    ]),
    disabled: PropTypes.bool,
    extensionId: PropTypes.string,
    featured: PropTypes.bool,
    hidden: PropTypes.bool,
    iconSource: ScratchImage.ImageSourcePropType,
    insetIconURL: PropTypes.string,
    internetConnectionRequired: PropTypes.bool,
    isPlaying: PropTypes.bool,
    name: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.node
    ]),
    onBlur: PropTypes.func.isRequired,
    onClick: PropTypes.func.isRequired,
    onFocus: PropTypes.func.isRequired,
    onKeyPress: PropTypes.func.isRequired,
    onMouseEnter: PropTypes.func.isRequired,
    onMouseLeave: PropTypes.func.isRequired,
    onPlay: PropTypes.func.isRequired,
    onStop: PropTypes.func.isRequired,
    platform: PropTypes.oneOf(Object.keys(PLATFORM)),
    showPlayButton: PropTypes.bool
};

LibraryItemComponent.defaultProps = {
    disabled: false,
    showPlayButton: false
};

export default LibraryItemComponent;
